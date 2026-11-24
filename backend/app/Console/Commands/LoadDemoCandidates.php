<?php

namespace App\Console\Commands;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\ElectionDemoBatch;
use App\Models\Partylist;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\ConfigurationUrlParser;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use RuntimeException;
use Throwable;

class LoadDemoCandidates extends Command
{
    protected $signature = 'demo:load-candidates
        {--dry-run : Preview without writing any records}
        {--remote : Prompt privately for an external PostgreSQL demonstration database URL}
        {--force : Explicitly allow loading demonstration candidates outside local/testing}';

    protected $description = 'Load the reusable IM2 sample candidates into the registered 2026 demonstration draft';

    private const POSITIONS = ['President', 'Vice President', 'Senator', 'Secretary', 'Treasurer', 'Auditor', 'PIO'];

    public function handle(): int
    {
        if (! $this->option('dry-run') && ! $this->option('force')
            && ($this->option('remote') || ! app()->environment(['local', 'testing']))) {
            $this->error('Loading remote or production demonstration data requires --force.');

            return self::FAILURE;
        }

        $originalConnection = DB::getDefaultConnection();
        try {
            $fixture = $this->fixture();
            if ($this->option('remote')) {
                $this->connectRemote();
            }
            DB::transaction(function () use ($fixture): void {
                $query = Election::where('name', 'SSG Election 2026');
                if (! $this->option('dry-run')) {
                    $query->lockForUpdate();
                }
                $election = $query->sole();
                if ($election->status !== 'draft') {
                    throw new RuntimeException('Keep SSG Election 2026 in Draft before loading sample candidates.');
                }
                $batch = ElectionDemoBatch::where('election_id', $election->id)->first();
                $ballotIds = $batch?->ballot_ids ?? [];
                if (count($ballotIds) !== 40 || count(array_unique($ballotIds)) !== 40
                    || Ballot::where('election_id', $election->id)->whereIn('id', $ballotIds)->count() !== 40) {
                    throw new RuntimeException('This loader requires the registered 40-ballot demonstration batch.');
                }
                if (DB::table('votes')->where('election_id', $election->id)->exists()) {
                    throw new RuntimeException('Candidate votes already exist. This loader never clears or replaces votes.');
                }
                $positions = $election->positions()->get()->keyBy('name');
                if ($positions->count() !== 7 || array_diff(self::POSITIONS, $positions->keys()->all())) {
                    throw new RuntimeException('The seven default positions must exist before loading candidates.');
                }
                $ids = array_column($fixture['candidates'], 'id');
                if (Candidacy::where('election_id', $election->id)->whereNotIn('student_id', $ids)->exists()) {
                    throw new RuntimeException('Other candidates already exist in 2026. They were preserved; no samples were loaded.');
                }
                if (Candidacy::where('election_id', '!=', $election->id)->whereIn('student_id', $ids)->exists()
                    || DB::table('votes')->where('election_id', '!=', $election->id)->whereIn('candidate_student_id', $ids)->exists()) {
                    throw new RuntimeException('A sample candidate ID is used by another election. No records were changed.');
                }
                foreach ($fixture['candidates'] as $candidate) {
                    $existing = Candidacy::where('election_id', $election->id)->where('student_id', $candidate['id'])->first();
                    if ($existing && ($existing->position_id !== $positions[$candidate['position']]->id || $existing->team !== $candidate['team'])) {
                        throw new RuntimeException('An existing sample has a different position or partylist. It was preserved.');
                    }
                }
                $this->table(['Position', 'Sample candidates'], array_map(fn ($name) => [$name, $name === 'Senator' ? 24 : 2], self::POSITIONS));
                if ($this->option('dry-run')) {
                    $this->info('Preview only: 36 sample candidates. No records were written.');

                    return;
                }
                foreach ($fixture['partylists'] as $team => $partylist) {
                    Partylist::firstOrCreate(['election_id' => $election->id, 'team' => $team], $partylist);
                }
                foreach ($fixture['candidates'] as $candidate) {
                    CandidateProfile::firstOrCreate(['student_id' => $candidate['id']], [
                        'full_name' => $candidate['full_name'], 'achievements' => $candidate['achievements'],
                        'profile_photo' => null, 'profile' => null, 'motto' => null,
                    ]);
                    Candidacy::firstOrCreate(['election_id' => $election->id, 'student_id' => $candidate['id']], [
                        'position_id' => $positions[$candidate['position']]->id, 'team' => $candidate['team'],
                    ]);
                }
                $this->info('36 sample candidates are ready. Existing edits and partylists were preserved.');
                $this->info('The election remains Draft. No accounts, passwords, ballots, votes, attendance, schedules or selection limits were changed.');
            });
        } catch (Throwable $error) {
            $this->error($error instanceof QueryException
                ? 'Database connection or query failed. Check the database URL, access and migrations; no successful load was confirmed.'
                : $error->getMessage());

            return self::FAILURE;
        } finally {
            DB::setDefaultConnection($originalConnection);
            if ($this->option('remote')) {
                DB::purge('im2_demo_remote');
                config(['database.connections.im2_demo_remote' => null]);
            }
        }

        return self::SUCCESS;
    }

