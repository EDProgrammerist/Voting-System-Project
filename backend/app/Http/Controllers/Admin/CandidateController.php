<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Models\Partylist;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        $partylists = Partylist::where('election_id', $validated['election_id'])->get()->keyBy('team');
        $candidates = Candidacy::query()
            ->where('election_id', $validated['election_id'])
            ->with([
                'profile',
                'position',
            ])
            ->get()
            ->map(fn (Candidacy $candidacy): array => $this->candidateData($candidacy, $partylists->get($candidacy->team)));

        return response()->json([
            'data' => $candidates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => [
                'nullable',
                'string',
                'exists:candidate_profiles,student_id',
            ],
            'full_name' => ['required', 'string', 'max:255'],
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
            'profile' => ['nullable', 'string', 'max:5000'],
            'achievements' => ['nullable', 'string', 'max:5000'],
            'profile_photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $candidateId = $validated['student_id'] ?? 'C-'.Str::uuid();
        $election = Election::findOrFail($validated['election_id']);

        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Candidates can only be changed while the election is in draft status.',
            ], 409);
        }

        if (isset($validated['student_id'])) {
            $belongsToElection = Candidacy::where('election_id', $election->id)->where('student_id', $candidateId)->exists();
            if (! $belongsToElection) {
                return response()->json(['message' => 'Select a candidate from this election to edit.'], 422);
            }
            if (Candidacy::where('student_id', $candidateId)->whereHas('election', fn ($query) => $query->whereIn('status', ['active', 'closed']))->exists()) {
                return response()->json(['message' => 'This profile belongs to an election that has opened. Add a separate candidate profile for this election.'], 409);
            }
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
                $candidateId,
                $validated,
                $photoPath,
                &$oldPhotoPath,
            ): void {
                $profile = CandidateProfile::firstOrNew([
                    'student_id' => $candidateId,
                ]);

                $profile->full_name = trim($validated['full_name']);
                $profile->motto = $validated['motto'] ?? $profile->motto;
                foreach (['profile', 'achievements'] as $field) {
                    if (array_key_exists($field, $validated)) {
                        $profile->{$field} = $validated[$field];
                    }
                }

                if ($photoPath) {
                    $oldPhotoPath = $profile->profile_photo;
                    $profile->profile_photo = $photoPath;
                }

                $profile->save();

                Candidacy::updateOrCreate(
                    [
                        'election_id' => $validated['election_id'],
                        'student_id' => $candidateId,
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

        $candidacy = Candidacy::query()
            ->where('election_id', $validated['election_id'])
            ->where('student_id', $candidateId)
            ->with([
                'profile',
                'position',
            ])
            ->firstOrFail();

        return response()->json([
            'message' => 'Candidate saved successfully.',
            'data' => $this->candidateData($candidacy, Partylist::where('election_id', $candidacy->election_id)->where('team', $candidacy->team)->first()),
        ], 201);
    }

    public function destroy(
        Request $request,
        string $studentId,
    ): JsonResponse {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
        ]);

        $election = Election::findOrFail($validated['election_id']);

        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Candidates can only be changed while the election is in draft status.',
            ], 409);
        }

        $candidacy = Candidacy::query()
            ->where('election_id', $election->id)
            ->where('student_id', $studentId)
            ->firstOrFail();

        $candidacy->delete();

        return response()->json([
            'message' => 'Candidate removed successfully.',
        ]);
    }

    private function candidateData(Candidacy $candidacy, ?Partylist $partylist = null): array
    {
        return [
            'student_id' => $candidacy->student_id,
            'full_name' => $candidacy->profile->full_name,
            'profile_photo_url' => $candidacy->profile->profile_photo
                ? url(Storage::url($candidacy->profile->profile_photo))
                : null,
            'motto' => $partylist?->platform ?? $candidacy->profile->motto,
            'partylist' => $partylist?->responseData(),
            'profile' => $candidacy->profile->profile,
            'achievements' => $candidacy->profile->achievements,
            'team' => $candidacy->team,
            'position' => [
                'id' => $candidacy->position->id,
                'name' => $candidacy->position->name,
            ],
        ];
    }
}
