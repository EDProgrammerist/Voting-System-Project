<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoterParticipation;
use App\Support\VoterElection;
use Database\Seeders\DevelopmentSeeder;
use Database\Seeders\StudentAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoElectionTest extends TestCase
{
    use RefreshDatabase;

    private function prepareRecords(): Election
    {
        $this->seed(StudentAccountsSeeder::class);
        $election = Election::create(['name' => 'SSG Election 2026', 'status' => 'draft']);
        for ($index = 0; $index < 40; $index++) {
            $student = Student::createDataRecord([
                'student_id' => 'CLASS-'.$index, 'full_name' => 'Imported '.$index,
                'academic_status' => 'enrolled', 'year_level' => '1st Year', 'section' => '1D',
            ]);
            VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
            Ballot::create(['id' => (string) Str::uuid(), 'election_id' => $election->id, 'cast_at' => now()]);
        }
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'demo-test@example.test', 'password' => 'AdminTest123!']), ['admin']);

        return $election;
    }

    private function addCandidates(Election $election): void
    {
        foreach ($election->positions as $position) {
            foreach (['TEAM_A', 'TEAM_B'] as $team) {
                $id = 'C-'.$position->id.'-'.$team;
                CandidateProfile::create(['student_id' => $id, 'full_name' => $id]);
                Candidacy::create(['student_id' => $id, 'election_id' => $election->id, 'position_id' => $position->id, 'team' => $team]);
            }
        }
    }

    public function test_preparation_keeps_existing_data_and_future_elections_empty_and_is_repeatable(): void
    {
        $election = $this->prepareRecords();
        $students = DB::table('students')->orderBy('student_id')->get()->toJson();
        $attendance = DB::table('voter_participations')->orderBy('id')->get()->toJson();

        $this->artisan('demo:prepare-2026')->assertSuccessful();
        $this->artisan('demo:prepare-2026')->assertSuccessful();

        $this->assertDatabaseCount('elections', 4);
        $this->assertDatabaseCount('election_demo_batches', 1);
        $this->assertSame($students, DB::table('students')->orderBy('student_id')->get()->toJson());
        $this->assertSame($attendance, DB::table('voter_participations')->orderBy('id')->get()->toJson());
        $this->assertSame($election->id, VoterElection::current()->id);
        $this->getJson('/api/admin/elections')->assertOk()->assertJsonPath('data.0.id', $election->id);
        foreach ([2027, 2028, 2029] as $year) {
            $future = Election::where('name', 'SSG Election '.$year)->sole();
            $this->assertSame('draft', $future->status);
            $this->assertCount(7, $future->positions);
            $this->assertCount(0, $future->candidacies);
            $this->assertSame(0, Ballot::where('election_id', $future->id)->count());
            $this->assertSame(0, VoterParticipation::where('election_id', $future->id)->count());
        }
        $this->assertDatabaseCount('votes', 0);
        $this->assertSame('draft', $election->fresh()->status);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/voter/login', ['student_id' => '20240100', 'password' => '123456'])
            ->assertOk()->assertJsonPath('election.id', $election->id);
    }

    public function test_activation_populates_only_the_registered_demo_ballots_once(): void
    {
        $election = $this->prepareRecords();
        $this->artisan('demo:prepare-2026')->assertSuccessful();
        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertUnprocessable();
        $this->assertDatabaseCount('votes', 0);
        $this->addCandidates($election);

        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertOk()->assertJsonPath('data.status', 'active');
        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertConflict();
        $this->artisan('demo:prepare-2026')->assertSuccessful();

        $this->assertDatabaseCount('ballots', 40);
        $this->assertDatabaseCount('voter_participations', 40);
        $this->assertDatabaseCount('votes', 280);
        $this->assertSame(0, VoterParticipation::whereIn('student_id', Student::whereNotNull('password')->pluck('student_id'))->count());
        $this->assertNotNull(DB::table('election_demo_batches')->value('seeded_at'));
        foreach ($election->positions as $position) {
            $counts = Vote::where('position_id', $position->id)->selectRaw('candidate_student_id, COUNT(*) AS total')->groupBy('candidate_student_id')->pluck('total')->sort()->values()->all();
            $this->assertEquals([16, 24], $counts);
        }
        $this->getJson('/api/admin/dashboard?election_id='.$election->id)->assertOk()->assertJsonPath('turnout.already_voted', 40);
        foreach (Election::where('id', '!=', $election->id)->get() as $future) {
            $this->assertSame(0, Vote::where('election_id', $future->id)->count());
            $this->assertSame('draft', $future->status);
        }
    }

    public function test_preparation_rejects_nonblank_ballots_without_creating_future_records(): void
    {
        $election = $this->prepareRecords();
        $this->addCandidates($election);
        $candidate = $election->candidacies()->first();
        Vote::create(['election_id' => $election->id, 'ballot_id' => Ballot::first()->id, 'position_id' => $candidate->position_id, 'candidate_student_id' => $candidate->student_id]);

        $this->artisan('demo:prepare-2026')->assertFailed();

        $this->assertDatabaseCount('elections', 1);
        $this->assertDatabaseCount('votes', 1);
        $this->assertDatabaseCount('election_demo_batches', 0);
    }

    public function test_activation_rolls_back_if_a_registered_ballot_has_changed(): void
    {
        $election = $this->prepareRecords();
        $this->artisan('demo:prepare-2026')->assertSuccessful();
        $this->addCandidates($election);
        $candidate = $election->candidacies()->first();
        Vote::create(['election_id' => $election->id, 'ballot_id' => Ballot::first()->id, 'position_id' => $candidate->position_id, 'candidate_student_id' => $candidate->student_id]);

        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertUnprocessable();

        $this->assertSame('draft', $election->fresh()->status);
        $this->assertDatabaseCount('votes', 1);
        $this->assertNull(DB::table('election_demo_batches')->value('seeded_at'));
    }

    public function test_preparation_preserves_existing_future_election_configuration(): void
    {
        $this->prepareRecords();
        $future = Election::create(['name' => 'SSG Election 2027', 'status' => 'closed', 'starts_at' => now()->subDay(), 'ends_at' => now()]);
        $before = $future->fresh()->getAttributes();

        $this->artisan('demo:prepare-2026')->assertSuccessful();

        $this->assertSame($before, $future->fresh()->getAttributes());
    }

    public function test_ordinary_election_activation_never_generates_demo_votes(): void
    {
        $election = $this->prepareRecords();
        $this->addCandidates($election);

        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertOk();

        $this->assertDatabaseCount('votes', 0);
        $this->assertDatabaseCount('election_demo_batches', 0);
    }

    public function test_production_preparation_requires_an_explicit_demo_opt_in(): void
    {
        $this->prepareRecords();
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('demo:prepare-2026')->assertFailed();
        $this->assertDatabaseCount('election_demo_batches', 0);
        $this->assertDatabaseCount('elections', 1);
        $this->artisan('demo:prepare-2026', ['--force' => true])->assertSuccessful();
    }

    public function test_reseeding_does_not_return_an_activated_demo_to_draft(): void
    {
        $election = $this->prepareRecords();
        $this->artisan('demo:prepare-2026')->assertSuccessful();
        $this->addCandidates($election);
        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertOk();
        $before = $election->fresh()->getAttributes();

        $this->seed(DevelopmentSeeder::class);

        $this->assertSame($before, $election->fresh()->getAttributes());
        $this->assertDatabaseCount('votes', 280);
    }

    public function test_live_student_vote_adds_to_the_demo_without_changing_future_elections(): void
    {
        $election = $this->prepareRecords();
        $this->artisan('demo:prepare-2026')->assertSuccessful();
        $this->addCandidates($election);
        $this->postJson('/api/admin/elections/'.$election->id.'/activate')->assertOk();
        $student = Student::findOrFail('2024-0100');
        $student->update(['password_change_required' => false]);
        Sanctum::actingAs($student, ['vote', 'election:'.$election->id]);

        $this->postJson('/api/voter/vote', [
            'election_id' => $election->id,
            'signature' => [[['x' => 10, 'y' => 20], ['x' => 60, 'y' => 35]]],
            'thumbmark_confirmed' => true,
            'selections' => $election->positions->map(fn ($position) => [
                'position_id' => $position->id,
                'candidate_student_id' => 'C-'.$position->id.'-TEAM_A',
            ])->all(),
        ])->assertCreated();

        $this->assertDatabaseCount('ballots', 41);
        $this->assertDatabaseCount('voter_participations', 41);
        $this->assertDatabaseCount('votes', 287);
        $this->assertSame(0, Vote::where('election_id', '!=', $election->id)->count());
        $this->assertSame(0, VoterParticipation::where('election_id', '!=', $election->id)->count());
    }
}
