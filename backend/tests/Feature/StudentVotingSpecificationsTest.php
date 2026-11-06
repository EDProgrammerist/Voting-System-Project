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

class StudentVotingSpecificationsTest extends TestCase
{
    use RefreshDatabase;

    private function student(): Student
    {
        return Student::create(['student_id' => 'S001', 'full_name' => 'Test Student', 'academic_status' => 'enrolled']);
    }

    private function login(array $overrides = [])
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/voter/login', array_merge(['student_id' => 'S001', 'full_name' => 'Test Student'], $overrides));
    }

    public function test_default_positions_exist_and_cannot_be_added_renamed_or_deleted(): void
    {
        $election = Election::create(['name' => 'Election', 'status' => 'draft']);
        $this->assertSame(['President', 'Vice President', 'Senator'], $election->positions->pluck('name')->all());
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'spec@example.test', 'password' => 'Password123!']), ['admin']);
        $this->postJson('/api/admin/positions', ['election_id' => $election->id, 'name' => 'Extra', 'max_selections' => 1, 'display_order' => 4])->assertStatus(405);
        $position = $election->positions->first();
        $this->putJson('/api/admin/positions/'.$position->id, ['name' => 'Other'])->assertUnprocessable();
        $this->deleteJson('/api/admin/positions/'.$position->id)->assertStatus(405);
    }

    public function test_upgrade_preserves_running_and_closed_ballots_and_backfills_drafts(): void
    {
        $migration = require database_path('migrations/2026_11_06_000000_add_student_voting_specifications.php');
        $migration->down();
        $active = Election::withoutEvents(fn () => Election::create(['name' => 'Legacy active', 'status' => 'active']));
        $closed = Election::withoutEvents(fn () => Election::create(['name' => 'Legacy closed', 'status' => 'closed']));
        $draft = Election::withoutEvents(fn () => Election::create(['name' => 'Legacy draft', 'status' => 'draft']));
        foreach ([$active, $closed] as $election) {
            $election->positions()->create(['name' => 'President', 'max_selections' => 1, 'display_order' => 1]);
        }
        $migration->up();
        $this->assertSame(['President'], $active->positions()->pluck('name')->all());
        $this->assertSame(['President'], $closed->positions()->pluck('name')->all());
        $this->assertSame(['President', 'Vice President', 'Senator'], $draft->positions()->pluck('name')->all());
    }

    public function test_student_logs_in_with_full_name_and_id_number_without_a_pin(): void
    {
        $this->student();
        Election::create(['name' => 'Election', 'status' => 'active']);
        $this->login()->assertOk()->assertJsonPath('student.student_id', 'S001')->assertJsonPath('tally_only', false);
        $this->login(['full_name' => 'Wrong Name'])->assertUnauthorized();
        $this->login(['student_id' => 'WRONG-ID'])->assertUnauthorized();
        $this->login(['student_id' => ''])->assertUnprocessable()->assertJsonValidationErrors('student_id');
        $this->login(['full_name' => ''])->assertUnprocessable()->assertJsonValidationErrors('full_name');
        $this->login(['full_name' => '  test   STUDENT  '])->assertOk();
    }

    public function test_admin_pin_management_is_removed(): void
    {
        $this->student();
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'spec@example.test', 'password' => 'Password123!']), ['admin']);
        $this->putJson('/api/admin/students/S001/pin', ['pin' => '654321'])->assertNotFound();
    }

    public function test_malformed_or_oversized_signatures_are_rejected_without_recording_votes(): void
    {
        $student = $this->student();
        $election = Election::create(['name' => 'Election', 'status' => 'active']);
        Sanctum::actingAs($student, ['vote']);
        $payload = ['election_id' => $election->id, 'thumbmark_confirmed' => true, 'selections' => [['position_id' => $election->positions->first()->id, 'candidate_student_id' => 'C0']]];
        $this->postJson('/api/voter/vote', $payload + ['signature' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('signature');
        $this->postJson('/api/voter/vote', $payload + ['signature' => [[['x' => -1, 'y' => 0], ['x' => 601, 'y' => 201]]]])->assertUnprocessable()->assertJsonValidationErrors(['signature.0.0.x', 'signature.0.1.x', 'signature.0.1.y']);
        $this->postJson('/api/voter/vote', $payload + ['signature' => array_fill(0, 6, array_fill(0, 2000, ['x' => 20, 'y' => 30]))])->assertUnprocessable()->assertJsonValidationErrors('signature');
        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertDatabaseCount('ballots', 0);
    }

    public function test_verified_vote_keeps_tally_access_and_repeat_login_blocks_ballot(): void
    {
        $student = $this->student();
        $election = Election::create(['name' => 'Election', 'status' => 'active']);
        $selections = [];
        foreach ($election->positions as $index => $position) {
            $id = 'C'.$index;
            Student::create(['student_id' => $id, 'full_name' => 'Candidate '.$index, 'academic_status' => 'enrolled']);
            CandidateProfile::create(['student_id' => $id, 'full_name' => 'Candidate '.$index, 'profile' => 'Student leader', 'achievements' => 'Academic award']);
            Candidacy::create(['student_id' => $id, 'election_id' => $election->id, 'position_id' => $position->id, 'team' => 'TEAM_A']);
            $selections[] = ['position_id' => $position->id, 'candidate_student_id' => $id];
        }
        $token = $this->login()->assertOk()->assertJsonPath('tally_only', false)->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('positions.0.candidates.0.achievements', 'Academic award');
        $payload = ['election_id' => $election->id, 'selections' => $selections];
        $this->withToken($token)->postJson('/api/voter/vote', $payload)->assertUnprocessable()->assertJsonValidationErrors(['signature', 'thumbmark_confirmed']);
        $signature = [array_map(fn ($index) => ['x' => ($index % 600) + 0.123456789, 'y' => ($index % 199) + 0.987654321], range(0, 1999))];
        $payload += ['signature' => $signature, 'thumbmark_confirmed' => true];
        $this->withToken($token)->postJson('/api/voter/vote', $payload)->assertCreated();
        $this->assertNotNull(VoterParticipation::sole()->signature);
        $this->assertSame($signature, VoterParticipation::sole()->signature);
        $this->assertStringNotContainsString('"x"', VoterParticipation::sole()->getRawOriginal('signature'));
        $this->assertNotNull(VoterParticipation::sole()->thumbmark_confirmed_at);
        $this->withToken($token)->getJson('/api/voter/ballot')->assertForbidden();
        $this->withToken($token)->postJson('/api/voter/vote', $payload)->assertForbidden();
        $this->withToken($token)->getJson('/api/voter/tally')->assertOk()->assertJsonPath('positions.0.candidates.0.votes', 1)->assertJsonPath('tally_only', true)->assertJsonMissingPath('students');
        $newToken = $this->login()->assertOk()->assertJsonPath('tally_only', true)->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($newToken)->getJson('/api/voter/ballot')->assertForbidden();
        $this->withToken($newToken)->getJson('/api/voter/tally')->assertOk();
        $election->update(['status' => 'closed']);
        $this->login()->assertOk()->assertJsonPath('tally_only', true);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('votes', 3);
    }
}
