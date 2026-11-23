<?php

namespace Tests\Feature;

use Tests\TestCase;

class DeploymentConfigurationTest extends TestCase
{
    public function test_configured_frontend_can_send_bearer_api_requests(): void
    {
        config(['cors.allowed_origins' => ['https://cpc-test.vercel.app']]);
        $this->withHeaders(['Origin' => 'https://cpc-test.vercel.app', 'Access-Control-Request-Method' => 'POST', 'Access-Control-Request-Headers' => 'authorization,content-type'])
            ->options('/api/voter/login')->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'https://cpc-test.vercel.app');
    }

    public function test_unknown_frontend_is_not_granted_cross_origin_access(): void
    {
        config(['cors.allowed_origins' => ['https://cpc-test.vercel.app']]);
        $this->withHeaders(['Origin' => 'https://unknown.example', 'Access-Control-Request-Method' => 'POST'])
            ->options('/api/voter/login')->assertHeader('Access-Control-Allow-Origin', 'https://cpc-test.vercel.app');
    }
}
