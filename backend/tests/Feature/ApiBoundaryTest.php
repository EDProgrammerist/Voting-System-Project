<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiBoundaryTest extends TestCase
{
    public function test_web_root_is_not_exposed(): void
    {
        $this->get('/')->assertNotFound();
    }

    public function test_voter_ballot_requires_authentication(): void
    {
        $this->getJson('/api/voter/ballot')->assertUnauthorized();
    }

    public function test_api_authentication_failure_is_json_without_accept_header(): void
    {
        $this->get('/api/admin/students')
            ->assertUnauthorized()
            ->assertHeader('content-type', 'application/json')
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }
}
