<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

class DemoDataTransfer extends Command
{
    protected $signature = 'demo:transfer {action : export or import} {file? : Private JSON export file} {--force : Confirm import into an empty target database}';

    protected $description = 'Transfer demo accounts and election records between database drivers without copying login sessions';

    private const TABLES = ['users', 'students', 'elections', 'positions', 'candidate_profiles', 'candidacies', 'partylists', 'voter_ballot_ids', 'voter_participations', 'ballots', 'votes', 'election_demo_batches', 'election_student'];

    public function handle(): int
    {
        try {
            $action = $this->argument('action');
            if (! in_array($action, ['export', 'import'], true)) {
                throw new RuntimeException('Choose export or import.');
            }
            $file = $this->argument('file') ?? storage_path('app/private/voting-demo-'.gmdate('Ymd-His').'.json');
            if ($action === 'export') {
                $this->export($file);
            } else {
                $this->import($file);
            }
        } catch (Throwable $error) {
            $this->error($error->getMessage());

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function export(string $file): void
    {
        $directory = dirname($file);
        if (! is_dir($directory) && ! mkdir($directory, 0700, true)) {
            throw new RuntimeException('Could not create the private export directory.');
        }
        $resolved = str_replace('\\', '/', realpath($directory));
        foreach ([public_path(), storage_path('app/public')] as $publicDirectory) {
            $public = str_replace('\\', '/', realpath($publicDirectory) ?: $publicDirectory);
            if (strtolower($resolved) === strtolower($public) || str_starts_with(strtolower($resolved).'/', strtolower($public).'/')) {
                throw new RuntimeException('Exports contain password hashes and must not be saved in public or uploaded-file directories.');
            }
        }
        if (file_exists($file)) {
            throw new RuntimeException('This export file already exists. Choose another private filename.');
        }
        $tables = DB::transaction(function (): array {
            $tables = [];
            foreach (self::TABLES as $table) {
                $tables[$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
            }

            return $tables;
        });
        $json = json_encode(['version' => 1, 'app_key_fingerprint' => hash('sha256', config('app.key') ?? ''), 'tables' => $tables], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        if (file_put_contents($file, $json, LOCK_EX) === false) {
            throw new RuntimeException('Could not write the export.');
        }
        chmod($file, 0600);
        $this->info('Private export saved: '.$file);
        $this->warn('Contains password hashes. Keep it private and out of Git. Uploads and login sessions are not included.');
    }

    private function import(string $file): void
    {
        if (! $this->option('force')) {
            throw new RuntimeException('Import requires --force and an empty target database.');
        }
        $payload = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        if (($payload['version'] ?? null) !== 1 || array_keys($payload['tables'] ?? []) !== self::TABLES) {
            throw new RuntimeException('This is not a supported voting demo export.');
        }
        if (! hash_equals($payload['app_key_fingerprint'] ?? '', hash('sha256', config('app.key') ?? ''))) {
            throw new RuntimeException('Use the source application APP_KEY before importing encrypted records.');
        }
        DB::transaction(function () use ($payload): void {
            foreach (self::TABLES as $table) {
                if (DB::table($table)->exists()) {
                    throw new RuntimeException('Target table '.$table.' is not empty. No records were imported.');
                }
            }
            foreach (self::TABLES as $table) {
                $booleans = collect(Schema::getColumns($table))->filter(fn ($column) => in_array($column['type_name'], ['bool', 'boolean'], true))->pluck('name')->all();
                foreach (array_chunk($payload['tables'][$table], 100) as $rows) {
                    foreach ($rows as &$row) {
                        foreach ($booleans as $column) {
                            if (array_key_exists($column, $row) && $row[$column] !== null) {
                                $row[$column] = (bool) $row[$column];
                            }
                        }
                    }
                    unset($row);
                    DB::table($table)->insert($rows);
                }
                if (DB::getDriverName() === 'pgsql' && Schema::hasColumn($table, 'id')) {
                    $sequence = DB::selectOne("SELECT pg_get_serial_sequence(?, 'id') AS name", [$table])->name;
                    if ($sequence) {
                        $maximum = DB::table($table)->max('id');
                        DB::selectOne('SELECT setval(?::regclass, ?, ?)', [$sequence, $maximum ?? 1, $maximum !== null]);
                    }
                }
                $this->line($table.': '.count($payload['tables'][$table]).' records');
            }
        });
        $this->info('Demo imported. Accounts keep their existing passwords. No voter submissions or sessions were created.');
    }
}
