<?php

namespace Tests\Feature;

use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Position;
use App\Models\Student;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Database\Seeders\DevelopmentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VoterFlowAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_development_seed_contains_the_six_demo_voters_and_preserves_admin_login(): void
    {
        $this->seed(DevelopmentSeeder::class);

        $this->assertDatabaseCount('students', 6);
        $this->assertDatabaseHas('students', [
            'student_id' => '20240100',
            'full_name' => 'Ian Kurt Ardena',
            'course' => 'BSIT',
            'academic_status' => 'enrolled',
        ]);
        $this->assertDatabaseHas('students', [
            'student_id' => '20240101',
            'full_name' => 'Bryan Amoin',
            'course' => 'BSHM',
            'academic_status' => 'enrolled',
        ]);
        $this->assertDatabaseHas('students', [
            'student_id' => '20240102',
            'full_name' => 'Janvenedict Emeliano',
            'course' => 'BEED',
            'academic_status' => 'enrolled',
        ]);
        $this->assertDatabaseHas('students', [
            'student_id' => '20240103',
            'full_name' => 'Demi Arnold',
            'course' => 'BSED',
            'academic_status' => 'enrolled',
        ]);

        $draftElection = Election::sole();
        $this->assertSame('SSG Election 2026', $draftElection->name);
        $this->assertSame('draft', $draftElection->status);
        $this->assertDatabaseCount('positions', 3);
        $this->assertDatabaseCount('candidate_profiles', 0);
        $this->assertDatabaseCount('candidacies', 0);
        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertDatabaseCount('ballots', 0);
        $this->assertDatabaseCount('votes', 0);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ])->assertOk();
    }

    public function test_every_ineligible_academic_status_is_rejected(): void
    {
        $this->seed(DevelopmentSeeder::class);

        Student::create([
            'student_id' => 'TEST-INACTIVE',
            'full_name' => 'Inactive Test Student',
            'course' => 'BEED',
            'academic_status' => 'inactive',
        ]);
        Student::create([
            'student_id' => 'TEST-WITHDRAWN',
            'full_name' => 'Withdrawn Test Student',
            'course' => 'BSED',
            'academic_status' => 'withdrawn',
        ]);

        $this->postJson('/api/voter/login', [
            'student_id' => '20209999',
            'password' => '123456',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'You cannot log in because your student record shows that you have already graduated.')
            ->assertJsonPath('academic_status', 'graduated');

        $this->postJson('/api/voter/login', [
            'student_id' => '20238888',
            'password' => '123456',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'You cannot log in because your enrollment status is stopped.')
            ->assertJsonPath('academic_status', 'stopped');

        $this->postJson('/api/voter/login', [
            'student_id' => 'TEST-INACTIVE',
            'password' => '123456',
        ])
            ->assertForbidden()
            ->assertJsonPath('academic_status', 'inactive');

        $this->postJson('/api/voter/login', [
            'student_id' => 'TEST-WITHDRAWN',
            'password' => '123456',
        ])
            ->assertForbidden()
            ->assertJsonPath('academic_status', 'withdrawn');
    }

    public function test_all_four_supplied_enrolled_accounts_can_log_in_with_the_default_password(): void
    {
        $this->seed(DevelopmentSeeder::class);
        Election::sole()->update(['status' => 'active']);
        foreach ([
            ['20240100', 'Ian Kurt Ardena'],
            ['20240101', 'Bryan Amoin'],
            ['20240102', 'Janvenedict Emeliano'],
            ['20240103', 'Demi Arnold'],
        ] as [$id, $name]) {
            $this->postJson('/api/voter/login', ['student_id' => $id, 'password' => '123456'])
                ->assertOk()->assertJsonPath('student.full_name', $name)->assertJsonPath('student.student_id', $id);
        }
    }

    public function test_vote_submission_updates_live_dashboard_totals_and_remains_anonymous(): void
    {
        $this->seed(DevelopmentSeeder::class);

        $adminLogin = $this->postJson('/api/admin/login', [
            'email' => 'admin@ssg.local',
            'password' => 'Admin123!',
        ])->assertOk();

        $adminToken = $adminLogin->json('token');
        $election = Election::where('status', 'draft')->sole();
        $president = Position::firstOrCreate([
            'election_id' => $election->id,
            'name' => 'President',
            'max_selections' => 1,
            'display_order' => 1,
        ]);
        $vicePresident = Position::firstOrCreate([
            'election_id' => $election->id,
            'name' => 'Vice President',
            'max_selections' => 1,
            'display_order' => 2,
        ]);

        $senator = $election->positions()->where('name', 'Senator')->sole();
        $candidateData = [
            ['student_id' => '20240100', 'position_id' => $president->id, 'team' => 'TEAM_A'],
            ['student_id' => '20240101', 'position_id' => $president->id, 'team' => 'TEAM_B'],
            ['student_id' => '20240102', 'position_id' => $vicePresident->id, 'team' => 'TEAM_A'],
            ['student_id' => '20240103', 'position_id' => $senator->id, 'team' => 'TEAM_B'],
        ];

        foreach ($candidateData as $candidate) {
            $student = Student::findOrFail($candidate['student_id']);
            CandidateProfile::create([
                'student_id' => $student->student_id,
                'full_name' => $student->full_name,
                'motto' => 'Student candidate',
            ]);
            Candidacy::create([
                'election_id' => $election->id,
                ...$candidate,
            ]);
        }

        $this->withToken($adminToken)
            ->postJson("/api/admin/elections/{$election->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $voterLogin = $this->postJson('/api/voter/login', [
            'student_id' => '20240100',
            'password' => '123456',
        ])->assertOk();

        $this->app['auth']->forgetGuards();
        $voterToken = $this->withToken($voterLogin->json('token'))->postJson('/api/voter/password', [
            'password' => 'PersonalPassword123!', 'password_confirmation' => 'PersonalPassword123!',
        ])->assertOk()->json('token');
        $electionId = $voterLogin->json('election.id');

        $this->app['auth']->forgetGuards();

        $ballot = $this->withToken($voterToken)
            ->getJson('/api/voter/ballot')
            ->assertOk();

        $president = collect($ballot->json('positions'))
            ->firstWhere('name', 'President');
        $vicePresident = collect($ballot->json('positions'))
            ->firstWhere('name', 'Vice President');

        $presidentCandidate = collect($president['candidates'])
            ->firstWhere('team', 'TEAM_A');
        $vicePresidentCandidate = collect($vicePresident['candidates'])
            ->firstWhere('team', 'TEAM_A');

        $this->withToken($voterToken)
            ->postJson('/api/voter/vote', [
                'signature' => [[['x' => 10, 'y' => 20], ['x' => 50, 'y' => 35]]],
                'thumbmark_confirmed' => true,
                'election_id' => $electionId,
                'selections' => [[
                    'position_id' => $president['id'],
                    'candidate_student_id' => $presidentCandidate['student_id'],
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.selections.0',
                'Choose at least one candidate for every position. Missing: Vice President, Senator.',
            );

        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertDatabaseCount('ballots', 0);
        $this->assertDatabaseCount('votes', 0);

        $this->withToken($voterToken)
            ->postJson('/api/voter/vote', [
                'signature' => [[['x' => 10, 'y' => 20], ['x' => 50, 'y' => 35]]],
                'thumbmark_confirmed' => true,
                'election_id' => $electionId,
                'selections' => [
                    [
                        'position_id' => $president['id'],
                        'candidate_student_id' => $presidentCandidate['student_id'],
                    ],
                    [
                        'position_id' => $vicePresident['id'],
                        'candidate_student_id' => $vicePresidentCandidate['student_id'],
                    ],
                    ['position_id' => $senator->id, 'candidate_student_id' => '20240103'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('message', 'Your vote was submitted successfully.');

        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseCount('ballots', 1);
        $this->assertDatabaseCount('votes', 3);
        $this->assertSame(1, VoterParticipation::where('student_id', '20240100')->count());
        $this->assertSame(1, Ballot::count());
        $this->assertSame(3, Vote::count());
        $this->assertNotContains('student_id', Schema::getColumnListing('votes'));

        $this->app['auth']->forgetGuards();

        $dashboard = $this->withToken($adminToken)
            ->getJson("/api/admin/dashboard?election_id={$electionId}")
            ->assertOk()
            ->assertJsonPath('turnout.eligible_students', 4)
            ->assertJsonPath('turnout.already_voted', 1)
            ->assertJsonPath('turnout.not_yet_voted', 3)
            ->assertJsonPath('turnout.percentage', 25)
            ->assertJsonPath('team_totals.TEAM_A', 2)
            ->assertJsonFragment([
                'course' => 'BSIT',
                'eligible_students' => 1,
                'already_voted' => 1,
                'not_yet_voted' => 0,
                'percentage' => 100,
            ]);

        $this->assertStringContainsString(
            'no-store',
            (string) $dashboard->headers->get('Cache-Control'),
        );

        $candidateResults = collect($dashboard->json('candidate_results'));
        $this->assertSame(
            1,
            $candidateResults->firstWhere(
                'student_id',
                $presidentCandidate['student_id'],
            )['votes'],
        );
        $this->assertSame(
            1,
            $candidateResults->firstWhere(
                'student_id',
                $vicePresidentCandidate['student_id'],
            )['votes'],
        );

        $this->postJson('/api/voter/login', [
            'student_id' => '20240100',
            'password' => 'PersonalPassword123!',
        ])->assertOk()->assertJsonPath('tally_only', true);

        $student = Student::findOrFail('20240100');
        $this->assertSame(1, $student->tokens()->count());
        $this->assertSame(1, User::where('email', 'admin@ssg.local')->count());
    }
}
