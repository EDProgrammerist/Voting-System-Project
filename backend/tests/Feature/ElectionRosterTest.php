<?php

namespace Tests\Feature;

use App\Models\ClassListImport;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ElectionRosterTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'admin'): User
    {
        $user = User::create(['name' => 'Election staff', 'email' => $role.'@roster.test', 'role' => $role, 'password' => 'StaffPassword123!']);
        Sanctum::actingAs($user, [$role]);

        return $user;
    }

    public function test_empty_future_dashboard_does_not_inherit_the_current_student_roster(): void
    {
        $this->staff();
        Student::create(['student_id' => 'CURRENT', 'full_name' => 'Current student', 'academic_status' => 'enrolled', 'course' => 'BSIT']);
        $current = Election::create(['name' => 'SSG Election 2026', 'status' => 'draft']);
        $future = Election::create(['name' => 'SSG Election 2027', 'status' => 'draft', 'uses_voter_roster' => true]);
        VoterParticipation::create(['student_id' => 'CURRENT', 'election_id' => $current->id, 'voted_at' => now()]);

        $this->getJson('/api/admin/dashboard?election_id='.$future->id)->assertOk()
            ->assertJsonPath('turnout.eligible_students', 0)->assertJsonPath('turnout.already_voted', 0)
            ->assertJsonPath('turnout.not_yet_voted', 0)->assertJsonPath('turnout.percentage', 0)
            ->assertJsonPath('turnout.by_course', [])->assertJsonPath('candidate_results', [])
            ->assertJsonPath('team_totals.TEAM_A', 0)->assertJsonPath('team_totals.TEAM_B', 0);
        $this->getJson('/api/admin/dashboard?election_id='.$current->id)->assertOk()
            ->assertJsonPath('turnout.eligible_students', 1)->assertJsonPath('turnout.already_voted', 1);
    }

    public function test_committee_registration_and_listing_are_scoped_to_the_selected_election(): void
    {
        $this->staff('committee');
        $current = Election::create(['name' => 'Current', 'status' => 'draft', 'uses_voter_roster' => true]);
        $future = Election::create(['name' => 'Future', 'status' => 'draft', 'uses_voter_roster' => true]);
        $this->postJson('/api/committee/students', ['election_id' => $future->id, 'student_id' => 'NEXT', 'full_name' => 'Future student', 'academic_status' => 'enrolled'])->assertCreated();

        $this->getJson('/api/committee/students?election_id='.$current->id)->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/committee/students?election_id='.$future->id)->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.student_id', 'NEXT');
        $this->assertNull(Student::findOrFail('NEXT')->password);
    }

    public function test_import_adds_existing_students_to_the_chosen_roster_without_changing_accounts(): void
    {
        $committee = $this->staff('committee');
        $current = Election::create(['name' => 'Current', 'status' => 'draft', 'uses_voter_roster' => true]);
        $future = Election::create(['name' => 'Future', 'status' => 'draft', 'uses_voter_roster' => true]);
        $student = Student::create(['student_id' => 'EXISTING', 'full_name' => 'Existing name', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'year_level' => '2nd Year']);
        $current->voters()->attach($student->student_id);
        $before = $student->fresh()->getAttributes();
        $draft = ClassListImport::create([
            'user_id' => $committee->id, 'file_name' => 'class-list.xlsx', 'file_hash' => str_repeat('a', 64), 'expires_at' => now()->addMinutes(30),
            'records' => ['election_id' => $future->id, 'rows' => [
                ['student_id' => 'EXISTING', 'full_name' => 'Do not overwrite', 'academic_status' => 'enrolled', 'year_level' => '3rd Year'],
                ['student_id' => 'NEW', 'full_name' => 'New student', 'academic_status' => 'enrolled'],
            ]],
        ]);

        $this->postJson('/api/committee/class-list/'.$draft->id.'/commit')->assertOk()->assertJsonPath('inserted', 2)->assertJsonPath('skipped', 0);
        $this->postJson('/api/committee/class-list/'.$draft->id.'/commit')->assertOk()->assertJsonPath('already_committed', true);

        $this->assertSame($before, $student->fresh()->getAttributes());
        $this->assertSame(1, $current->voters()->count());
        $this->assertSame(2, $future->voters()->count());
        $this->assertDatabaseCount('students', 2);
        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertNull(Student::findOrFail('NEW')->password);
    }

    public function test_unregistered_student_cannot_sign_in_to_a_future_election(): void
    {
        $student = Student::create(['student_id' => '2024-0100', 'full_name' => 'Current student', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'password_change_required' => false]);
        $future = Election::create(['name' => 'Future', 'status' => 'draft', 'uses_voter_roster' => true]);
        $this->postJson('/api/voter/login', ['entry_code' => $future->qr_entry_code, 'student_id' => '20240100', 'password' => 'PersonalPassword123!'])->assertForbidden();
        $this->assertDatabaseCount('voter_ballot_ids', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $future->voters()->attach($student->student_id);
        $this->postJson('/api/voter/login', ['entry_code' => $future->qr_entry_code, 'student_id' => '20240100', 'password' => 'PersonalPassword123!'])->assertOk();
    }

    public function test_upgrade_preserves_current_records_and_leaves_unused_future_rosters_empty(): void
    {
        $migration = require database_path('migrations/2026_11_23_000001_add_election_voter_rosters.php');
        $migration->down();
        DB::table('students')->insert(['student_id' => 'LEGACY', 'full_name' => 'Existing student', 'academic_status' => 'enrolled']);
        $current = Election::create(['name' => 'SSG Election 2026', 'status' => 'draft']);
        $future = Election::create(['name' => 'SSG Election 2027', 'status' => 'draft']);
        $before = DB::table('students')->first();

        $migration->up();

        $this->assertEquals($before, DB::table('students')->first());
        $this->assertSame(1, $current->fresh()->voters()->count());
        $this->assertSame(0, $future->fresh()->voters()->count());
        $this->assertTrue($current->fresh()->uses_voter_roster);
        $this->assertTrue($future->fresh()->uses_voter_roster);
    }
}
