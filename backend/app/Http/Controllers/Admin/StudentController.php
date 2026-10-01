<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $students = Student::query()
            ->when(
                $request->filled('status'),
                function ($query) use ($request): void {
                    $query->where(
                        'academic_status',
                        $request->string('status')->toString(),
                    );
                },
            )
            ->when(
                $request->filled('search'),
                function ($query) use ($request): void {
                    $search = trim(
                        $request->string('search')->toString(),
                    );

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