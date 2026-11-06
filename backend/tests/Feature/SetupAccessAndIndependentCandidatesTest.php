<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SetupAccessAndIndependentCandidatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_log_in_and_browse_during_setup_without_casting_a_vote(): void
    {
        Student::create(['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena', 'academic_status' => 'enrolled']);
        $election = Election::create(['name' => 'Election setup', 'status' => 'draft']);
        $token = $this->postJson('/api/voter/login', ['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena'])
            ->assertOk()->assertJsonPath('tally_only', false)->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/voter/tally')->assertOk()->assertJsonPath('tally_only', false);
        $this->withToken($token)->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('can_submit_vote', false)->assertJsonCount(3, 'positions');
        CandidateProfile::create(['student_id' => 'C-TEST', 'full_name' => 'Independent Candidate']);
        Candidacy::create(['student_id' => 'C-TEST', 'election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'team' => 'TEAM_A']);
        $this->withToken($token)->postJson('/api/voter/vote', [
            'election_id' => $election->id,
            'selections' => [['position_id' => $election->positions->first()->id, 'candidate_student_id' => 'C-TEST']],
            'signature' => [[['x' => 10, 'y' => 10], ['x' => 40, 'y' => 30]]],
            'thumbmark_confirmed' => true,
        ])->assertConflict();
        $this->assertDatabaseCount('votes', 0);
        $this->assertSame('draft', $election->fresh()->status);
    }

    public function test_candidates_are_created_and_edited_without_becoming_voters(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'admin@example.test', 'password' => 'Password123!']), ['admin']);
        $election = Election::create(['name' => 'Election setup', 'status' => 'draft']);
        $payload = ['full_name' => 'Independent Candidate', 'election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'team' => 'TEAM_A', 'profile' => 'Student leader', 'achievements' => 'Academic award'];
        $id = $this->postJson('/api/admin/candidates', $payload)->assertCreated()->assertJsonPath('data.full_name', 'Independent Candidate')->json('data.student_id');
        $this->assertDatabaseCount('students', 0);
        $this->assertDatabaseHas('candidate_profiles', ['student_id' => $id, 'achievements' => 'Academic award']);
        $this->postJson('/api/admin/candidates', [...$payload, 'student_id' => $id, 'full_name' => 'Updated Candidate'])->assertCreated()->assertJsonPath('data.full_name', 'Updated Candidate');
        $this->assertDatabaseCount('candidate_profiles', 1);
        $this->assertDatabaseCount('candidacies', 1);
        $this->postJson('/api/voter/login', ['student_id' => $id, 'full_name' => 'Updated Candidate'])->assertUnauthorized();
    }

    public function test_a_draft_cannot_rename_candidates_from_another_or_active_election(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'admin@example.test', 'password' => 'Password123!']), ['admin']);
        $active = Election::create(['name' => 'Active election', 'status' => 'active']);
        $draft = Election::create(['name' => 'Setup election', 'status' => 'draft']);
        CandidateProfile::create(['student_id' => 'C-ACTIVE', 'full_name' => 'Original Name']);
        Candidacy::create(['student_id' => 'C-ACTIVE', 'election_id' => $active->id, 'position_id' => $active->positions->first()->id, 'team' => 'TEAM_A']);
        $payload = ['student_id' => 'C-ACTIVE', 'full_name' => 'Changed Name', 'election_id' => $draft->id, 'position_id' => $draft->positions->first()->id, 'team' => 'TEAM_B'];
        $this->postJson('/api/admin/candidates', $payload)->assertUnprocessable();
        Candidacy::create(['student_id' => 'C-ACTIVE', 'election_id' => $draft->id, 'position_id' => $draft->positions->first()->id, 'team' => 'TEAM_A']);
        $this->postJson('/api/admin/candidates', $payload)->assertConflict();
        $this->assertDatabaseHas('candidate_profiles', ['student_id' => 'C-ACTIVE', 'full_name' => 'Original Name']);
    }
}
