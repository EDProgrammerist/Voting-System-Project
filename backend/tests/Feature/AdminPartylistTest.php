<?php

namespace Tests\Feature;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Partylist;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPartylistTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): void
    {
        Sanctum::actingAs(User::create(['name' => 'Test Admin', 'email' => 'party-admin@example.test', 'password' => 'TestPassword123!']), ['admin']);
    }

    private function payload(Election $election, string $team = 'TEAM_A'): array
    {
        return ['election_id' => $election->id, 'team' => $team, 'name' => 'Student Alliance', 'platform' => "Better student facilities.\nSupport student organizations."];
    }

    public function test_admin_can_create_and_update_two_partylist_slots_with_safe_banner_uploads(): void
    {
        Storage::fake('public');
        $this->admin();
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        $created = $this->postJson('/api/admin/partylists', [...$this->payload($election), 'banner_image' => UploadedFile::fake()->image('banner.png', 1200, 400)])
            ->assertCreated()->assertJsonPath('data.name', 'Student Alliance');
        $party = Partylist::findOrFail($created->json('data.id'));
        $oldPath = $party->banner_image;
        Storage::disk('public')->assertExists($oldPath);
        $this->putJson('/api/admin/partylists/'.$party->id, [...$this->payload($election), 'name' => 'New Alliance', 'banner_image' => UploadedFile::fake()->image('replacement.jpg')])->assertOk();
        Storage::disk('public')->assertMissing($oldPath);
        $this->getJson('/api/admin/partylists?election_id='.$election->id)->assertOk()->assertJsonPath('data.0.name', 'New Alliance');
        $this->postJson('/api/admin/partylists', $this->payload($election))->assertUnprocessable();
        $this->postJson('/api/admin/partylists', [...$this->payload($election, 'TEAM_B'), 'name' => 'Student Progress'])->assertCreated();
        $this->postJson('/api/admin/partylists', $this->payload($election, 'TEAM_C'))->assertUnprocessable();
        $this->assertDatabaseCount('partylists', 2);
        $this->assertDatabaseCount('students', 0);
        foreach (['active', 'closed'] as $status) {
            $election->update(['status' => $status]);
            $this->putJson('/api/admin/partylists/'.$party->id, $this->payload($election))->assertConflict();
        }
        $this->assertSame('New Alliance', $party->fresh()->name);
    }

    public function test_permissions_upload_limits_and_open_election_rules_are_enforced(): void
    {
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        $this->getJson('/api/admin/partylists?election_id='.$election->id)->assertUnauthorized();
        Sanctum::actingAs(User::create(['name' => 'Committee', 'email' => 'party-committee@example.test', 'password' => 'TestPassword123!', 'role' => 'committee']), ['committee']);
        $this->postJson('/api/admin/partylists', $this->payload($election))->assertForbidden();
        $this->admin();
        $this->postJson('/api/admin/partylists', [...$this->payload($election), 'banner_image' => UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml')])->assertUnprocessable();
        $this->postJson('/api/admin/partylists', [...$this->payload($election), 'banner_image' => UploadedFile::fake()->image('large.png')->size(2049)])->assertUnprocessable();
        $this->postJson('/api/admin/partylists', [...$this->payload($election), 'platform' => ''])->assertUnprocessable();
        $election->update(['status' => 'active']);
        $this->postJson('/api/admin/partylists', $this->payload($election))->assertConflict();
        $this->assertDatabaseCount('partylists', 0);
    }

    public function test_partylist_platform_is_shared_without_changing_candidates_or_vote_totals(): void
    {
        $this->admin();
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        $profile = CandidateProfile::create(['student_id' => 'PARTY-C1', 'full_name' => 'Candidate One', 'motto' => 'Legacy candidate platform', 'achievements' => 'Leadership award']);
        $candidacy = Candidacy::create(['election_id' => $election->id, 'position_id' => $election->positions->first()->id, 'student_id' => $profile->student_id, 'team' => 'TEAM_A']);
        $before = $candidacy->fresh()->getAttributes();
        $this->postJson('/api/admin/partylists', $this->payload($election))->assertCreated();
        $this->getJson('/api/admin/candidates?election_id='.$election->id)->assertOk()->assertJsonPath('data.0.partylist.name', 'Student Alliance')->assertJsonPath('data.0.motto', $this->payload($election)['platform']);
        $this->getJson('/api/admin/dashboard?election_id='.$election->id)->assertOk()->assertJsonPath('team_totals.TEAM_A', 0)->assertJsonPath('partylist_names.TEAM_A', 'Student Alliance');
        $this->assertSame($before, $candidacy->fresh()->getAttributes());
        $this->assertSame('Legacy candidate platform', $profile->fresh()->motto);
        Sanctum::actingAs(Student::create(['student_id' => 'PARTY-S1', 'full_name' => 'Student One', 'academic_status' => 'enrolled', 'password_change_required' => false]), ['vote']);
        $this->getJson('/api/voter/ballot')->assertOk()->assertJsonPath('positions.0.candidates.0.partylist.name', 'Student Alliance')->assertJsonPath('positions.0.candidates.0.motto', $this->payload($election)['platform']);
        $this->getJson('/api/voter/tally')->assertOk()->assertJsonPath('positions.0.candidates.0.partylist.name', 'Student Alliance');
        $this->getJson('/api/admin/partylists?election_id='.$election->id)->assertForbidden();
    }

    public function test_invalid_cross_election_updates_and_failed_saves_leave_no_orphaned_banners(): void
    {
        Storage::fake('public');
        $this->admin();
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        DB::statement("CREATE TRIGGER reject_partylist BEFORE INSERT ON partylists WHEN NEW.name = 'Fail Save' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
        $this->postJson('/api/admin/partylists', [...$this->payload($election), 'name' => 'Fail Save', 'banner_image' => UploadedFile::fake()->image('banner.png')])->assertConflict();
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseCount('partylists', 0);
        $created = $this->postJson('/api/admin/partylists', $this->payload($election))->assertCreated();
        $other = Election::create(['name' => 'Other Election', 'status' => 'draft']);
        $this->putJson('/api/admin/partylists/'.$created->json('data.id'), $this->payload($other))->assertUnprocessable();
        $this->assertDatabaseHas('partylists', ['id' => $created->json('data.id'), 'election_id' => $election->id]);
    }

    public function test_admin_can_delete_a_draft_partylist_and_banner_without_deleting_candidates(): void
    {
        Storage::fake('public');
        $this->admin();
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        $profile = CandidateProfile::create(['student_id' => 'KEEP-C1', 'full_name' => 'Keep Candidate', 'achievements' => 'Student leader']);
        $candidate = Candidacy::create(['election_id' => $election->id, 'student_id' => $profile->student_id, 'position_id' => $election->positions->first()->id, 'team' => 'TEAM_A']);
        $before = $candidate->fresh()->getAttributes();
        $created = $this->postJson('/api/admin/partylists', [...$this->payload($election), 'banner_image' => UploadedFile::fake()->image('banner.png')])->assertCreated();
        $party = Partylist::findOrFail($created->json('data.id'));
        $path = $party->banner_image;
        $this->deleteJson('/api/admin/partylists/'.$party->id)->assertOk();
        $this->assertDatabaseMissing('partylists', ['id' => $party->id]);
        Storage::disk('public')->assertMissing($path);
        $this->assertSame($before, $candidate->fresh()->getAttributes());
        $this->assertDatabaseHas('candidate_profiles', ['student_id' => $profile->student_id]);
        $this->postJson('/api/admin/partylists', $this->payload($election))->assertCreated();
        $this->deleteJson('/api/admin/partylists/'.$party->id)->assertNotFound();
    }

    public function test_partylist_deletion_requires_admin_access_and_draft_status(): void
    {
        Storage::fake('public');
        $election = Election::create(['name' => 'Partylist Election', 'status' => 'draft']);
        $party = Partylist::create($this->payload($election));
        $this->deleteJson('/api/admin/partylists/'.$party->id)->assertUnauthorized();
        Sanctum::actingAs(User::create(['name' => 'Committee', 'email' => 'delete-committee@example.test', 'password' => 'TestPassword123!', 'role' => 'committee']), ['committee']);
        $this->deleteJson('/api/admin/partylists/'.$party->id)->assertForbidden();
        $this->admin();
        foreach (['active', 'closed'] as $status) {
            $election->update(['status' => $status]);
            $this->deleteJson('/api/admin/partylists/'.$party->id)->assertConflict();
            $this->assertDatabaseHas('partylists', ['id' => $party->id]);
        }
    }
}
