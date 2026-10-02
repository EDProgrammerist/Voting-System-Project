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
}
