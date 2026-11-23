<?php

namespace App\Http\Controllers\Committee;

use App\Http\Controllers\Controller;
use App\Models\ClassListImport;
use App\Models\Election;
use App\Models\Student;
use App\Support\ClassListReader;
use App\Support\VoterElection;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClassListImportController extends Controller
{
    private function upload(Request $request): UploadedFile
    {
        $request->validate(['file' => ['required', 'file', 'max:5120', 'extensions:xlsx,xls']]);

        return $request->file('file');
    }

    public function inspect(Request $request, ClassListReader $reader): JsonResponse
    {
        return response()->json(['worksheets' => $reader->inspect($this->upload($request)), 'headers' => ClassListReader::HEADERS, 'max_rows' => ClassListReader::MAX_ROWS]);
    }

    public function preview(Request $request, ClassListReader $reader): JsonResponse
    {
        $file = $this->upload($request);
        $data = $request->validate(['worksheet' => ['nullable', 'string', 'max:255'], 'header_row' => ['nullable', 'integer', 'between:1,20'], 'election_id' => ['nullable', 'integer', 'exists:elections,id']]);
        $election = isset($data['election_id']) ? Election::findOrFail($data['election_id']) : VoterElection::current();
        $layout = isset($data['worksheet'], $data['header_row'])
            ? ['worksheet' => $data['worksheet'], 'header_row' => (int) $data['header_row']]
            : $reader->detectLayout($file, $data['worksheet'] ?? null);
        $result = $reader->preview($file, $layout['worksheet'], $layout['header_row']);
        if ($election?->uses_voter_roster) {
            $registered = Student::forElection($election)->whereIn('student_id', array_column($result['rows'], 'student_id'))->pluck('student_id')->map(fn ($id) => strtolower($id))->flip();
            foreach ($result['rows'] as &$row) {
                if ($row['status'] === 'existing' && ! $registered->has(strtolower($row['student_id']))) {
                    $row['status'] = 'new';
                }
            }
            unset($row);
            $result['summary']['new'] = count(array_filter($result['rows'], fn ($row) => $row['status'] === 'new'));
            $result['summary']['existing'] = count(array_filter($result['rows'], fn ($row) => $row['status'] === 'existing'));
        }
        ClassListImport::where('expires_at', '<', now())->whereNull('committed_at')->delete();
        $draft = null;
        if (! $result['issues'] && $result['summary']['new'] > 0) {
            $draft = ClassListImport::create([
                'user_id' => $request->user()->id, 'file_name' => mb_substr(basename($file->getClientOriginalName()), 0, 200),
                'file_hash' => hash_file('sha256', $file->getRealPath()), 'records' => ['election_id' => $election?->id, 'rows' => $result['rows'], 'numeric_ids_need_review' => count($result['warnings']) > 0], 'expires_at' => now()->addMinutes(30),
            ]);
        }

        return response()->json([...$result, 'layout' => $layout, 'import_id' => $draft?->id, 'expires_at' => $draft?->expires_at])->header('Cache-Control', 'no-store');
    }

    public function commit(Request $request, string $import): JsonResponse
    {
        try {
            $result = DB::transaction(function () use ($request, $import): array {
                $draft = ClassListImport::whereKey($import)->where('user_id', $request->user()->id)->lockForUpdate()->first();
                if (! $draft) {
                    abort(404, 'This import preview is unavailable. Upload and preview the file again.');
                }
                if ($draft->committed_at) {
                    return ['inserted' => $draft->inserted_count, 'skipped' => $draft->skipped_count, 'already_committed' => true];
                }
                if ($draft->expires_at->isPast() || ! $draft->records) {
                    throw ValidationException::withMessages(['import' => 'This preview has expired. Upload the file and preview it again.']);
                }
                $payload = $draft->records;
                $election = isset($payload['election_id']) ? Election::findOrFail($payload['election_id'])
                    : (array_key_exists('election_id', $payload) ? null : VoterElection::current());
                if (($payload['numeric_ids_need_review'] ?? false) && ! $request->boolean('numeric_ids_confirmed')) {
                    throw ValidationException::withMessages(['numeric_ids_confirmed' => 'Check the numeric Student IDs and confirm that their leading zeros are correct.']);
                }
                $inserted = 0;
                $skipped = 0;
                foreach ($payload['rows'] as $row) {
                    $attributes = collect($row)->only(['full_name', 'course', 'year_level', 'section', 'academic_status'])->all();
                    $student = Student::whereKey($row['student_id'])->lockForUpdate()->first();
                    if ($student) {
                        if ($election?->uses_voter_roster && ! $student->isRegisteredFor($election)) {
                            $election->voters()->attach($student->student_id);
                            $inserted++;

                            continue;
                        }
                        $skipped++;

                        continue;
                    }
                    $student = Student::createDataRecord(['student_id' => $row['student_id'], ...$attributes]);
                    if ($election?->uses_voter_roster) {
                        $election->voters()->attach($student->student_id);
                    }
                    $inserted++;
                }
                $draft->update(['inserted_count' => $inserted, 'skipped_count' => $skipped, 'committed_at' => now(), 'records' => null]);

                return ['inserted' => $inserted, 'skipped' => $skipped, 'already_committed' => false];
            }, 3);
        } catch (QueryException) {
            return response()->json(['message' => 'The import could not be saved. No student records were changed. Please preview the file again and retry.'], 409);
        }

        return response()->json(['message' => $result['already_committed'] ? 'This preview was already imported. No records were added again.' : 'Class-list records imported. No login credentials were created.', ...$result])->header('Cache-Control', 'no-store');
    }
}
