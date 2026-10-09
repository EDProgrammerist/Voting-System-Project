<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'nullable',
                'integer',
                'exists:elections,id',
            ],
            'status' => [
                'nullable',
                Rule::in([
                    'enrolled',
                    'graduated',
                    'stopped',
                    'inactive',
                    'withdrawn',
                ]),
            ],
            'search' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $electionId = $validated['election_id']
            ?? Election::currentlyActive()->value('id');

        $students = Student::query()
            ->when(
                $electionId,
                function ($query, int $electionId): void {
                    $query->withExists([
                        'participations as has_voted' => fn ($query) => $query->where('election_id', $electionId),
                    ]);
                },
            )
            ->when(
                isset($validated['status']),
                function ($query) use ($validated): void {
                    $query->where(
                        'academic_status',
                        $validated['status'],
                    );
                },
            )
            ->when(
                isset($validated['search']),
                function ($query) use ($validated): void {
                    $search = trim($validated['search']);

                    $query->where(
                        function ($query) use ($search): void {
                            $query
                                ->where(
                                    'student_id',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'full_name',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )
            ->orderBy('full_name')
            ->paginate(25);

        $students->through(function (Student $student) use ($electionId): array {
            $hasVoted = (bool) ($student->has_voted ?? false);

            return [
                'student_id' => $student->student_id,
                'full_name' => $student->full_name,
                'course' => $student->course,
                'academic_status' => $student->academic_status,
                'election_id' => $electionId,
                'has_voted' => $hasVoted,
                'voting_status' => $student->academic_status !== 'enrolled'
                    ? 'ineligible'
                    : ($hasVoted ? 'voted' : 'not_voted'),
            ];
        });

        return response()->json($students);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'max:50',
                'unique:students,student_id',
            ],
            'full_name' => [
                'required',
                'string',
                'max:255',
            ],
            'course' => [
                'nullable',
                'string',
                'max:100',
            ],
            'academic_status' => [
                'required',
                Rule::in([
                    'enrolled',
                    'graduated',
                    'stopped',
                    'inactive',
                    'withdrawn',
                ]),
            ],
        ]);

        $student = Student::create($validated);

        return response()->json([
            'message' => 'Student created successfully.',
            'data' => $student,
        ], 201);
    }

    public function update(
        Request $request,
        string $studentId,
    ): JsonResponse {
        $student = Student::findOrFail($studentId);

        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'course' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
            ],
            'academic_status' => [
                'sometimes',
                'required',
                Rule::in([
                    'enrolled',
                    'graduated',
                    'stopped',
                    'inactive',
                    'withdrawn',
                ]),
            ],
        ]);

        $student->update($validated);

        if (
            isset($validated['full_name']) &&
            $student->candidateProfile
        ) {
            $student->candidateProfile->update([
                'full_name' => $student->full_name,
            ]);
        }

        return response()->json([
            'message' => 'Student updated successfully.',
            'data' => $student->fresh(),
        ]);
    }
}
