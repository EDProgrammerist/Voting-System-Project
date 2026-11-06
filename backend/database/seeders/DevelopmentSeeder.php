<?php

namespace Database\Seeders;

use App\Models\Election;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            [
                'email' => 'admin@ssg.local',
            ],
            [
                'name' => 'SSG Admin',
                'password' => Hash::make('Admin123!'),
            ],
        );

        $this->call(StudentAccountsSeeder::class);

        Election::updateOrCreate(
            [
                'name' => 'SSG Election 2026 Presentation',
            ],
            [
                'status' => 'draft',
                'starts_at' => null,
                'ends_at' => null,
            ],
        );
    }
}
