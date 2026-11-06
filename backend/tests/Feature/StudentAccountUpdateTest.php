<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Database\Seeders\StudentAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentAccountUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_update_preserves_candidates_votes_and_election_state_and_is_repeatable(): void
    {
        $student = Student::create(['student_id' => '2024-0100', 'full_name' => 'Demo BSIT Voter', 'academic_status' => 'enrolled', 'course' => 'BSIT']);
        CandidateProfile::create(['student_id' => $student->student_id, 'full_name' => $student->full_name, 'achievements' => 'Existing award']);
        $election = Election::create(['name' => 'Existing election', 'status' => 'active']);
        $position = $election->positions->first();
        Candidacy::create(['election_id' => $election->id, 'position_id' => $position->id, 'student_id' => $student->student_id, 'team' => 'TEAM_A']);
        Ballot::create(['id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'election_id' => $election->id, 'cast_at' => now()]);
        Vote::create(['ballot_id' => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'election_id' => $election->id, 'position_id' => $position->id, 'candidate_student_id' => $student->student_id]);
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
        $student->createToken('voter-session', ['vote']);

        $this->seed(StudentAccountsSeeder::class);
        $this->seed(StudentAccountsSeeder::class);

        $this->assertDatabaseCount('students', 6);
        $this->assertDatabaseMissing('students', ['student_id' => '2024-0100']);
        $this->assertDatabaseHas('students', ['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena']);
        $this->assertDatabaseHas('candidate_profiles', ['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena', 'achievements' => 'Existing award']);
        $this->assertDatabaseHas('candidacies', ['student_id' => '20240100']);
        $this->assertDatabaseHas('votes', ['candidate_student_id' => '20240100']);
        $this->assertDatabaseHas('voter_participations', ['student_id' => '20240100']);
        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'active']);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseHas('students', ['student_id' => '20209999', 'full_name' => 'Sheehan Voila', 'academic_status' => 'graduated']);
        $this->assertDatabaseHas('students', ['student_id' => '20238888', 'full_name' => 'John Doe', 'academic_status' => 'stopped']);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('votes', 1);
    }
}
