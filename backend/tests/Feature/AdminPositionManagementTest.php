<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPositionManagementTest extends TestCase
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

    public function test_admin_can_create_update_and_delete_a_draft_position(): void
    {
        $election = Election::create([
            'name' => 'Draft Election',
            'status' => 'draft',
        ]);

        $created = $this->postJson('/api/admin/positions', [
            'election_id' => $election->id,
            'name' => 'Auditor',
            'max_selections' => 1,
            'display_order' => 1,
        ])->assertCreated();

        $positionId = $created->json('data.id');

        $this->putJson("/api/admin/positions/{$positionId}", [
            'name' => 'Internal Auditor',
            'max_selections' => 1,
        ])->assertOk();

        $this->deleteJson("/api/admin/positions/{$positionId}")
            ->assertOk();

        $this->assertDatabaseMissing('positions', [
            'id' => $positionId,
        ]);
    }

    public function test_all_positions_are_reordered_in_one_transaction(): void
    {
        $election = Election::create([
            'name' => 'Draft Election',
            'status' => 'draft',
        ]);
        $first = $this->position($election, 'President', 1);
        $second = $this->position($election, 'Vice President', 2);
        $third = $this->position($election, 'Secretary', 3);

        $this->putJson('/api/admin/positions/reorder', [
            'election_id' => $election->id,
            'positions' => [
                ['id' => $third->id, 'display_order' => 1],
                ['id' => $first->id, 'display_order' => 2],
                ['id' => $second->id, 'display_order' => 3],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $third->id)
            ->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('data.2.id', $second->id);

        $this->assertDatabaseHas('positions', [
            'id' => $third->id,
            'display_order' => 1,
        ]);
    }

    public function test_incomplete_reorder_is_rejected_without_changes(): void
    {
        $election = Election::create([
            'name' => 'Draft Election',
            'status' => 'draft',
        ]);
        $first = $this->position($election, 'President', 1);
        $second = $this->position($election, 'Vice President', 2);

        $this->putJson('/api/admin/positions/reorder', [
            'election_id' => $election->id,
            'positions' => [
                ['id' => $second->id, 'display_order' => 1],
            ],
        ])->assertUnprocessable();

        $this->assertDatabaseHas('positions', [
            'id' => $first->id,
            'display_order' => 1,
        ]);
        $this->assertDatabaseHas('positions', [
            'id' => $second->id,
            'display_order' => 2,
        ]);
    }

    public function test_reorder_is_blocked_for_an_active_election(): void
    {
        $election = Election::create([
            'name' => 'Active Election',
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);
        $position = $this->position($election, 'President', 1);

        $this->putJson('/api/admin/positions/reorder', [
            'election_id' => $election->id,
            'positions' => [
                ['id' => $position->id, 'display_order' => 1],
            ],
        ])->assertConflict();
    }

    private function position(
        Election $election,
        string $name,
        int $displayOrder,
    ): Position {
        return Position::create([
            'election_id' => $election->id,
            'name' => $name,
            'max_selections' => 1,
            'display_order' => $displayOrder,
        ]);
    }
}
