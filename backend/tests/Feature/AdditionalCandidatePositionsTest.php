<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdditionalCandidatePositionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_and_add_candidates_for_the_four_additional_offices(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Admin', 'email' => 'positions@example.test', 'password' => 'Password123!',
        ]), ['admin']);
        $election = Election::create(['name' => 'New election', 'status' => 'draft']);
        $names = ['President', 'Vice President', 'Senator', 'Secretary', 'Treasurer', 'Auditor', 'PIO'];

        $response = $this->getJson('/api/admin/positions?election_id='.$election->id)->assertOk();
        $this->assertSame($names, array_column($response->json('data'), 'name'));

        foreach (['Secretary', 'Treasurer', 'Auditor', 'PIO'] as $name) {
            $position = $election->positions()->where('name', $name)->sole();
            $this->assertSame(1, $position->max_selections);
            $this->postJson('/api/admin/candidates', [
                'election_id' => $election->id, 'position_id' => $position->id,
                'full_name' => $name.' Candidate', 'team' => 'TEAM_A',
            ])->assertCreated()->assertJsonPath('data.position.id', $position->id);
        }

        $this->assertDatabaseCount('candidacies', 4);
        $this->assertDatabaseCount('students', 0);
    }

    public function test_upgrade_adds_only_missing_offices_to_drafts_and_preserves_existing_positions(): void
    {
        $snapshots = [];
        foreach (['draft', 'active', 'closed'] as $status) {
            $election = Election::withoutEvents(fn () => Election::create(['name' => $status.' election', 'status' => $status]));
            foreach (['President', 'Vice President', 'Senator', 'Secretary'] as $index => $name) {
                $election->positions()->create([
                    'name' => $name, 'max_selections' => $name === 'Senator' ? 6 : 1,
                    'display_order' => $index + 1,
                ]);
            }
            $snapshots[$status] = [$election, $election->positions()->get()->toArray()];
        }

        $migration = require database_path('migrations/2026_11_22_000000_add_candidate_offices.php');
        $migration->up();
        $migration->up();

        foreach ($snapshots as $status => [$election, $before]) {
            $after = $election->positions()->get();
            $this->assertSame($before, $after->take(4)->toArray());
            if ($status === 'draft') {
                $this->assertSame(['President', 'Vice President', 'Senator', 'Secretary', 'Treasurer', 'Auditor', 'PIO'], $after->pluck('name')->all());
                $this->assertSame([1, 2, 3, 4, 5, 6, 7], $after->pluck('display_order')->all());
                $this->assertSame([1, 1, 1], $after->slice(4)->pluck('max_selections')->all());
            } else {
                $this->assertCount(4, $after);
            }
        }
    }
}
