<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Position;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCandidateManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::create([
            'name' => 'SSG Admin',
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ]), ['admin']);
    }

    public function test_candidate_can_be_saved_updated_and_removed_from_a_draft_election(): void
    {
        $student = Student::create([
            'student_id' => '2026-0200',
            'full_name' => 'Candidate Student',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);
        $election = Election::create([
            'name' => 'Draft Election',
            'status' => 'draft',
        ]);
        $president = Position::create([
            'election_id' => $election->id,
            'name' => 'President',
            'max_selections' => 1,
            'display_order' => 1,
        ]);
        $vicePresident = Position::create([
            'election_id' => $election->id,
            'name' => 'Vice President',
            'max_selections' => 1,
            'display_order' => 2,
        ]);

        $this->postJson('/api/admin/candidates', [
            'student_id' => $student->student_id,
            'election_id' => $election->id,
            'position_id' => $president->id,
            'team' => 'TEAM_A',
            'motto' => 'Serve first',
        ])->assertCreated();

        $this->postJson('/api/admin/candidates', [
            'student_id' => $student->student_id,
            'election_id' => $election->id,
            'position_id' => $vicePresident->id,
            'team' => 'TEAM_B',
            'motto' => 'Serve better',
        ])->assertCreated();

        $this->assertDatabaseCount('candidacies', 1);
        $this->assertDatabaseHas('candidacies', [
            'election_id' => $election->id,
            'student_id' => $student->student_id,
            'position_id' => $vicePresident->id,
            'team' => 'TEAM_B',
        ]);

        $this->deleteJson(
            "/api/admin/candidates/{$student->student_id}",
            ['election_id' => $election->id],
        )->assertOk();

        $this->assertDatabaseMissing('candidacies', [
            'election_id' => $election->id,
            'student_id' => $student->student_id,
        ]);
        $this->assertDatabaseHas('candidate_profiles', [
            'student_id' => $student->student_id,
        ]);
    }

    public function test_candidate_removal_is_blocked_after_election_activation(): void
    {
        $student = Student::create([
            'student_id' => '2026-0201',
            'full_name' => 'Locked Candidate',
            'course' => 'BSHM',
            'academic_status' => 'enrolled',
        ]);
        CandidateProfile::create([
            'student_id' => $student->student_id,
            'full_name' => $student->full_name,
        ]);
        $election = Election::create([
            'name' => 'Active Election',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);
        $position = Position::create([
            'election_id' => $election->id,
            'name' => 'President',
            'max_selections' => 1,
            'display_order' => 1,
        ]);
        Candidacy::create([
            'election_id' => $election->id,
            'student_id' => $student->student_id,
            'position_id' => $position->id,
            'team' => 'TEAM_A',
        ]);

        $this->deleteJson(
            "/api/admin/candidates/{$student->student_id}",
            ['election_id' => $election->id],
        )->assertConflict();

        $this->assertDatabaseHas('candidacies', [
            'election_id' => $election->id,
            'student_id' => $student->student_id,
        ]);
    }
}
