<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterParticipation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class CommitteeSectionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::create(['name' => 'Committee', 'email' => 'sections@test.local', 'password' => 'SecureTest123!', 'role' => 'committee']), ['committee']);
    }

    private function section(array $overrides = []): int
    {
        return $this->postJson('/api/committee/sections', [...['course' => 'BSIT', 'year_level' => 1, 'name' => '1D'], ...$overrides])
            ->assertCreated()->json('data.id');
    }

    private function file(array $rows, ?array $headers = null): UploadedFile
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class list');
        $sheet->fromArray($headers ?? ['Student ID', 'Full Name', 'Course', 'Year Level', 'Section', 'Academic Status'], null, 'A1');
        foreach ($rows as $index => $row) {
            foreach ($row as $column => $value) {
                $sheet->setCellValueExplicit([$column + 1, $index + 2], $value ?? '', DataType::TYPE_STRING);
            }
        }
        $path = tempnam(sys_get_temp_dir(), 'section-test-');
        (new Xlsx($book))->save($path);
        $book->disconnectWorksheets();

        return new UploadedFile($path, 'class-list.xlsx', null, null, true);
    }

    public function test_empty_sections_are_saved_and_duplicate_names_are_scoped_to_course_and_year(): void
    {
        $id = $this->section();
        $this->getJson('/api/committee/sections')->assertOk()->assertJsonPath('data.0.id', $id)->assertJsonPath('data.0.student_count', 0);
        $this->section(['course' => 'BSHM']);
        $this->section(['year_level' => 2]);
        $this->postJson('/api/committee/sections', ['course' => ' bsit ', 'year_level' => 1, 'name' => '1d'])->assertUnprocessable();
        $this->postJson('/api/committee/sections', ['course' => 'BSIT', 'year_level' => 5, 'name' => '5A'])->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
    }

    public function test_section_counts_and_student_lists_respect_the_election_roster_and_legacy_year_formats(): void
    {
        $id = $this->section();
        $election = Election::create(['name' => 'Current', 'status' => 'draft', 'uses_voter_roster' => true]);
        $future = Election::create(['name' => 'Future', 'status' => 'draft', 'uses_voter_roster' => true]);
        foreach (['1', '1st Year', 'Year 1'] as $index => $year) {
            $student = Student::createDataRecord(['student_id' => 'COUNT-'.$index, 'full_name' => 'Student '.$index, 'course' => 'bsit', 'year_level' => $year, 'section' => '1d', 'academic_status' => 'enrolled']);
            ($index === 2 ? $future : $election)->voters()->attach($student->student_id);
        }
        $this->getJson('/api/committee/sections?election_id='.$election->id)->assertOk()->assertJsonPath('data.0.student_count', 2);
        $this->getJson('/api/committee/students?election_id='.$election->id.'&section_id='.$id)->assertOk()->assertJsonPath('total', 2);
        $this->getJson('/api/committee/sections?election_id='.$future->id)->assertOk()->assertJsonPath('data.0.student_count', 1);
    }

    public function test_excel_export_contains_only_the_selected_section_roster_and_real_attendance_with_safe_text_cells(): void
    {
        $id = $this->section();
        $election = Election::create(['name' => 'Export election', 'status' => 'draft', 'uses_voter_roster' => true]);
        foreach (['001234' => '1D', 'OTHER' => '2A'] as $studentId => $section) {
            Student::createDataRecord(['student_id' => $studentId, 'full_name' => '=SUM(1,2)', 'course' => 'BSIT', 'year_level' => '1st Year', 'section' => $section, 'academic_status' => 'enrolled']);
            $election->voters()->attach($studentId);
        }
        VoterParticipation::create(['student_id' => '001234', 'election_id' => $election->id, 'voted_at' => '2026-11-27 10:30:00']);
        $response = $this->get('/api/committee/sections/'.$id.'/export?election_id='.$election->id)->assertOk();
        $path = tempnam(sys_get_temp_dir(), 'section-export-');
        file_put_contents($path, $response->streamedContent());
        $book = IOFactory::load($path);
        $sheet = $book->getActiveSheet();
        $this->assertSame(2, $sheet->getHighestRow());
        $this->assertSame('001234', $sheet->getCell('A2')->getValue());
        $this->assertSame(DataType::TYPE_STRING, $sheet->getCell('B2')->getDataType());
        $this->assertSame('=SUM(1,2)', $sheet->getCell('B2')->getValue());
        $this->assertSame('Already Voted', $sheet->getCell('G2')->getValue());
        $this->assertSame('Recorded', $sheet->getCell('H2')->getValue());
        $this->assertStringContainsString('PHT', $sheet->getCell('I2')->getValue());
        $book->disconnectWorksheets();
        unlink($path);
        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_section_import_fills_missing_class_details_and_ignores_exported_attendance_without_creating_access(): void
    {
        $id = $this->section();
        $election = Election::create(['name' => 'Import election', 'status' => 'draft', 'uses_voter_roster' => true]);
        $file = $this->file([['00007', 'New Student', '', '', '', 'enrolled', 'Already Voted', 'Recorded', 'Fake timestamp']], ['Student ID', 'Full Name', 'Course', 'Year Level', 'Section', 'Academic Status', 'Voting Status', 'Attendance', 'Attendance Time']);
        $preview = $this->postJson('/api/committee/class-list/preview', ['file' => $file, 'section_id' => $id, 'election_id' => $election->id])->assertOk()->assertJsonPath('summary.new', 1)->assertJsonPath('rows.0.section', '1D');
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('inserted', 1);
        $this->assertDatabaseHas('students', ['student_id' => '00007', 'course' => 'BSIT', 'year_level' => '1st Year', 'section' => '1D', 'password' => null, 'password_change_required' => false]);
        $this->assertDatabaseCount('voter_participations', 0);
        $this->assertDatabaseCount('votes', 0);
    }

    public function test_mismatched_imports_are_blocked_and_cannot_move_existing_students_between_sections(): void
    {
        $id = $this->section();
        Student::createDataRecord(['student_id' => 'EXISTS', 'full_name' => 'Existing', 'course' => 'BSHM', 'year_level' => '1', 'section' => '1D', 'academic_status' => 'enrolled']);
        foreach ([['NEW', 'Wrong class', 'BSIT', '2', '2A', 'enrolled'], ['EXISTS', 'Existing', '', '', '', 'enrolled']] as $row) {
            $this->postJson('/api/committee/class-list/preview', ['file' => $this->file([$row]), 'section_id' => $id])
                ->assertOk()->assertJsonPath('summary.invalid', 1)->assertJsonPath('import_id', null);
        }
        $this->assertDatabaseCount('students', 1);
        $this->assertDatabaseHas('students', ['student_id' => 'EXISTS', 'course' => 'BSHM']);
    }

    public function test_missing_existing_class_details_can_be_organized_without_overwriting_accounts_or_attendance(): void
    {
        $id = $this->section();
        $election = Election::create(['name' => 'Organize', 'status' => 'draft', 'uses_voter_roster' => true]);
        $student = Student::create(['student_id' => 'ACCOUNT', 'full_name' => 'Original Name', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'password_change_required' => false]);
        $password = $student->password;
        $election->voters()->attach($student->student_id);
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
        $preview = $this->postJson('/api/committee/class-list/preview', ['file' => $this->file([['ACCOUNT', 'Different name', '', '', '', 'stopped']]), 'section_id' => $id, 'election_id' => $election->id])
            ->assertOk()->assertJsonPath('summary.organize', 1);
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('organized', 1);
        $this->assertDatabaseHas('students', ['student_id' => 'ACCOUNT', 'course' => 'BSIT', 'year_level' => '1st Year', 'section' => '1D', 'full_name' => 'Original Name', 'academic_status' => 'enrolled', 'password' => $password, 'password_change_required' => false]);
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('organized', 1)->assertJsonPath('already_committed', true);
        $this->assertDatabaseCount('voter_participations', 1);
    }

    public function test_commit_rechecks_section_conflicts_and_rolls_back_the_entire_import(): void
    {
        $id = $this->section();
        $preview = $this->postJson('/api/committee/class-list/preview', ['file' => $this->file([['FIRST', 'First', '', '', '', 'enrolled'], ['RACE', 'Race', '', '', '', 'enrolled']]), 'section_id' => $id])->assertOk();
        Student::createDataRecord(['student_id' => 'RACE', 'full_name' => 'Other class', 'course' => 'BSIT', 'year_level' => '2', 'section' => '2D', 'academic_status' => 'enrolled']);
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertUnprocessable();
        $this->assertDatabaseMissing('students', ['student_id' => 'FIRST']);
    }

    public function test_admins_cannot_access_committee_section_management_or_export(): void
    {
        $id = $this->section();
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'not-committee@test.local', 'password' => 'SecureTest123!', 'role' => 'admin']), ['admin']);
        $this->getJson('/api/committee/sections')->assertForbidden();
        $this->postJson('/api/committee/sections', ['course' => 'BSIT', 'year_level' => 1, 'name' => '1A'])->assertForbidden();
        $this->getJson('/api/committee/sections/'.$id.'/export')->assertForbidden();
    }

    public function test_every_accepted_year_format_is_included_in_section_counts_roster_and_export(): void
    {
        $id = $this->section();
        foreach (['1', '1st', '1st year', '1 year', 'year 1', 'year 1st', 'year 1st year', 'year 1 year'] as $index => $year) {
            Student::createDataRecord(['student_id' => 'YEAR-'.$index, 'full_name' => 'Student '.$index, 'course' => 'BSIT', 'year_level' => $year, 'section' => '1D', 'academic_status' => 'enrolled']);
        }
        $this->getJson('/api/committee/sections')->assertOk()->assertJsonPath('data.0.student_count', 8);
        $this->getJson('/api/committee/students?section_id='.$id)->assertOk()->assertJsonPath('total', 8);
        $path = tempnam(sys_get_temp_dir(), 'section-years-');
        file_put_contents($path, $this->get('/api/committee/sections/'.$id.'/export')->assertOk()->streamedContent());
        $book = IOFactory::load($path);
        $this->assertSame(9, $book->getActiveSheet()->getHighestRow());
        $this->assertSame('Not Voted', $book->getActiveSheet()->getCell('G2')->getValue());
        $this->assertSame('Not recorded', $book->getActiveSheet()->getCell('H2')->getValue());
        $book->disconnectWorksheets();
        unlink($path);
    }

    public function test_invalid_section_field_types_return_validation_errors(): void
    {
        foreach ([['course' => ['BSIT']], ['name' => ['1D']]] as $override) {
            $this->postJson('/api/committee/sections', [...['course' => 'BSIT', 'year_level' => 1, 'name' => '1D'], ...$override])->assertUnprocessable();
        }
    }

    public function test_section_migration_backfills_existing_classes_without_changing_student_records(): void
    {
        foreach ([['A', 'bsit', '1', '1d'], ['B', 'BSIT', '1st Year', '1D'], ['C', 'BSHM', '2nd Year', '2A'], ['D', null, null, null]] as [$id, $course, $year, $section]) {
            Student::createDataRecord(['student_id' => $id, 'full_name' => 'Student '.$id, 'course' => $course, 'year_level' => $year, 'section' => $section, 'academic_status' => 'enrolled']);
        }
        $before = Student::orderBy('student_id')->get()->map(fn ($student) => $student->getAttributes())->all();
        $migration = require database_path('migrations/2026_11_27_000000_create_class_sections_table.php');
        $migration->down();
        $migration->up();
        $this->assertDatabaseCount('class_sections', 2);
        $this->assertSame($before, Student::orderBy('student_id')->get()->map(fn ($student) => $student->getAttributes())->all());
        $this->getJson('/api/committee/sections')->assertOk()->assertJsonPath('unassigned_count', 1);
    }

    public function test_course_navigation_includes_saved_sections_and_students_without_sections(): void
    {
        $this->section(['course' => 'BSIT']);
        Student::createDataRecord(['student_id' => 'COURSE-ONLY', 'full_name' => 'Student', 'course' => ' bshm ', 'academic_status' => 'enrolled']);
        Student::createDataRecord(['student_id' => 'NO-COURSE', 'full_name' => 'Student', 'course' => null, 'academic_status' => 'enrolled']);
        $this->getJson('/api/committee/courses')->assertOk()->assertExactJson(['data' => ['BSHM', 'BSIT']]);
        $this->assertDatabaseCount('class_sections', 1);
        Sanctum::actingAs(User::create(['name' => 'Admin', 'email' => 'courses-admin@test.local', 'password' => 'SecureTest123!', 'role' => 'admin']), ['admin']);
        $this->getJson('/api/committee/courses')->assertForbidden();
    }
}
