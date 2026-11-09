<?php

namespace App\Http\Controllers\Committee;

use App\Http\Controllers\Controller;
use App\Models\ClassListImport;
use App\Models\Student;
use App\Support\ClassListReader;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $data = $request->validate(['worksheet' => ['required', 'string', 'max:255'], 'header_row' => ['required', 'integer', 'between:1,20']]);
        $result = $reader->preview($file, $data['worksheet'], (int) $data['header_row']);
        ClassListImport::where('expires_at', '<', now())->whereNull('committed_at')->delete();
        $draft = null;
        if (! $result['issues'] && $result['summary']['new'] > 0) {
            $draft = ClassListImport::create([
                'user_id' => $request->user()->id, 'file_name' => mb_substr(basename($file->getClientOriginalName()), 0, 200),
                'file_hash' => hash_file('sha256', $file->getRealPath()), 'records' => ['rows' => $result['rows'], 'numeric_ids_need_review' => count($result['warnings']) > 0], 'expires_at' => now()->addMinutes(30),
            ]);
        }

        return response()->json([...$result, 'import_id' => $draft?->id, 'expires_at' => $draft?->expires_at])->header('Cache-Control', 'no-store');
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
                if (($payload['numeric_ids_need_review'] ?? false) && ! $request->boolean('numeric_ids_confirmed')) {
                    throw ValidationException::withMessages(['numeric_ids_confirmed' => 'Check the numeric Student IDs and confirm that their leading zeros are correct.']);
                }
                $inserted = 0;
                $skipped = 0;
                foreach ($payload['rows'] as $row) {
                    $attributes = collect($row)->only(['full_name', 'course', 'year_level', 'section', 'academic_status'])->all();
                    if (Student::whereKey($row['student_id'])->lockForUpdate()->exists()) {
                        $skipped++;

                        continue;
                    }
                    Student::createDataRecord(['student_id' => $row['student_id'], ...$attributes]);
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

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function (): void {
            $book = new Spreadsheet;
            $book->getProperties()->setCreator('CPC Vote')->setTitle('Class list template');
            $sheet = $book->getActiveSheet();
            $sheet->setTitle('Class list');
            foreach (ClassListReader::HEADERS as $index => $header) {
                $sheet->setCellValueExplicit([$index + 1, 1], $header, DataType::TYPE_STRING);
            }
            $sheet->getStyle('A1:F1')->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle('A1:F1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF2459B8');
            $sheet->getStyle('A2:A5001')->getNumberFormat()->setFormatCode('@');
            foreach (['A' => 22, 'B' => 36, 'C' => 18, 'D' => 16, 'E' => 22, 'F' => 22] as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }
            $sheet->getRowDimension(1)->setRowHeight(26);
            $sheet->freezePane('A2');
            $sheet->setAutoFilter('A1:F1');
            $sheet->getComment('A1')->getText()->createTextRun('Required. Keep Student IDs as text to preserve leading zeros.');
            $sheet->getComment('B1')->getText()->createTextRun('Required. Use the student’s full name.');
            $sheet->getComment('F1')->getText()->createTextRun('Optional. enrolled, graduated, stopped, inactive, or withdrawn. Blank values default to enrolled. Existing IDs are skipped.');
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, 'class-list-template.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'no-store']);
    }
}
