<?php

namespace App\Console\Commands;

use App\Models\Ballot;
use App\Models\Election;
use App\Models\ElectionDemoBatch;
use App\Models\Student;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PrepareDemoElection extends Command
{
    protected $signature = 'demo:prepare-2026 {--force : Explicitly allow setup in production}';

    protected $description = 'Register the existing 40 blank demo ballots for 2026 and create empty 2027–2029 elections';

    public function handle(): int
    {
        if (! app()->environment(['local', 'testing']) && ! $this->option('force')) {
            $this->error('Demo setup outside local/testing requires --force. Use only the demonstration database.');

            return self::FAILURE;
        }

        try {
            DB::transaction(function (): void {
                $election = Election::where('name', 'SSG Election 2026')->lockForUpdate()->sole();
                if (! $election->uses_voter_roster) {
                    $election->voters()->syncWithoutDetaching(Student::pluck('student_id')->all());
                    $election->update(['uses_voter_roster' => true]);
                }
                if (! ElectionDemoBatch::where('election_id', $election->id)->exists()) {
                    $protectedIds = ['2024-0100', '2024-0101', '2024-0102', '2024-0103', '2020-9999', '2023-8888'];
                    $students = Student::whereNotIn('student_id', $protectedIds)->lockForUpdate()->get();
                    $attendance = VoterParticipation::where('election_id', $election->id)->lockForUpdate()->get();
                    $ballots = Ballot::where('election_id', $election->id)->orderBy('id')->lockForUpdate()->get();
                    if ($election->status !== 'draft' || $students->count() !== 40
                        || Student::whereIn('student_id', $protectedIds)->count() !== 6
                        || $students->contains(fn ($student) => $student->getRawOriginal('password') !== null || $student->academic_status !== 'enrolled')
                        || $attendance->count() !== 40 || $attendance->pluck('student_id')->sort()->values()->all() !== $students->pluck('student_id')->sort()->values()->all()
                        || $ballots->count() !== 40 || Vote::where('election_id', $election->id)->exists()) {
                        throw new RuntimeException('Expected a draft 2026 election with exactly 40 imported data-only students, their attendance, 40 blank ballots, and six unvoted original accounts. No records were changed.');
                    }
                    ElectionDemoBatch::create(['election_id' => $election->id, 'ballot_ids' => $ballots->pluck('id')->all()]);
                }
                foreach ([2027, 2028, 2029] as $year) {
                    Election::firstOrCreate(['name' => 'SSG Election '.$year], ['status' => 'draft', 'uses_voter_roster' => true]);
                }
            });
        } catch (RuntimeException $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        }
        $this->info('2026 demo prepared. Complete all candidate positions, then click Activate Election to populate the registered 40 demo ballots once. Existing future elections were preserved; new 2027–2029 elections are empty drafts.');

        return self::SUCCESS;
    }
}
