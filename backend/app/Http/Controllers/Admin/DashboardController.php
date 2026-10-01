<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Student;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
        ]);

        $election = Election::findOrFail($validated['election_id']);

        $eligibleStudents = Student::query()
            ->where('academic_status', 'enrolled')
            ->count();

        $alreadyVoted = VoterParticipation::query()
            ->where('election_id', $election->id)
            ->count();

        $notYetVoted = max(
            $eligibleStudents - $alreadyVoted,
            0,
        );

        $turnoutPercentage = $eligibleStudents > 0
            ? round(($alreadyVoted / $eligibleStudents) * 100, 2)
            : 0;

        $voteCounts = Vote::query()
            ->select(
                'candidate_student_id',
                DB::raw('COUNT(*) AS total_votes'),
            )
            ->where('election_id', $election->id)
            ->groupBy('candidate_student_id')
            ->pluck(
                'total_votes',
                'candidate_student_id',
            );

        $candidacies = Candidacy::query()
            ->where('election_id', $election->id)
            ->with([
                'profile',
                'position',
            ])
            ->get();

        $candidateResults = $candidacies->map(
            function (Candidacy $candidacy) use ($voteCounts): array {
                return [
                    'student_id' => $candidacy->student_id,
                    'full_name' => $candidacy->profile->full_name,
                    'profile_photo_url' => $candidacy->profile->profile_photo
                        ? url(Storage::url($candidacy->profile->profile_photo))
                        : null,
                    'motto' => $candidacy->profile->motto,
                    'team' => $candidacy->team,
                    'position' => $candidacy->position->name,
                    'votes' => (int) (
                        $voteCounts[$candidacy->student_id] ?? 0
                    ),
                ];
            },
        );

        $teamTotals = $candidateResults
            ->groupBy('team')
            ->map(
                fn ($teamCandidates) => $teamCandidates->sum('votes'),
            );

        return response()->json([
            'election' => [
                'id' => $election->id,
                'name' => $election->name,
                'status' => $election->status,
                'starts_at' => $election->starts_at,
                'ends_at' => $election->ends_at,
            ],
            'turnout' => [
                'eligible_students' => $eligibleStudents,
                'already_voted' => $alreadyVoted,
                'not_yet_voted' => $notYetVoted,
                'percentage' => $turnoutPercentage,
            ],
            'team_totals' => [
                'TEAM_A' => (int) (
                    $teamTotals['TEAM_A'] ?? 0
                ),
                'TEAM_B' => (int) (
                    $teamTotals['TEAM_B'] ?? 0
                ),
            ],
            'candidate_results' => $candidateResults
                ->sortBy([
                    ['position', 'asc'],
                    ['votes', 'desc'],
                ])
                ->values(),
            'results_by_position' => $candidateResults
                ->groupBy('position')
                ->map(
                    fn ($items) => $items
                        ->sortByDesc('votes')
                        ->values(),
                ),
        ]);
    }
}