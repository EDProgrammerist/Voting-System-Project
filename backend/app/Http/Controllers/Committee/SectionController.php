<?php

namespace App\Http\Controllers\Committee;

use App\Http\Controllers\Controller;
use App\Models\ClassSection;
use App\Models\Election;
use App\Models\Student;
use App\Support\VoterElection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SectionController extends Controller
{
    public function courses(): JsonResponse
    {
        $courses = ClassSection::query()->distinct()->pluck('course')
            ->merge(Student::query()->whereNotNull('course')->distinct()->pluck('course'))
            ->map(fn ($course) => mb_strtoupper(trim($course)))
            ->filter()->unique()->sort()->values();

        return response()->json(['data' => $courses])->header('Cache-Control', 'no-store');
    }

    private function election(Request $request): ?Election
    {
        $data = $request->validate(['election_id' => ['nullable', 'integer', 'exists:elections,id']]);

        return isset($data['election_id']) ? Election::findOrFail($data['election_id']) : VoterElection::current();
    }

    public function index(Request $request): JsonResponse
    {
        $election = $this->election($request);
        $sections = ClassSection::orderBy('course')->orderBy('year_level')->orderBy('name')->get();
        $counts = [];
        foreach (Student::forElection($election)->get(['course', 'year_level', 'section']) as $student) {
            $key = mb_strtoupper(trim($student->course ?? '')).'|'.ClassSection::year($student->year_level).'|'.mb_strtoupper(trim($student->section ?? ''));
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        $data = $sections->map(function ($section) use (&$counts): array {
            $key = $section->course.'|'.$section->year_level.'|'.$section->name;
            $count = $counts[$key] ?? 0;
            unset($counts[$key]);

            return [...$section->toArray(), 'student_count' => $count];
        });

        return response()->json(['data' => $data, 'unassigned_count' => array_sum($counts)])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['course' => ['required', 'string'], 'name' => ['required', 'string'], 'year_level' => ['required', 'integer', 'between:1,4']]);
        $request->merge(['course' => mb_strtoupper(trim((string) $request->input('course'))), 'name' => mb_strtoupper(trim((string) $request->input('name')))]);
        $data = $request->validate([
            'course' => ['required', 'string', 'max:100', 'regex:/^[\pL\pN][\pL\pN .&()_-]*$/u'],
            'year_level' => ['required', 'integer', 'between:1,4'],
            'name' => ['required', 'string', 'max:100', 'regex:/^[\pL\pN][\pL\pN ._-]*$/u', Rule::unique('class_sections')->where('course', $request->input('course'))->where('year_level', $request->input('year_level'))],
        ]);
        try {
            $section = ClassSection::create($data);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['name' => 'This section already exists for this course and year level.']);
        }

        return response()->json(['data' => [...$section->toArray(), 'student_count' => 0]], 201);
    }

    public function export(Request $request, ClassSection $section): StreamedResponse
    {
        $election = $this->election($request);
        $students = $section->students($election)->with(['participations' => fn ($query) => $query->where('election_id', $election?->id)])->orderBy('full_name')->get();
        $filename = preg_replace('/[^A-Za-z0-9_-]/', '-', $section->course.'-'.$section->name).'-'.($election?->id ?? 'roster').'.xlsx';

        return response()->streamDownload(function () use ($students, $section): void {
            $book = new Spreadsheet;
            try {
                $sheet = $book->getActiveSheet()->setTitle('Class list');
                $rows = [['Student ID', 'Full Name', 'Course', 'Year Level', 'Section', 'Academic Status', 'Voting Status', 'Attendance', 'Attendance Time']];
                foreach ($students as $student) {
                    $participation = $student->participations->first();
                    $rows[] = [$student->student_id, $student->full_name, $section->course, $section->yearLabel(), $section->name, $student->academic_status, $participation ? 'Already Voted' : ($student->academic_status === 'enrolled' ? 'Not Voted' : 'Ineligible'), $participation ? 'Recorded' : 'Not recorded', $participation?->voted_at?->timezone('Asia/Manila')->format('M j, Y, g:i A').' PHT'];
                    if (! $participation) {
                        $rows[array_key_last($rows)][8] = '';
                    }
                }
                foreach ($rows as $index => $row) {
                    foreach ($row as $column => $value) {
                        $sheet->setCellValueExplicit([$column + 1, $index + 1], (string) $value, DataType::TYPE_STRING);
                    }
                }
                $sheet->freezePane('A2');
                $sheet->setAutoFilter('A1:I'.count($rows));
                $sheet->getStyle('A1:I1')->getFont()->setBold(true);
                foreach (range('A', 'I') as $column) {
                    $sheet->getColumnDimension($column)->setAutoSize(true);
                }
                (new Xlsx($book))->save('php://output');
            } finally {
                $book->disconnectWorksheets();
            }
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Cache-Control' => 'no-store']);
    }
}
