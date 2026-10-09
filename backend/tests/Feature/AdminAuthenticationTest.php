<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_logout_with_a_bearer_token(): void
    {
        User::create([
            'name' => 'SSG Admin',
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ]);

        $login
            ->assertOk()
            ->assertJsonPath('admin.email', 'admin@ssg.local')
            ->assertJsonStructure([
                'message',
                'token',
                'admin' => ['name', 'email'],
            ]);

        $this->withToken($login->json('token'))
            ->postJson('/api/admin/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_invalid_admin_credentials_are_rejected(): void
    {
        User::create([
            'name' => 'SSG Admin',
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@ssg.local',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }
}
