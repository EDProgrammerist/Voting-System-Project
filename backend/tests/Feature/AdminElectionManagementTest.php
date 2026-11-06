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
        $position = Position::firstOrCreate([
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

        foreach ($position->election->positions()->where('id', '!=', $position->id)->get() as $otherPosition) {
            $otherStudent = Student::create(['student_id' => 'C'.$otherPosition->id, 'full_name' => 'Candidate '.$otherPosition->name, 'academic_status' => 'enrolled']);
            CandidateProfile::create(['student_id' => $otherStudent->student_id, 'full_name' => $otherStudent->full_name]);
            Candidacy::create(['election_id' => $electionId, 'student_id' => $otherStudent->student_id, 'position_id' => $otherPosition->id, 'team' => 'TEAM_A']);
        }

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

    public function test_election_cannot_be_activated_when_a_position_has_no_candidate(): void
    {
        $created = $this->postJson('/api/admin/elections', [
            'name' => 'Incomplete Election',
        ])->assertCreated();

        $electionId = $created->json('data.id');
        $student = Student::create([
            'student_id' => '2026-0301',
            'full_name' => 'Only Candidate',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);
        CandidateProfile::create([
            'student_id' => $student->student_id,
            'full_name' => $student->full_name,
        ]);
        $president = Position::firstOrCreate([
            'election_id' => $electionId,
            'name' => 'President',
            'max_selections' => 1,
            'display_order' => 1,
        ]);
        Position::firstOrCreate([
            'election_id' => $electionId,
            'name' => 'Vice President',
            'max_selections' => 1,
            'display_order' => 2,
        ]);
        Candidacy::create([
            'election_id' => $electionId,
            'student_id' => $student->student_id,
            'position_id' => $president->id,
            'team' => 'TEAM_A',
        ]);

        $this->postJson("/api/admin/elections/{$electionId}/activate")
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Add at least one candidate to every position before activating the election.',
            );

        $this->assertDatabaseHas('elections', [
            'id' => $electionId,
            'status' => 'draft',
        ]);
    }

    public function test_updating_one_election_date_still_validates_the_effective_date_range(): void
    {
        $startsAt = now()->addDay()->startOfMinute();
        $endsAt = $startsAt->copy()->addDay();
        $election = Election::create([
            'name' => 'Scheduled Election',
            'status' => 'draft',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        $this->putJson("/api/admin/elections/{$election->id}", [
            'ends_at' => $startsAt->copy()->subMinute()->toISOString(),
        ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.ends_at.0',
                'The election end time must be after its start time.',
            );

        $this->assertDatabaseHas('elections', [
            'id' => $election->id,
            'ends_at' => $endsAt,
        ]);
    }
}