    private function fixture(): array
    {
        $fixture = json_decode(file_get_contents(database_path('fixtures/im2-candidates.json')), true, 512, JSON_THROW_ON_ERROR);
        $fixture = Validator::make($fixture, [
            'version' => ['required', Rule::in([1])],
            'election' => ['required', Rule::in(['SSG Election 2026'])],
            'partylists' => ['required', 'array:TEAM_A,TEAM_B', 'size:2'],
            'partylists.*' => ['required', 'array:name,platform'],
            'partylists.*.name' => ['required', 'string', 'max:255'],
            'partylists.*.platform' => ['required', 'string', 'max:5000'],
            'candidates' => ['required', 'array', 'size:36'],
            'candidates.*' => ['required', 'array:id,position,team,full_name,achievements'],
            'candidates.*.id' => ['required', 'string', 'max:50', 'distinct', 'starts_with:IM2-DEMO-'],
            'candidates.*.position' => ['required', Rule::in(self::POSITIONS)],
            'candidates.*.team' => ['required', Rule::in(['TEAM_A', 'TEAM_B'])],
            'candidates.*.full_name' => ['required', 'string', 'max:255'],
            'candidates.*.achievements' => ['required', 'string', 'max:5000'],
        ])->validate();
        foreach (self::POSITIONS as $position) {
            foreach (['TEAM_A', 'TEAM_B'] as $team) {
                $count = count(array_filter($fixture['candidates'], fn ($candidate) => $candidate['position'] === $position && $candidate['team'] === $team));
                if ($count !== ($position === 'Senator' ? 12 : 1)) {
                    throw new RuntimeException('Samples must include one candidate per partylist in each office, and 12 Senators per partylist.');
                }
            }
        }

        return $fixture;
    }

    private function connectRemote(): void
    {
        $url = $this->secret('External PostgreSQL database URL', false);
        $parts = $url ? parse_url($url) : false;
        if (! $parts || ! in_array($parts['scheme'] ?? '', ['postgres', 'postgresql', 'pgsql'], true)
            || empty($parts['user']) || empty($parts['pass']) || empty($parts['host']) || empty(trim($parts['path'] ?? '', '/'))
            || ($parts['port'] ?? 5432) !== 5432 || in_array(strtolower($parts['host']), ['localhost', '127.0.0.1', '::1'], true)) {
            throw new RuntimeException('Use the complete external PostgreSQL database URL on port 5432. It is not saved or printed.');
        }
        if (! extension_loaded('pdo_pgsql')) {
            throw new RuntimeException('Enable pdo_pgsql first: php -d extension=pdo_pgsql artisan demo:load-candidates --remote --force');
        }
        $connection = (new ConfigurationUrlParser)->parseConfiguration(['driver' => 'pgsql', 'url' => $url, 'port' => 5432, 'charset' => 'utf8']);
        $connection['sslmode'] = 'require';
        config(['database.connections.im2_demo_remote' => $connection]);
        DB::setDefaultConnection('im2_demo_remote');
    }
}
