<?php

namespace Database\Seeders;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Position;
use App\Models\Student;
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

        $students = [
            [
                'student_id' => '2024-0001',
                'full_name' => 'Juan Dela Cruz',
                'course' => 'BSIT',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2024-0002',
                'full_name' => 'Maria Santos',
                'course' => 'BSHM',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2024-0003',
                'full_name' => 'Carlo Reyes',
                'course' => 'BEED',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2024-0004',
                'full_name' => 'Anna Flores',
                'course' => 'BSED',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2024-0100',
                'full_name' => 'Test Voter One',
                'course' => 'BSIT',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2024-0101',
                'full_name' => 'Test Voter Two',
                'course' => 'BSIT',
                'academic_status' => 'enrolled',
            ],
            [
                'student_id' => '2020-9999',
                'full_name' => 'Graduate Student',
                'course' => 'BSIT',
                'academic_status' => 'graduated',
            ],
            [
                'student_id' => '2023-8888',
                'full_name' => 'Stopped Student',
                'course' => 'BSHM',
                'academic_status' => 'stopped',
            ],
            [
                'student_id' => '2022-7777',
                'full_name' => 'Inactive Student',
                'course' => 'BEED',
                'academic_status' => 'inactive',
            ],
            [
                'student_id' => '2021-6666',
                'full_name' => 'Withdrawn Student',
                'course' => 'BSED',
                'academic_status' => 'withdrawn',
            ],
        ];

        foreach ($students as $student) {
            Student::updateOrCreate(
                [
                    'student_id' => $student['student_id'],
                ],
                $student,
            );
        }

        $election = Election::updateOrCreate(
            [
                'name' => 'SSG Election 2026',
            ],
            [
                'status' => 'active',
                'starts_at' => now()->subHour(),
                'ends_at' => now()->addDays(2),
            ],
        );

        $president = Position::updateOrCreate(
            [
                'election_id' => $election->id,
                'name' => 'President',
            ],
            [
                'max_selections' => 1,
                'display_order' => 1,
            ],
        );

        $vicePresident = Position::updateOrCreate(
            [
                'election_id' => $election->id,
                'name' => 'Vice President',
            ],
            [
                'max_selections' => 1,
                'display_order' => 2,
            ],
        );

        $candidateData = [
            [
                'student_id' => '2024-0001',
                'motto' => 'Leadership through service',
                'position_id' => $president->id,
                'team' => 'TEAM_A',
            ],
            [
                'student_id' => '2024-0002',
                'motto' => 'Students first',
                'position_id' => $president->id,
                'team' => 'TEAM_B',
            ],
            [
                'student_id' => '2024-0003',
                'motto' => 'Serve with integrity',
                'position_id' => $vicePresident->id,
                'team' => 'TEAM_A',
            ],
            [
                'student_id' => '2024-0004',
                'motto' => 'Together we improve',
                'position_id' => $vicePresident->id,
                'team' => 'TEAM_B',
            ],
        ];

        foreach ($candidateData as $candidate) {
            $student = Student::findOrFail($candidate['student_id']);

            CandidateProfile::updateOrCreate(
                [
                    'student_id' => $student->student_id,
                ],
                [
                    'full_name' => $student->full_name,
                    'motto' => $candidate['motto'],
                ],
            );

            Candidacy::updateOrCreate(
                [
                    'election_id' => $election->id,
                    'student_id' => $student->student_id,
                ],
                [
                    'position_id' => $candidate['position_id'],
                    'team' => $candidate['team'],
                ],
            );
        }
    }
}
