<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QrVotingEntryTest extends TestCase
{
    use RefreshDatabase;

    private function student(string $id = 'QR001', bool $setup = false): Student
    {
        return Student::create(['student_id' => $id, 'full_name' => 'QR Test Student', 'academic_status' => 'enrolled', 'password' => $setup ? '123456' : 'PersonalPassword123!', 'password_change_required' => $setup]);
    }

    private function election(string $status = 'active'): Election
    {
        $election = Election::create(['name' => 'QR test election', 'status' => $status]);
        foreach ($election->positions as $position) {
            $id = 'C-'.$position->id;
            CandidateProfile::create(['student_id' => $id, 'full_name' => 'Candidate '.$position->name]);
            Candidacy::create(['student_id' => $id, 'election_id' => $election->id, 'position_id' => $position->id, 'team' => 'TEAM_A']);
        }

        return $election;
    }

    private function login(Student $student, Election $election)
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/voter/login', ['student_id' => $student->student_id, 'password' => $student->password_change_required ? '123456' : 'PersonalPassword123!', 'entry_code' => $election->qr_entry_code]);
    }

    private function token(string $token): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function vote(Election $election, ?string $reference = null): array
    {
        return ['election_id' => $election->id, 'ballot_reference_id' => $reference, 'signature' => [[['x' => 10, 'y' => 20], ['x' => 60, 'y' => 35]]], 'thumbmark_confirmed' => true, 'selections' => $election->positions->map(fn ($position) => ['position_id' => $position->id, 'candidate_student_id' => 'C-'.$position->id])->all()];
    }

    public function test_public_scan_only_resolves_an_election_and_never_creates_attendance_or_a_ballot(): void
    {
        $election = $this->election();
        $this->getJson('/api/voter/entry/'.$election->qr_entry_code)->assertOk()->assertJsonPath('election.id', $election->id)->assertJsonMissingPath('students');
        $this->getJson('/api/voter/entry/not-a-real-code')->assertNotFound();
        $this->assertDatabaseCount('voter_ballot_ids', 0);
        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertDatabaseCount('ballots', 0);
        $election->update(['status' => 'closed']);
        $this->getJson('/api/voter/entry/'.$election->qr_entry_code)->assertConflict();
    }

    public function test_ballot_ids_are_unique_per_student_and_stable_on_repeat_login_and_refresh(): void
    {
        $election = $this->election();
        $first = $this->student();
        $second = $this->student('QR002');
        $response = $this->login($first, $election)->assertOk()->assertJsonPath('ballot_reference.attendance_recorded', false);
        $id = $response->json('ballot_reference.id');
        $this->assertNotEmpty($id);
        $this->token($response->json('token'))->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('ballot_reference.id', $id);
        $this->token($response->json('token'))->getJson('/api/voter/session')->assertOk()->assertJsonPath('ballot_reference.id', $id);
        $this->login($first, $election)->assertOk()->assertJsonPath('ballot_reference.id', $id);
        $other = $this->login($second, $election)->assertOk()->json('ballot_reference.id');
        $this->assertNotSame($id, $other);
        $this->assertDatabaseCount('voter_ballot_ids', 2);
        $this->assertDatabaseCount('voter_participations', 0);
    }

    public function test_invalid_credentials_ineligible_accounts_and_bad_qr_codes_cannot_issue_ids(): void
    {
        $election = $this->election();
        $student = $this->student();
        $this->postJson('/api/voter/login', ['student_id' => $student->student_id, 'password' => 'wrong', 'entry_code' => $election->qr_entry_code])->assertUnauthorized();
        $this->postJson('/api/voter/login', ['student_id' => $student->student_id, 'password' => 'PersonalPassword123!', 'entry_code' => 'missing-code'])->assertUnprocessable();
        $student->update(['academic_status' => 'graduated']);
        $this->login($student, $election)->assertForbidden();
        $this->assertDatabaseCount('voter_ballot_ids', 0);
    }

    public function test_password_setup_keeps_the_scanned_election_and_defers_ballot_id_issuance(): void
    {
        $election = $this->election('draft');
        $student = $this->student('NEWQR', true);
        $setup = $this->login($student, $election)->assertOk()->assertJsonPath('password_change_required', true)->assertJsonPath('ballot_reference', null)->json('token');
        $this->assertDatabaseCount('voter_ballot_ids', 0);
        $other = $this->election();
        $response = $this->token($setup)->postJson('/api/voter/password', ['password' => 'PersonalPassword123!', 'password_confirmation' => 'PersonalPassword123!'])->assertOk()->assertJsonPath('election.id', $election->id)->assertJsonPath('ballot_reference.attendance_recorded', false);
        $this->token($response->json('token'))->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('election.id', $election->id);
        $this->assertDatabaseCount('voter_ballot_ids', 1);
    }

    public function test_only_a_successful_vote_records_attendance_and_keeps_vote_choices_anonymous(): void
    {
        $election = $this->election();
        $student = $this->student();
        $response = $this->login($student, $election)->assertOk();
        $id = $response->json('ballot_reference.id');
        $token = $response->json('token');
        $this->token($token)->postJson('/api/voter/vote', ['election_id' => $election->id])->assertUnprocessable();
        $this->assertDatabaseCount('voter_participations', 0);
        $this->token($token)->postJson('/api/voter/vote', $this->vote($election, $id))->assertCreated()->assertJsonPath('ballot_reference.id', $id)->assertJsonPath('ballot_reference.attendance_recorded', true);
        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertNotSame($id, Ballot::sole()->id);
        $this->election();
        $this->token($token)->getJson('/api/voter/tally')->assertOk()->assertJsonPath('election.id', $election->id);
        $this->token($token)->getJson('/api/voter/tally')->assertOk()->assertJsonPath('ballot_reference.attendance_recorded', true);
        $this->token($token)->postJson('/api/voter/vote', $this->vote($election, $id))->assertForbidden();
        $this->login($student, $election)->assertOk()->assertJsonPath('tally_only', true)->assertJsonPath('ballot_reference.id', $id);
        $this->assertDatabaseCount('votes', 3);
    }

    public function test_a_student_cannot_submit_another_students_id_or_vote_in_another_election(): void
    {
        $election = $this->election();
        $other = $this->election();
        $student = $this->student();
        $response = $this->login($student, $election)->assertOk();
        $stranger = $this->login($this->student('OTHER'), $election)->assertOk()->json('ballot_reference.id');
        $this->token($response->json('token'))->postJson('/api/voter/vote', $this->vote($election, $stranger))->assertUnprocessable();
        $this->token($response->json('token'))->postJson('/api/voter/vote', $this->vote($other))->assertForbidden();
        $this->assertDatabaseCount('voter_participations', 0);
    }

    public function test_admin_can_print_the_shared_entry_code_and_read_attendance_without_vote_choices(): void
    {
        $election = $this->election();
        $this->getJson('/api/admin/elections/'.$election->id.'/qr')->assertUnauthorized();
        $student = $this->student();
        $response = $this->login($student, $election)->assertOk();
        $this->token($response->json('token'))->getJson('/api/admin/elections/'.$election->id.'/qr')->assertForbidden();
        $this->token($response->json('token'))->postJson('/api/voter/vote', $this->vote($election, $response->json('ballot_reference.id')))->assertCreated();
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'qr-admin@example.test', 'password' => 'AdminPassword123!']), ['admin']);
        $this->getJson('/api/admin/elections/'.$election->id.'/qr')->assertOk()->assertJsonPath('entry_path', '/vote/'.$election->qr_entry_code);
        $this->getJson('/api/admin/students?election_id='.$election->id)->assertNotFound();
        Sanctum::actingAs(User::create(['name' => 'Committee', 'email' => 'qr-committee@example.test', 'password' => 'TestPassword123!', 'role' => 'committee']), ['committee']);
        $this->getJson('/api/committee/students?election_id='.$election->id)->assertOk()->assertJsonPath('data.0.attendance_recorded', true)->assertJsonPath('data.0.ballot_id', $response->json('ballot_reference.id'))->assertJsonMissingPath('data.0.selections')->assertJsonMissingPath('data.0.signature');
    }

    public function test_qr_migration_backfills_existing_elections_without_changing_their_records(): void
    {
        $election = $this->election('closed');
        $code = $election->qr_entry_code;
        $migration = require database_path('migrations/2026_11_09_000000_add_qr_voting_entry.php');
        $migration->down();
        $migration->up();
        $this->assertNotEmpty($election->fresh()->qr_entry_code);
        $this->assertNotSame($code, $election->fresh()->qr_entry_code);
        $this->assertSame('closed', $election->fresh()->status);
        $this->assertDatabaseCount('elections', 1);
        $this->assertDatabaseCount('positions', 3);
        $this->assertDatabaseCount('candidacies', 3);
        $this->assertDatabaseCount('voter_ballot_ids', 0);
        $this->assertDatabaseCount('ballots', 0);
    }
}
