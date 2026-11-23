<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeStudentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_rename_does_not_rewrite_an_opened_candidate_profile(): void
    {
        $student = Student::create(['student_id' => 'LEGACY-CANDIDATE', 'full_name' => 'Original Name', 'academic_status' => 'enrolled']);
        $profile = CandidateProfile::create(['student_id' => $student->student_id, 'full_name' => 'Original Name']);
        $election = Election::create(['name' => 'Opened election', 'status' => 'active']);
        Candidacy::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'team' => 'TEAM_A']);

        $this->putJson('/api/committee/students/'.$student->student_id, ['full_name' => 'Corrected Student Name'])->assertOk();

        $this->assertSame('Corrected Student Name', $student->fresh()->full_name);
        $this->assertSame('Original Name', $profile->fresh()->full_name);
    }

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::create([
            'role' => 'committee',
            'name' => 'Election Committee',
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ]), ['committee']);
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
            "/api/committee/students?election_id={$election->id}",
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

    public function test_committee_can_create_and_update_a_student_with_course_without_credentials(): void
    {
        $this->postJson('/api/committee/students', [
            'student_id' => '2026-0100',
            'full_name' => 'New Student',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ])->assertCreated();

        $this->putJson('/api/committee/students/2026-0100', [
            'full_name' => 'Updated Student',
            'course' => 'BSCS',
            'password' => null,
            'academic_status' => 'enrolled',
        ])->assertOk();

        $this->assertDatabaseHas('students', [
            'student_id' => '2026-0100',
            'full_name' => 'Updated Student',
            'course' => 'BSCS',
        ]);
    }

    public function test_class_details_can_be_updated_and_cleared_without_changing_access_or_attendance(): void
    {
        $election = Election::create(['name' => 'Class details test', 'status' => 'active']);
        $student = Student::create([
            'student_id' => 'CLASS001', 'full_name' => 'Class Test Student',
            'course' => 'BSIT', 'academic_status' => 'enrolled',
            'year_level' => '1', 'section' => '1D',
            'password' => 'PersonalPassword123!', 'password_change_required' => false,
        ]);
        $password = $student->getRawOriginal('password');
        $student->createToken('voter-session', ['voter']);
        $participation = VoterParticipation::create([
            'election_id' => $election->id, 'student_id' => $student->student_id, 'voted_at' => now(),
        ]);

        $this->putJson('/api/committee/students/CLASS001', ['year_level' => '3', 'section' => '3D'])
            ->assertOk()->assertJsonPath('data.year_level', '3')->assertJsonPath('data.section', '3D');
        $this->getJson('/api/committee/students?election_id='.$election->id)
            ->assertOk()->assertJsonPath('data.0.year_level', '3')->assertJsonPath('data.0.section', '3D')
            ->assertJsonPath('data.0.attendance_recorded', true)->assertJsonPath('data.0.voting_status', 'voted');
        $this->assertSame($password, $student->fresh()->getRawOriginal('password'));
        $this->assertFalse($student->fresh()->password_change_required);
        $this->assertSame(1, $student->tokens()->count());
        $this->assertSame($participation->voted_at->toIso8601String(), $participation->fresh()->voted_at->toIso8601String());
        $this->assertDatabaseHas('students', ['student_id' => 'CLASS001', 'full_name' => 'Class Test Student', 'course' => 'BSIT', 'academic_status' => 'enrolled']);

        $this->putJson('/api/committee/students/CLASS001', ['year_level' => null, 'section' => null])
            ->assertOk()->assertJsonPath('data.year_level', null)->assertJsonPath('data.section', null);
        $this->putJson('/api/committee/students/CLASS001', ['section' => str_repeat('D', 101)])
            ->assertUnprocessable()->assertJsonValidationErrors('section');
        $this->assertDatabaseCount('students', 1);
        $this->assertDatabaseCount('voter_participations', 1);
    }

    public function test_enrolled_filter_hides_graduated_and_stopped_students_from_the_voter_list(): void
    {
        Student::create([
            'student_id' => '2026-1000',
            'full_name' => 'Eligible Student',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);
        Student::create([
            'student_id' => '2020-1001',
            'full_name' => 'Graduate Student',
            'course' => 'BSIT',
            'academic_status' => 'graduated',
        ]);
        Student::create([
            'student_id' => '2023-1002',
            'full_name' => 'Stopped Student',
            'course' => 'BSHM',
            'academic_status' => 'stopped',
        ]);

        $response = $this->getJson('/api/committee/students?status=enrolled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.student_id', '2026-1000');

        $studentIds = collect($response->json('data'))->pluck('student_id');
        $this->assertNotContains('2020-1001', $studentIds);
        $this->assertNotContains('2023-1002', $studentIds);
    }

    public function test_student_list_supports_an_explicit_page_size_up_to_one_hundred(): void
    {
        foreach (range(1, 30) as $index) {
            Student::create([
                'student_id' => sprintf('2026-%04d', $index),
                'full_name' => "Student {$index}",
                'course' => 'BSIT',
                'academic_status' => 'enrolled',
            ]);
        }

        $this->getJson('/api/committee/students?status=enrolled&per_page=100')
            ->assertOk()
            ->assertJsonPath('per_page', 100)
            ->assertJsonPath('total', 30)
            ->assertJsonCount(30, 'data');
    }
}
