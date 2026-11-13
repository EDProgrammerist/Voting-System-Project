<?php

namespace Tests\Feature;

use App\Models\ClassListImport;
use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use App\Models\VoterBallotId;
use App\Models\VoterParticipation;
use App\Support\ClassListReader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class CommitteeClassListTest extends TestCase
{
    use RefreshDatabase;

    private function member(string $email = 'committee-test@example.test'): User
    {
        return User::create(['name' => 'Test Committee', 'email' => $email, 'password' => 'CommitteeTest123!', 'role' => 'committee']);
    }

    private function file(array $rows, string $format = 'Xlsx', ?array $headers = null): UploadedFile
    {
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class list');
        $sheet->fromArray($headers ?? ClassListReader::HEADERS, null, 'A1');
        foreach ($rows as $index => $row) {
            foreach ($row as $col => $value) {
                $sheet->setCellValueExplicit([$col + 1, $index + 2], $value, DataType::TYPE_STRING);
            }
        }
        $path = tempnam(sys_get_temp_dir(), 'class-test-');
        $class = 'PhpOffice\\PhpSpreadsheet\\Writer\\'.$format;
        (new $class($book))->save($path);
        $book->disconnectWorksheets();

        return new UploadedFile($path, 'class-list.'.strtolower($format), null, null, true);
    }

    private function preview(UploadedFile $file)
    {
        return $this->postJson('/api/committee/class-list/preview', ['file' => $file, 'worksheet' => 'Class list', 'header_row' => 1]);
    }

    public function test_committee_login_is_separate_and_role_checks_prevent_privilege_escalation(): void
    {
        $member = $this->member();
        $admin = User::create(['name' => 'Admin', 'email' => 'test-admin@example.test', 'password' => 'AdminTest123!']);
        $token = $this->postJson('/api/committee/login', ['email' => $member->email, 'password' => 'CommitteeTest123!'])->assertOk()->assertJsonPath('committee.role', 'committee')->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/committee/students')->assertOk();
        $this->withToken($token)->getJson('/api/admin/elections')->assertForbidden();
        $this->postJson('/api/admin/login', ['email' => $member->email, 'password' => 'CommitteeTest123!'])->assertUnauthorized();
        $this->postJson('/api/committee/login', ['email' => $admin->email, 'password' => 'AdminTest123!'])->assertUnauthorized();
        $this->withToken($token)->postJson('/api/committee/logout')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/committee/students')->assertUnauthorized();
        Sanctum::actingAs($member, ['admin']);
        $this->getJson('/api/admin/elections')->assertForbidden();
        Sanctum::actingAs($admin, ['committee']);
        $this->getJson('/api/committee/students')->assertForbidden();
    }

    public function test_preview_and_commit_preserve_text_ids_and_never_generate_credentials(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $file = $this->file([['001234', 'Sample Student', 'bsit', '1', 'A', 'enrolled'], ['002345', 'Another Student', 'BSHM', '2', 'B', '']]);
        $this->postJson('/api/committee/class-list/inspect', ['file' => $file])->assertOk()->assertJsonPath('worksheets.0.name', 'Class list');
        $preview = $this->preview($file)->assertOk()->assertJsonPath('summary.new', 2)->assertJsonPath('rows.0.student_id', '001234');
        $this->assertDatabaseCount('students', 0);
        $draft = ClassListImport::sole();
        $this->assertStringNotContainsString('Sample Student', $draft->getRawOriginal('records'));
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('inserted', 2)->assertJsonPath('skipped', 0);
        $this->assertDatabaseHas('students', ['student_id' => '001234', 'course' => 'BSIT', 'year_level' => '1', 'section' => 'A', 'password' => null, 'password_change_required' => false]);
        $this->assertDatabaseCount('users', 1);
        $this->assertNull($draft->fresh()->records);
        $this->postJson('/api/voter/login', ['student_id' => '001234', 'password' => '123456'])->assertUnauthorized();
        $this->postJson('/api/committee/class-list/'.$draft->id.'/commit')->assertOk()->assertJsonPath('already_committed', true);
        $this->assertDatabaseCount('students', 2);
    }

    public function test_existing_students_passwords_and_participation_are_skipped_without_changes(): void
    {
        $student = Student::create(['student_id' => 'OLD001', 'full_name' => 'Original Student', 'course' => 'BSIT', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!', 'password_change_required' => false]);
        $election = Election::create(['name' => 'Existing election', 'status' => 'active']);
        VoterParticipation::create(['student_id' => $student->student_id, 'election_id' => $election->id, 'voted_at' => now()]);
        $reference = VoterBallotId::issue($student, $election);
        $before = $student->fresh()->getAttributes();
        Sanctum::actingAs($this->member(), ['committee']);
        $preview = $this->preview($this->file([['OLD001', 'Changed Name', 'BSHM', '4', 'Changed', 'stopped'], ['NEW001', 'New Student']]))->assertOk()->assertJsonPath('summary.existing', 1)->assertJsonPath('summary.new', 1);
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('inserted', 1)->assertJsonPath('skipped', 1);
        $this->assertEquals($before, $student->fresh()->getAttributes());
        $this->assertDatabaseCount('voter_participations', 1);
        $this->assertDatabaseHas('voter_ballot_ids', ['id' => $reference->id]);
    }

    public function test_invalid_rows_duplicate_ids_and_statuses_block_the_whole_batch(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $preview = $this->preview($this->file([['A001', 'Valid Student'], ['A001', 'Duplicate Student'], ['BAD ID', 'Bad Student', '', '', '', 'unknown']]))->assertOk()->assertJsonPath('import_id', null)->assertJsonPath('summary.invalid', 2);
        $this->assertNotEmpty($preview->json('issues'));
        $this->assertDatabaseCount('students', 0);
        $this->assertDatabaseCount('class_list_imports', 0);
    }

    public function test_unsupported_password_headers_and_corrupt_workbooks_are_rejected(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $this->preview($this->file([['A001', 'Student Name', '123456']], 'Xlsx', ['Student ID', 'Full Name', 'Password']))->assertUnprocessable();
        $this->postJson('/api/committee/class-list/inspect', ['file' => UploadedFile::fake()->createWithContent('fake.xlsx', 'not an excel workbook')])->assertUnprocessable();
        $this->postJson('/api/committee/class-list/inspect', ['file' => UploadedFile::fake()->createWithContent('empty.xlsx', '')])->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
    }

    public function test_legacy_xls_workbooks_are_supported_and_formulas_are_blocked(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $this->preview($this->file([['XLS001', 'Legacy Student']], 'Xls'))->assertOk()->assertJsonPath('rows.0.student_id', 'XLS001');
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class list');
        $sheet->fromArray(['Student ID', 'Full Name'], null, 'A1');
        $sheet->setCellValue('A2', 'FORM001')->setCellValue('B2', '=1+1');
        $path = tempnam(sys_get_temp_dir(), 'formula-test-');
        (new Xlsx($book))->save($path);
        $preview = $this->preview(new UploadedFile($path, 'formula.xlsx', null, null, true))->assertOk()->assertJsonPath('import_id', null);
        $this->assertStringContainsString('Formulas', $preview->json('issues.0.message'));
    }

    public function test_commit_rejects_other_members_and_expired_previews(): void
    {
        $member = $this->member();
        Sanctum::actingAs($member, ['committee']);
        $id = $this->preview($this->file([['A001', 'Student Name']]))->assertOk()->json('import_id');
        Sanctum::actingAs($this->member('other-committee@example.test'), ['committee']);
        $this->postJson('/api/committee/class-list/'.$id.'/commit')->assertNotFound();
        Sanctum::actingAs($member, ['committee']);
        $this->travel(31)->minutes();
        $this->postJson('/api/committee/class-list/'.$id.'/commit')->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
    }

    public function test_template_download_is_removed(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $this->getJson('/api/committee/class-list/template')->assertNotFound();
    }

    public function test_school_class_list_is_detected_and_names_are_organized_without_creating_accounts(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class List');
        $sheet->setCellValue('A1', 'CLASS LIST')->mergeCells('A1:F1');
        $sheet->fromArray(['No.', "STUDENT ID\nNUMBER", 'Lastname', 'Firstname', 'M.I.', 'Course'], null, 'A2');
        $sheet->fromArray([1, '2024-02028', 'Abad', 'Mariel', 'C', 'bsit'], null, 'A3');
        $sheet->fromArray([2, '000123', 'Dela Cruz', 'Mark', '', 'BSIT'], null, 'A4');
        $path = tempnam(sys_get_temp_dir(), 'school-list-');
        (new Xlsx($book))->save($path);
        $file = new UploadedFile($path, 'school.xlsx', null, null, true);
        $preview = $this->postJson('/api/committee/class-list/preview', ['file' => $file])->assertOk()
            ->assertJsonPath('layout.worksheet', 'Class List')->assertJsonPath('layout.header_row', 2)
            ->assertJsonPath('rows.0.full_name', 'Abad, Mariel C.')->assertJsonPath('rows.0.course', 'BSIT')
            ->assertJsonPath('rows.1.student_id', '000123')->assertJsonPath('rows.1.full_name', 'Dela Cruz, Mark')
            ->assertJsonPath('summary.new', 2);
        $this->assertDatabaseCount('students', 0);
        $this->postJson('/api/committee/class-list/'.$preview->json('import_id').'/commit')->assertOk()->assertJsonPath('inserted', 2);
        $this->assertDatabaseHas('students', ['student_id' => '2024-02028', 'full_name' => 'Abad, Mariel C.', 'password' => null]);
        $this->assertDatabaseCount('users', 1);
        $this->getJson('/api/committee/students')->assertOk()->assertJsonPath('data.0.full_name', 'Abad, Mariel C.');
    }

    public function test_autodetection_requires_a_clear_class_list_and_rejects_incomplete_split_names(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $file = $this->file([['000123', 'Abad', '']], 'Xlsx', ['Student ID Number', 'Lastname', 'Firstname']);
        $this->postJson('/api/committee/class-list/preview', ['file' => $file])->assertOk()->assertJsonPath('import_id', null)->assertJsonPath('summary.invalid', 1);
        $this->postJson('/api/committee/class-list/preview', ['file' => $this->file([['000123', 'Name']], 'Xlsx', ['Unclear ID', 'Unclear Name'])])->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
    }

    public function test_numeric_ids_keep_zero_padding_and_warn_before_confirmation(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class list');
        $sheet->fromArray(['Student ID', 'Full Name'], null, 'A1');
        $sheet->setCellValue('A2', 1234)->setCellValue('B2', 'Numeric Student');
        $sheet->getStyle('A2')->getNumberFormat()->setFormatCode('000000');
        $path = tempnam(sys_get_temp_dir(), 'numeric-id-');
        (new Xlsx($book))->save($path);
        $preview = $this->preview(new UploadedFile($path, 'numbers.xlsx', null, null, true))->assertOk()->assertJsonPath('rows.0.student_id', '001234');
        $this->assertNotEmpty($preview->json('warnings'));
        $url = '/api/committee/class-list/'.$preview->json('import_id').'/commit';
        $this->postJson($url)->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
        $this->postJson($url, ['numeric_ids_confirmed' => true])->assertOk()->assertJsonPath('inserted', 1);
        $this->assertDatabaseHas('students', ['student_id' => '001234', 'password' => null]);
    }

    public function test_selected_sheet_header_row_and_repeated_headers_are_validated(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $book = new Spreadsheet;
        $book->getActiveSheet()->setTitle('Notes');
        $sheet = $book->createSheet()->setTitle('BSIT 1A');
        $sheet->fromArray(['Student ID', 'Full Name'], null, 'A3');
        $sheet->fromArray(['0009', 'Header Offset Student'], null, 'A4');
        $path = tempnam(sys_get_temp_dir(), 'sheets-');
        (new Xlsx($book))->save($path);
        $this->postJson('/api/committee/class-list/preview', ['file' => new UploadedFile($path, 'sheets.xlsx', null, null, true), 'worksheet' => 'BSIT 1A', 'header_row' => 3])->assertOk()->assertJsonPath('rows.0.row_number', 4)->assertJsonPath('rows.0.student_id', '0009');
        $this->preview($this->file([['A001', 'B001', 'Duplicate Headers']], 'Xlsx', ['Student ID', 'ID No', 'Full Name']))->assertUnprocessable();
    }

    public function test_failed_commit_rolls_back_every_new_record(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $id = $this->preview($this->file([['OK001', 'First Student'], ['FAIL001', 'Second Student']]))->assertOk()->json('import_id');
        DB::statement("CREATE TRIGGER reject_test_student BEFORE INSERT ON students WHEN NEW.student_id = 'FAIL001' BEGIN SELECT RAISE(ABORT, 'test failure'); END");
        $this->postJson('/api/committee/class-list/'.$id.'/commit')->assertConflict();
        $this->assertDatabaseCount('students', 0);
        $this->assertNull(ClassListImport::find($id)->committed_at);
    }

    public function test_a_record_added_after_preview_is_skipped_on_commit(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $id = $this->preview($this->file([['RACE001', 'Uploaded Student']]))->assertOk()->json('import_id');
        $student = Student::create(['student_id' => 'RACE001', 'full_name' => 'Existing Student', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!']);
        $before = $student->fresh()->getAttributes();
        $this->postJson('/api/committee/class-list/'.$id.'/commit')->assertOk()->assertJsonPath('inserted', 0)->assertJsonPath('skipped', 1);
        $this->assertEquals($before, $student->fresh()->getAttributes());
    }

    public function test_upload_and_row_limits_reject_oversized_class_lists(): void
    {
        Sanctum::actingAs($this->member(), ['committee']);
        $this->postJson('/api/committee/class-list/inspect', ['file' => UploadedFile::fake()->create('large.xlsx', 5121)])->assertUnprocessable();
        $book = new Spreadsheet;
        $sheet = $book->getActiveSheet()->setTitle('Class list');
        $sheet->fromArray(['Student ID', 'Full Name'], null, 'A1');
        $sheet->fromArray(['LAST001', 'Too Many Rows'], null, 'A5002');
        $path = tempnam(sys_get_temp_dir(), 'row-limit-');
        (new Xlsx($book))->save($path);
        $this->preview(new UploadedFile($path, 'many-rows.xlsx', null, null, true))->assertUnprocessable();
        $this->assertDatabaseCount('students', 0);
        $this->assertDatabaseCount('class_list_imports', 0);
    }
}
