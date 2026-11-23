<?php

namespace Tests\Feature;

use App\Models\Election;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DemoDataTransferTest extends TestCase
{
    use RefreshDatabase;

    private string $file;

    protected function setUp(): void
    {
        parent::setUp();
        $this->file = storage_path('framework/testing/transfer-'.Str::uuid().'.json');
    }

    protected function tearDown(): void
    {
        if (is_file($this->file)) {
            unlink($this->file);
        }
        parent::tearDown();
    }

    public function test_export_and_import_preserve_accounts_and_rosters_without_copying_sessions(): void
    {
        $user = User::create(['name' => 'Test Admin', 'email' => 'transfer@example.test', 'password' => 'PersonalPassword123!']);
        $user->createToken('admin-session', ['admin']);
        $student = Student::create(['student_id' => '2024-0100', 'full_name' => 'Test Student', 'academic_status' => 'enrolled', 'password' => 'PersonalPassword123!']);
        $election = Election::create(['name' => 'SSG Election 2026', 'status' => 'draft', 'uses_voter_roster' => true]);
        $election->voters()->attach($student->student_id);
        $password = $student->getRawOriginal('password');
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => $this->file])->assertSuccessful();
        $payload = json_decode(file_get_contents($this->file), true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayNotHasKey('personal_access_tokens', $payload['tables']);
        DB::table('personal_access_tokens')->delete();
        foreach (array_reverse(array_keys($payload['tables'])) as $table) {
            DB::table($table)->delete();
        }

        $this->artisan('demo:transfer', ['action' => 'import', 'file' => $this->file, '--force' => true])->assertSuccessful();

        $this->assertSame($password, Student::findOrFail('2024-0100')->getRawOriginal('password'));
        $this->assertSame(1, Election::findOrFail($election->id)->voters()->count());
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseHas('users', ['email' => 'transfer@example.test']);
    }

    public function test_import_refuses_to_overwrite_an_existing_database(): void
    {
        Student::create(['student_id' => 'EXISTING', 'full_name' => 'Preserve me', 'academic_status' => 'enrolled']);
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => $this->file])->assertSuccessful();
        $this->artisan('demo:transfer', ['action' => 'import', 'file' => $this->file, '--force' => true])->assertFailed();
        $this->assertDatabaseCount('students', 1);
    }

    public function test_export_refuses_to_publish_password_hashes_in_the_public_directory(): void
    {
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => public_path('unsafe-demo.json')])->assertFailed();
        $this->assertFileDoesNotExist(public_path('unsafe-demo.json'));
    }

    public function test_import_requires_an_explicit_force_option(): void
    {
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => $this->file])->assertSuccessful();
        $this->artisan('demo:transfer', ['action' => 'import', 'file' => $this->file])->assertFailed();
    }

    public function test_export_refuses_the_public_upload_disk(): void
    {
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => storage_path('app/public/unsafe-demo.json')])->assertFailed();
        $this->assertFileDoesNotExist(storage_path('app/public/unsafe-demo.json'));
    }

    public function test_import_refuses_a_different_application_encryption_key(): void
    {
        $this->artisan('demo:transfer', ['action' => 'export', 'file' => $this->file])->assertSuccessful();
        config(['app.key' => 'different-key']);
        $this->artisan('demo:transfer', ['action' => 'import', 'file' => $this->file, '--force' => true])->assertFailed();
        $this->assertDatabaseCount('students', 0);
    }
}
