<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterParticipation;
use Database\Seeders\StudentAccountsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentPasswordTest extends TestCase
{
    use RefreshDatabase;

    private function student(): Student
    {
        Election::create(['name' => 'Password test election', 'status' => 'draft']);

        return Student::create(['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena', 'academic_status' => 'enrolled']);
    }

    private function login(string $password = '123456')
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/voter/login', ['student_id' => '20240100', 'password' => $password]);
    }

    private function token(string $token): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    public function test_default_password_is_hashed_and_old_name_id_login_is_rejected(): void
    {
        $student = $this->student();
        $this->assertTrue(Hash::check('123456', $student->password));
        $this->assertNotSame('123456', $student->password);
        $this->assertArrayNotHasKey('password', $student->toArray());
        $this->login()->assertOk()->assertJsonPath('password_change_required', true)->assertJsonMissingPath('student.password');
        $this->login('20240100')->assertUnauthorized();
        $this->postJson('/api/voter/login', ['student_id' => '20240100', 'full_name' => 'Ian Kurt Ardena'])->assertUnprocessable();
        $this->postJson('/api/voter/login', ['student_id' => 'missing', 'password' => '123456'])->assertUnauthorized();
    }

    public function test_setup_session_cannot_read_tally_ballot_or_cast_votes_even_with_an_old_vote_token(): void
    {
        $student = $this->student();
        $old = $student->createToken('legacy-session', ['vote'])->plainTextToken;
        $setup = $this->login()->assertOk()->json('token');
        foreach ([$setup, $old] as $token) {
            $this->token($token)->getJson('/api/voter/session')->assertOk()->assertJsonPath('password_change_required', true);
            $this->token($token)->getJson('/api/voter/ballot')->assertForbidden()->assertJsonPath('password_change_required', true);
            $this->token($token)->getJson('/api/voter/tally')->assertForbidden();
            $this->token($token)->postJson('/api/voter/vote', [])->assertForbidden();
        }
        $this->assertDatabaseCount('ballots', 0);
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_password_setup_rotates_all_tokens_and_default_password_stops_working(): void
    {
        $student = $this->student();
        $old = $student->createToken('legacy-session', ['vote'])->plainTextToken;
        $setup = $this->login()->json('token');
        $password = 'MyOwnPassword2026!';
        $response = $this->token($setup)->postJson('/api/voter/password', ['password' => $password, 'password_confirmation' => $password])
            ->assertOk()->assertJsonPath('password_change_required', false);
        $this->assertTrue(Hash::check($password, $student->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $this->token($setup)->getJson('/api/voter/session')->assertUnauthorized();
        $this->token($old)->getJson('/api/voter/session')->assertUnauthorized();
        $this->token($response->json('token'))->getJson('/api/voter/ballot')->assertOk();
        $this->login()->assertUnauthorized();
        $this->login($password)->assertOk()->assertJsonPath('password_change_required', false);
        $this->assertDatabaseCount('voter_participations', 0);
    }

    public function test_password_rules_and_confirmation_do_not_unlock_the_account(): void
    {
        $student = $this->student();
        $token = $this->login()->json('token');
        foreach (['123456', 'lowercaseonly123!', 'UPPERCASEONLY123!', 'MissingNumbers!', 'MissingSymbols123', str_repeat('Ab1!', 19), str_repeat('é', 40).'Ab1!', "ValidPassword123!\0"] as $password) {
            $this->token($token)->postJson('/api/voter/password', ['password' => $password, 'password_confirmation' => $password])
                ->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->token($token)->postJson('/api/voter/password', ['password' => 'ValidPassword123!', 'password_confirmation' => 'DifferentPassword123!'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertTrue($student->fresh()->password_change_required);
        $this->assertTrue(Hash::check('123456', $student->fresh()->password));
    }

    public function test_already_voted_student_still_has_only_tally_access_after_password_setup(): void
    {
        $student = $this->student();
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => Election::sole()->id, 'voted_at' => now()]);
        $setup = $this->login()->assertOk()->assertJsonPath('tally_only', true)->json('token');
        $password = 'MyOwnPassword2026!';
        $token = $this->token($setup)->postJson('/api/voter/password', ['password' => $password, 'password_confirmation' => $password])
            ->assertOk()->assertJsonPath('tally_only', true)->json('token');
        $this->token($token)->getJson('/api/voter/tally')->assertOk();
        $this->token($token)->getJson('/api/voter/ballot')->assertForbidden();
        $this->token($token)->postJson('/api/voter/vote', [])->assertForbidden();
        $this->login($password)->assertOk()->assertJsonPath('tally_only', true);
        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_setup_can_be_cancelled_and_cannot_be_repeated_or_used_by_admin(): void
    {
        $this->student();
        $token = $this->login()->json('token');
        $this->token($token)->postJson('/api/voter/logout')->assertOk();
        $this->token($token)->getJson('/api/voter/session')->assertUnauthorized();
        $token = $this->login()->json('token');
        $payload = ['password' => 'ValidPassword123!', 'password_confirmation' => 'ValidPassword123!'];
        $token = $this->token($token)->postJson('/api/voter/password', $payload)->assertOk()->json('token');
        $this->token($token)->postJson('/api/voter/password', $payload)->assertForbidden();
        $admin = User::create(['name' => 'Admin', 'email' => 'password-test@example.test', 'password' => 'AdminTest123!']);
        $this->token($admin->createToken('admin', ['admin'])->plainTextToken)->postJson('/api/voter/password', $payload)->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', '')->postJson('/api/voter/password', $payload)->assertUnauthorized();
    }

    public function test_seeder_does_not_reset_a_personal_password_or_student_identity(): void
    {
        $student = $this->student();
        $student->update(['password' => 'PersonalPassword123!', 'password_change_required' => false]);
        $this->seed(StudentAccountsSeeder::class);
        $this->assertTrue(Hash::check('PersonalPassword123!', $student->fresh()->password));
        $this->assertFalse($student->fresh()->password_change_required);
        $this->assertSame('20240100', $student->fresh()->student_id);
    }

    public function test_migration_initializes_existing_students_without_changing_election_records(): void
    {
        $student = $this->student();
        $other = Student::create(['student_id' => 'S002', 'full_name' => 'Other Student', 'academic_status' => 'stopped']);
        $election = Election::sole();
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
        $before = DB::table('voter_participations')->get()->toJson();
        $migration = require database_path('migrations/2026_11_07_000000_add_student_passwords.php');
        $migration->down();
        $migration->up();
        foreach ([$student, $other] as $account) {
            $this->assertTrue(Hash::check('123456', $account->fresh()->password));
            $this->assertTrue($account->fresh()->password_change_required);
        }
        $this->assertNotSame($student->fresh()->password, $other->fresh()->password);
        $this->assertSame($before, DB::table('voter_participations')->get()->toJson());
        $this->assertSame('draft', $election->fresh()->status);
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('positions', 3);
        $this->assertDatabaseCount('votes', 0);
    }
}
