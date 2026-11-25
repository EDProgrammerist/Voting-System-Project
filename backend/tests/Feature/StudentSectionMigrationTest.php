<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Student;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StudentSectionMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_sections_match_known_year_levels_without_changing_other_student_or_attendance_data(): void
    {
        $examples = [
            ['1st Year', 'A', '1D'],
            ['2', 'B', '2D'],
            [' 3RD YEAR ', null, '3D'],
            ['Year 4', 'D', '4D'],
            ['1st', 'Old section', '1D'],
            ['year2', 'A', '2D'],
            [null, 'Original section', 'Original section'],
            ['Not specified', null, null],
            ['5th Year', '5A', '5A'],
        ];
        foreach ($examples as $index => [$year, $section]) {
            Student::createDataRecord([
                'student_id' => 'SECTION-'.$index,
                'full_name' => 'Test Student '.$index,
                'academic_status' => 'enrolled',
                'course' => 'BSIT',
                'year_level' => $year,
                'section' => $section,
            ]);
        }
        Student::findOrFail('SECTION-0')->forceFill([
            'password' => 'SecureStudent123!',
            'password_change_required' => true,
        ])->save();
        $election = Election::create(['name' => 'Test election', 'status' => 'draft']);
        VoterParticipation::create(['student_id' => 'SECTION-0', 'election_id' => $election->id, 'voted_at' => now()]);
        $before = DB::table('students')->orderBy('student_id')->get()->map(fn ($row) => collect($row)->except('section')->all())->all();
        $attendance = DB::table('voter_participations')->get()->toJson();

        $migration = require database_path('migrations/2026_11_25_000000_normalize_student_sections_by_year_level.php');
        $migration->up();
        foreach ($examples as $index => [, , $expected]) {
            $this->assertSame($expected, Student::findOrFail('SECTION-'.$index)->section);
        }
        $migration->up();
        $after = DB::table('students')->orderBy('student_id')->get()->map(fn ($row) => collect($row)->except('section')->all())->all();
        $this->assertSame($before, $after);
        $this->assertSame($attendance, DB::table('voter_participations')->get()->toJson());
        $this->assertDatabaseCount('students', count($examples));
    }
}
