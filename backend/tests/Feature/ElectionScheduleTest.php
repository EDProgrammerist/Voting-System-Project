<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\ElectionDemoBatch;
use App\Models\Student;
use App\Models\User;
use App\Support\VoterElection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ElectionScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 11, 23)->setTime(9, 0));
    }

    private function election(string $start, string $end): Election
    {
        $election = Election::create(['name' => 'Scheduled election', 'status' => 'draft', 'starts_at' => '2026-11-23 '.$start, 'ends_at' => '2026-11-23 '.$end]);
        foreach ($election->positions as $position) {
            $id = 'C-'.$position->id;
            CandidateProfile::create(['student_id' => $id, 'full_name' => $id]);
            Candidacy::create(['student_id' => $id, 'election_id' => $election->id, 'position_id' => $position->id, 'team' => 'TEAM_A']);
        }

        return $election;
    }

    private function admin(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'schedule@test.local', 'password' => 'Password123!']), ['admin']);
    }

    public function test_early_voter_session_can_vote_after_the_scheduled_opening_without_signing_in_again(): void
    {
        Student::create(['student_id' => '2024-0100', 'full_name' => 'Early voter', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'password_change_required' => false]);
        $election = $this->election('09:30:00', '11:00:00');
        $election->update(['status' => 'active']);
        $token = $this->postJson('/api/voter/login', ['entry_code' => $election->qr_entry_code, 'student_id' => '20240100', 'password' => 'PersonalPassword123!'])
            ->assertOk()->assertJsonPath('tally_only', false)->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('can_submit_vote', false);
        $this->travelTo(now()->setTime(9, 31));
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/voter/session')->assertOk()->assertJsonPath('tally_only', false);
        $this->withToken($token)->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('can_submit_vote', true);
        $this->withToken($token)->postJson('/api/voter/vote', [
            'election_id' => $election->id, 'selections' => [],
            'signature' => [[['x' => 10, 'y' => 20], ['x' => 60, 'y' => 35]]], 'thumbmark_confirmed' => true,
        ])->assertCreated();
        $this->assertDatabaseCount('voter_participations', 1);
    }

    public function test_direct_login_prefers_the_upcoming_activated_election_over_empty_future_drafts(): void
    {
        $upcoming = $this->election('09:30:00', '11:00:00');
        $upcoming->update(['status' => 'active']);
        Election::create(['name' => 'SSG Election 2029', 'status' => 'draft', 'uses_voter_roster' => true]);

        $this->assertSame($upcoming->id, VoterElection::current()->id);
    }

    public function test_completed_demo_results_remain_available_before_the_next_election_is_activated(): void
    {
        $demo = Election::create(['name' => 'SSG Election 2026', 'status' => 'closed']);
        ElectionDemoBatch::create(['election_id' => $demo->id, 'ballot_ids' => []]);
        Election::create(['name' => 'SSG Election 2029', 'status' => 'draft', 'uses_voter_roster' => true]);
        Student::create(['student_id' => 'RESULTS', 'full_name' => 'Results viewer', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'password_change_required' => false]);

        $this->assertSame($demo->id, VoterElection::current()->id);
        $this->postJson('/api/voter/login', ['student_id' => 'RESULTS', 'password' => 'PersonalPassword123!'])
            ->assertOk()->assertJsonPath('election.id', $demo->id)->assertJsonPath('tally_only', true);
    }

    public function test_expired_election_cannot_be_activated(): void
    {
        $this->admin();
        $expired = $this->election('07:00:00', '08:00:00');
        $this->postJson('/api/admin/elections/'.$expired->id.'/activate')->assertUnprocessable();
        $this->assertSame('draft', $expired->fresh()->status);
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_overlapping_upcoming_elections_cannot_both_be_activated(): void
    {
        $this->admin();
        $first = $this->election('10:00:00', '11:00:00');
        $second = $this->election('10:30:00', '11:30:00');
        $this->postJson('/api/admin/elections/'.$first->id.'/activate')->assertOk();
        $this->postJson('/api/admin/elections/'.$second->id.'/activate')->assertConflict();
        $this->assertSame('draft', $second->fresh()->status);
    }

    public function test_nonoverlapping_upcoming_elections_can_be_prepared_without_false_conflicts(): void
    {
        $this->admin();
        $first = $this->election('10:00:00', '11:00:00');
        $second = $this->election('11:01:00', '12:00:00');
        $this->postJson('/api/admin/elections/'.$first->id.'/activate')->assertOk();
        $this->postJson('/api/admin/elections/'.$second->id.'/activate')->assertOk();
    }
}
