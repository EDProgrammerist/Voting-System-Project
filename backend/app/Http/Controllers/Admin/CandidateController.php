<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CandidateProfile;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Position;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class CandidateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
        ]);

        $candidates = Candidacy::query()
            ->where('election_id', $validated['election_id'])
            ->with([
                'profile',
                'position',
            ])
            ->get()
            ->map(function (Candidacy $candidacy): array {
                return [
                    'student_id' => $candidacy->student_id,
                    'full_name' => $candidacy->profile->full_name,
                    'profile_photo_url' => $candidacy->profile->profile_photo
                        ? url(Storage::url($candidacy->profile->profile_photo))
                        : null,
                    'motto' => $candidacy->profile->motto,
                    'team' => $candidacy->team,
                    'position' => [
                        'id' => $candidacy->position->id,
                        'name' => $candidacy->position->name,
                    ],
                ];
            });

        return response()->json([
            'data' => $candidates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'exists:students,student_id',
            ],
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
            'position_id' => [
                'required',
                'integer',
                'exists:positions,id',
            ],
            'team' => [
                'required',
                Rule::in([
                    'TEAM_A',
                    'TEAM_B',
                ]),
            ],
            'motto' => [
                'nullable',
                'string',
                'max:255',
            ],
            'profile_photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $election = Election::findOrFail($validated['election_id']);

        if ($student->academic_status !== 'enrolled') {
            return response()->json([
                'message' => 'Only currently enrolled students can be registered as candidates.',
            ], 422);
        }

        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Candidates can only be changed while the election is in draft status.',
            ], 409);
        }

        $positionBelongsToElection = Position::query()
            ->whereKey($validated['position_id'])
            ->where('election_id', $election->id)
            ->exists();

        if (! $positionBelongsToElection) {
            return response()->json([
                'message' => 'The selected position does not belong to this election.',
            ], 422);
        }

        $photoPath = null;
        $oldPhotoPath = null;

        if ($request->hasFile('profile_photo')) {
            $photoPath = $request
                ->file('profile_photo')
                ->store('candidates', 'public');
        }

        try {
            DB::transaction(function () use (
                $student,
                $validated,
                $photoPath,
                &$oldPhotoPath,
            ): void {
                $profile = CandidateProfile::firstOrNew([
                    'student_id' => $student->student_id,
                ]);

                $profile->full_name = $student->full_name;
                $profile->motto = $validated['motto'] ?? $profile->motto;

                if ($photoPath) {
                    $oldPhotoPath = $profile->profile_photo;
                    $profile->profile_photo = $photoPath;
                }

                $profile->save();

                Candidacy::updateOrCreate(
                    [
                        'election_id' => $validated['election_id'],
                        'student_id' => $student->student_id,
                    ],
                    [
                        'position_id' => $validated['position_id'],
                        'team' => $validated['team'],
                    ],
                );
            });
        } catch (Throwable $exception) {
            if ($photoPath) {
                Storage::disk('public')->delete($photoPath);
            }

            throw $exception;
        }

        if ($photoPath && $oldPhotoPath) {
            Storage::disk('public')->delete($oldPhotoPath);
        }

        return response()->json([
            'message' => 'Candidate saved successfully.',
        ], 201);
    }
}