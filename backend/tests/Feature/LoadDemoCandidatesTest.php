<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\ElectionDemoBatch;
use App\Models\Student;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class LoadDemoCandidatesTest extends TestCase
{
    use RefreshDatabase;

    private function demo(): Election
    {
        $election = Election::create(['name' => 'SSG Election 2026', 'status' => 'draft', 'uses_voter_roster' => true]);
        $election->positions()->where('name', 'Senator')->update(['max_selections' => 8]);
        $ballots = [];
        foreach (range(1, 40) as $number) {
            $student = Student::createDataRecord(['student_id' => 'IMPORTED-'.$number, 'full_name' => 'Imported Student '.$number, 'academic_status' => 'enrolled']);
            $election->voters()->attach($student->student_id);
            VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
            $id = (string) Str::uuid();
            Ballot::create(['id' => $id, 'election_id' => $election->id, 'cast_at' => now()]);
            $ballots[] = $id;
        }
        ElectionDemoBatch::create(['election_id' => $election->id, 'ballot_ids' => $ballots, 'seeded_at' => now()]);
        Election::create(['name' => 'SSG Election 2027', 'status' => 'draft', 'uses_voter_roster' => true]);

        return $election;
    }

    private function protectedRecords(): array
    {
        $result = [];
        foreach (['users', 'students', 'elections', 'positions', 'election_student', 'voter_participations', 'ballots', 'votes', 'election_demo_batches'] as $table) {
            $result[$table] = DB::table($table)->get()->toJson();
        }

        return $result;
    }

    public function test_loader_fills_all_positions_without_changing_accounts_ballots_or_future_elections(): void
    {
        $election = $this->demo();
        $before = $this->protectedRecords();

        $this->artisan('demo:load-candidates')->assertSuccessful();

        $this->assertDatabaseCount('candidacies', 36);
        $this->assertDatabaseCount('candidate_profiles', 36);
        $this->assertDatabaseCount('partylists', 2);
        foreach ($election->positions as $position) {
            foreach (['TEAM_A', 'TEAM_B'] as $team) {
                $this->assertSame($position->name === 'Senator' ? 12 : 1, Candidacy::where('position_id', $position->id)->where('team', $team)->count());
            }
        }
        $this->assertSame($before, $this->protectedRecords());
        $this->assertSame(8, $election->positions()->where('name', 'Senator')->value('max_selections'));
        $this->assertSame(0, Candidacy::where('election_id', '!=', $election->id)->count());
        $this->assertSame(36, CandidateProfile::whereNotNull('achievements')->whereNull('profile_photo')->count());
    }

    public function test_preview_writes_nothing(): void
    {
        $this->demo();
        $before = $this->protectedRecords();

        $this->artisan('demo:load-candidates', ['--dry-run' => true])->assertSuccessful();

        $this->assertDatabaseCount('candidacies', 0);
        $this->assertDatabaseCount('candidate_profiles', 0);
        $this->assertDatabaseCount('partylists', 0);
        $this->assertSame($before, $this->protectedRecords());
    }

    public function test_repeating_loader_preserves_candidate_and_partylist_edits_and_does_not_duplicate(): void
    {
        $election = $this->demo();
        $this->artisan('demo:load-candidates')->assertSuccessful();
        $profile = CandidateProfile::firstOrFail();
        $profile->update(['full_name' => 'Edited Demo Name', 'achievements' => 'Edited achievements']);
        DB::table('partylists')->where('election_id', $election->id)->where('team', 'TEAM_A')->update(['name' => 'Existing Partylist', 'platform' => 'Keep this platform']);

        $this->artisan('demo:load-candidates')->assertSuccessful();

        $this->assertDatabaseCount('candidacies', 36);
        $this->assertDatabaseCount('candidate_profiles', 36);
        $this->assertSame('Edited Demo Name', $profile->fresh()->full_name);
        $this->assertSame('Edited achievements', $profile->fresh()->achievements);
        $this->assertDatabaseHas('partylists', ['team' => 'TEAM_A', 'name' => 'Existing Partylist', 'platform' => 'Keep this platform']);
    }

    public function test_loader_refuses_opened_elections_even_with_force(): void
    {
        $election = $this->demo();
        foreach (['active', 'closed'] as $status) {
            $election->update(['status' => $status]);
            $this->artisan('demo:load-candidates', ['--force' => true])->assertFailed();
            $this->assertSame($status, $election->fresh()->status);
        }
        $this->assertDatabaseCount('candidacies', 0);
        $this->assertDatabaseCount('candidate_profiles', 0);
    }

    public function test_loader_preserves_non_demo_candidates_instead_of_overwriting_them(): void
    {
        $election = $this->demo();
        CandidateProfile::create(['student_id' => 'REAL-CANDIDATE', 'full_name' => 'Existing Candidate']);
        Candidacy::create(['student_id' => 'REAL-CANDIDATE', 'election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'team' => 'TEAM_A']);

        $this->artisan('demo:load-candidates')->assertFailed();

        $this->assertDatabaseCount('candidacies', 1);
        $this->assertDatabaseCount('candidate_profiles', 1);
        $this->assertDatabaseCount('partylists', 0);
    }

    public function test_loader_refuses_existing_votes_or_an_unregistered_demo(): void
    {
        $election = $this->demo();
        CandidateProfile::create(['student_id' => 'PAST-CANDIDATE', 'full_name' => 'Past Candidate']);
        Vote::create(['ballot_id' => Ballot::first()->id, 'election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'candidate_student_id' => 'PAST-CANDIDATE']);
        $this->artisan('demo:load-candidates')->assertFailed();
        $this->assertDatabaseCount('votes', 1);
        $this->assertDatabaseCount('candidacies', 0);
        Vote::query()->delete();
        ElectionDemoBatch::query()->delete();
        $this->artisan('demo:load-candidates')->assertFailed();
        $this->assertDatabaseCount('candidacies', 0);
    }

    public function test_remote_connections_require_force_and_reject_invalid_urls_without_writing(): void
    {
        $this->demo();
        $this->artisan('demo:load-candidates', ['--remote' => true])->assertFailed();
        $this->artisan('demo:load-candidates', ['--remote' => true, '--force' => true])
            ->expectsQuestion('External PostgreSQL database URL', 'postgresql://user:password@localhost:3308/demo')
            ->assertFailed();
        $this->assertDatabaseCount('candidacies', 0);
    }

    public function test_production_load_requires_explicit_force(): void
    {
        $this->demo();
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('demo:load-candidates')->assertFailed();
        $this->assertDatabaseCount('candidacies', 0);
        $this->artisan('demo:load-candidates', ['--force' => true])->assertSuccessful();
    }
}
