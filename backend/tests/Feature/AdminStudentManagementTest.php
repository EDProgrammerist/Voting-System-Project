<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStudentManagementTest extends TestCase
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

    public function test_student_list_includes_course_and_election_participation(): void
    {
        $election = Election::create([
            'name' => 'Test Election',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);

        Student::create([
            'student_id' => '2026-0001',
            'full_name' => 'Voted Student',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);

        Student::create([
            'student_id' => '2026-0002',
            'full_name' => 'Waiting Student',
            'course' => 'BSHM',
            'academic_status' => 'enrolled',
        ]);

        VoterParticipation::create([
            'election_id' => $election->id,
            'student_id' => '2026-0001',
            'voted_at' => now(),
        ]);

        $response = $this->getJson(
            "/api/admin/students?election_id={$election->id}",
        );

        $response
            ->assertOk()
            ->assertJsonFragment([
                'student_id' => '2026-0001',
                'course' => 'BSIT',
                'has_voted' => true,
                'voting_status' => 'voted',
            ])
            ->assertJsonFragment([
                'student_id' => '2026-0002',
                'course' => 'BSHM',
                'has_voted' => false,
                'voting_status' => 'not_voted',
            ]);
    }

    public function test_admin_can_create_and_update_a_student_with_course(): void
    {
        $this->postJson('/api/admin/students', [
            'student_id' => '2026-0100',
            'full_name' => 'New Student',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ])->assertCreated();

        $this->putJson('/api/admin/students/2026-0100', [
            'full_name' => 'Updated Student',
            'course' => 'BSCS',
            'academic_status' => 'enrolled',
        ])->assertOk();

        $this->assertDatabaseHas('students', [
            'student_id' => '2026-0100',
            'full_name' => 'Updated Student',
            'course' => 'BSCS',
        ]);
    }
}
