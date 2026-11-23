<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\Vote;
use App\Models\VoterBallotId;
use App\Models\VoterParticipation;
use Database\Seeders\StudentAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentAccountUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_update_preserves_candidates_votes_and_election_state_and_is_repeatable(): void
    {
        $student = Student::create([
            'student_id' => '20240100', 'full_name' => 'Demo BSIT Voter',
            'academic_status' => 'enrolled', 'course' => 'BSIT',
            'password' => 'PersonalPassword123!', 'password_change_required' => false,
            'year_level' => '2', 'section' => '2D',
        ]);
        $passwordHash = $student->getRawOriginal('password');
        CandidateProfile::create(['student_id' => $student->student_id, 'full_name' => $student->full_name, 'achievements' => 'Existing award']);
        $election = Election::create(['name' => 'Existing election', 'status' => 'active']);
        $reference = VoterBallotId::issue($student, $election);
        $position = $election->positions->first();
        Candidacy::create(['election_id' => $election->id, 'position_id' => $position->id, 'student_id' => $student->student_id, 'team' => 'TEAM_A']);
        Ballot::create(['id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'election_id' => $election->id, 'cast_at' => now()]);
        Vote::create(['ballot_id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'election_id' => $election->id, 'position_id' => $position->id, 'candidate_student_id' => $student->student_id]);
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
        $student->createToken('voter-session', ['vote']);

        $this->seed(StudentAccountsSeeder::class);
        $this->seed(StudentAccountsSeeder::class);

        $this->assertDatabaseHas('students', ['student_id' => '2024-0100', 'full_name' => 'Ian Kurt Ardena']);
        $updated = Student::findOrFail('2024-0100');
        $this->assertSame($passwordHash, $updated->getRawOriginal('password'));
        $this->assertFalse($updated->password_change_required);
        $this->assertSame('2', $updated->year_level);
        $this->assertSame('2D', $updated->section);
        $this->assertDatabaseCount('students', 6);
        $this->assertDatabaseMissing('students', ['student_id' => '20240100']);
        $this->assertDatabaseHas('candidate_profiles', ['student_id' => '2024-0100', 'full_name' => 'Ian Kurt Ardena', 'achievements' => 'Existing award']);
        $this->assertDatabaseHas('candidacies', ['student_id' => '2024-0100']);
        $this->assertDatabaseHas('votes', ['candidate_student_id' => '2024-0100']);
        $this->assertDatabaseHas('voter_participations', ['student_id' => '2024-0100']);
        $this->assertDatabaseHas('voter_ballot_ids', ['id' => $reference->id, 'student_id' => '2024-0100', 'election_id' => $election->id]);
        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'active']);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseHas('students', ['student_id' => '2020-9999', 'full_name' => 'Sheehan Voila', 'academic_status' => 'graduated']);
        $this->assertDatabaseHas('students', ['student_id' => '2023-8888', 'full_name' => 'John Doe', 'academic_status' => 'stopped']);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('votes', 1);

        $this->postJson('/api/voter/login', ['student_id' => '20240100', 'password' => 'PersonalPassword123!'])
            ->assertOk()->assertJsonPath('student.student_id', '2024-0100')->assertJsonPath('tally_only', true);
        $this->postJson('/api/voter/login', ['student_id' => '2024-0100', 'password' => 'PersonalPassword123!'])
            ->assertOk()->assertJsonPath('student.student_id', '2024-0100')->assertJsonPath('tally_only', true);
    }

    public function test_id_update_preserves_imported_class_records_and_demo_attendance(): void
    {
        $imported = Student::createDataRecord([
            'student_id' => 'CLASS-001', 'full_name' => 'Imported Student',
            'academic_status' => 'enrolled', 'course' => 'BSIT', 'year_level' => '3', 'section' => '3D',
        ]);
        $election = Election::create(['name' => 'Draft demo election', 'status' => 'draft']);
        $attendance = VoterParticipation::create([
            'student_id' => $imported->student_id, 'election_id' => $election->id, 'voted_at' => now(),
        ]);
        Ballot::create(['id' => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'election_id' => $election->id, 'cast_at' => now()]);
        $studentBefore = $imported->fresh()->getAttributes();
        $attendanceBefore = $attendance->fresh()->getAttributes();

        $this->seed(StudentAccountsSeeder::class);

        $this->assertSame($studentBefore, $imported->fresh()->getAttributes());
        $this->assertSame($attendanceBefore, $attendance->fresh()->getAttributes());
        $this->assertNull($imported->fresh()->password);
        $this->assertDatabaseCount('students', 7);
        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('votes', 0);
        $this->assertSame('draft', $election->fresh()->status);
    }
}
