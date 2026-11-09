<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\VoterBallotId;
use App\Support\VoterElection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BallotController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $election = VoterElection::forStudent($request->user());
        $election?->load([
            'positions' => function ($query) {
                $query->orderBy('display_order')
                    ->with([
                        'candidacies' => function ($query) {
                            $query->with('profile');
                        },
                    ]);
            },
        ]);

        if (! $election) {
            return response()->json([
                'message' => 'There is currently no active election.',
            ], 409);
        }

        $positions = $election->positions
            ->map(function ($position) {
                return [
                    'id' => $position->id,
                    'name' => $position->name,
                    'max_selections' => $position->max_selections,
                    'candidates' => $position->candidacies
                        ->map(function ($candidacy) {
                            $profile = $candidacy->profile;

                            return [
                                'student_id' => $candidacy->student_id,
                                'full_name' => $profile->full_name,
                                'team' => $candidacy->team,
                                'profile_photo_url' => $profile->profile_photo
                                    ? url(Storage::url($profile->profile_photo))
                                    : null,
                                'motto' => $profile->motto,
                                'profile' => $profile->profile,
                                'achievements' => $profile->achievements,
                            ];
                        })
                        ->values(),
                ];
            })
            ->values();

        VoterBallotId::issue($request->user(), $election);

        return response()->json([
            'ballot_reference' => VoterBallotId::summary($request->user(), $election),
            'can_submit_vote' => Election::currentlyActive()->whereKey($election->id)->exists()
                && $election->positions->isNotEmpty()
                && $election->positions->every(fn ($position) => $position->candidacies->isNotEmpty()),
            'election' => [
                'id' => $election->id,
                'name' => $election->name,
                'ends_at' => $election->ends_at,
            ],
            'positions' => $positions,
        ])->header('Cache-Control', 'no-store');
    }
}
