<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Vote;
use App\Support\VoterElection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TallyController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $election = VoterElection::current();
        if (! $election) {
            return response()->json(['message' => 'No election results are available yet.'], 409);
        }

        $counts = Vote::where('election_id', $election->id)
            ->selectRaw('candidate_student_id, COUNT(*) AS total')
            ->groupBy('candidate_student_id')->pluck('total', 'candidate_student_id');
        $positions = $election->positions()->with('candidacies.profile')->get()->map(fn ($position) => [
            'id' => $position->id, 'name' => $position->name,
            'candidates' => $position->candidacies->map(fn ($candidate) => [
                'student_id' => $candidate->student_id,
                'full_name' => $candidate->profile->full_name,
                'team' => $candidate->team,
                'votes' => (int) ($counts[$candidate->student_id] ?? 0),
            ])->sortByDesc('votes')->values(),
        ]);

        return response()->json([
            'election' => ['id' => $election->id, 'name' => $election->name, 'status' => $election->status, 'ends_at' => $election->ends_at],
            'tally_only' => VoterElection::tallyOnly($request->user(), $election),
            'positions' => $positions,
            'updated_at' => now()->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }
}
