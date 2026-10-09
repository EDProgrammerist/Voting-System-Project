<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Position;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminElectionManagementTest extends TestCase
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

    public function test_admin_can_create_update_activate_and_close_an_election(): void
    {
        $created = $this->postJson('/api/admin/elections', [
            'name' => 'Initial Election Name',
        ])->assertCreated();

        $electionId = $created->json('data.id');

        $this->putJson("/api/admin/elections/{$electionId}", [
            'name' => 'Final Election Name',
        ])->assertOk();

        $student = Student::create([
            'student_id' => '2026-0300',
            'full_name' => 'Election Candidate',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);
        CandidateProfile::create([
            'student_id' => $student->student_id,
            'full_name' => $student->full_name,
        ]);
        $position = Position::create([
            'election_id' => $electionId,
            'name' => 'President',
            'max_selections' => 1,
            'display_order' => 1,
        ]);
        Candidacy::create([
            'election_id' => $electionId,
            'student_id' => $student->student_id,
            'position_id' => $position->id,
            'team' => 'TEAM_A',
        ]);

        $this->postJson("/api/admin/elections/{$electionId}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->putJson("/api/admin/elections/{$electionId}", [
            'name' => 'Forbidden Rename',
        ])->assertConflict();

        $this->postJson("/api/admin/elections/{$electionId}/close")
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');
    }
}
