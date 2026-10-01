<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitVoteRequest;
use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Position;
use App\Models\Vote;
use App\Models\VoterParticipation;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VoteController extends Controller
{
    public function store(SubmitVoteRequest $request): JsonResponse
    {
        $student = $request->user();
        $data = $request->validated();

        if ($student->academic_status !== 'enrolled') {
            return response()->json([
                'message' => 'Your student record is no longer eligible to vote.',
            ], 403);
        }

        $election = Election::currentlyActive()
            ->whereKey($data['election_id'])
            ->first();

        if (! $election) {
            return response()->json([
                'message' => 'The selected election is not currently active.',
            ], 409);
        }

        $alreadyVoted = VoterParticipation::query()
            ->where('election_id', $election->id)
            ->where('student_id', $student->student_id)
            ->exists();

        if ($alreadyVoted) {
            return response()->json([
                'message' => 'You have already voted in this election.',
            ], 409);
        }

        $selections = collect($data['selections']);

        if (
            $selections
                ->pluck('candidate_student_id')
                ->duplicates()
                ->isNotEmpty()
        ) {
            throw ValidationException::withMessages([
                'selections' => 'The same candidate cannot be selected more than once.',
            ]);
        }

        $groupedSelections = $selections->groupBy('position_id');

        foreach ($groupedSelections as $positionId => $positionSelections) {
            $position = Position::query()
                ->where('election_id', $election->id)
                ->find($positionId);

            if (! $position) {
                throw ValidationException::withMessages([
                    'selections' => "Position {$positionId} does not belong to the active election.",
                ]);
            }

            if ($positionSelections->count() > $position->max_selections) {
                throw ValidationException::withMessages([
                    'selections' => "Too many candidates selected for {$position->name}.",
                ]);
            }

            foreach ($positionSelections as $selection) {
                $candidateExists = Candidacy::query()
                    ->where('election_id', $election->id)
                    ->where('position_id', $position->id)
                    ->where(
                        'student_id',
                        $selection['candidate_student_id'],
                    )
                    ->exists();

                if (! $candidateExists) {
                    throw ValidationException::withMessages([
                        'selections' => "Candidate {$selection['candidate_student_id']} is invalid for {$position->name}.",
                    ]);
                }
            }
        }

        try {
            DB::transaction(function () use (
                $student,
                $election,
                $selections,
            ): void {
                VoterParticipation::create([
                    'election_id' => $election->id,
                    'student_id' => $student->student_id,
                    'voted_at' => now(),
                ]);

                $ballotId = (string) Str::uuid();

                Ballot::create([
                    'id' => $ballotId,
                    'election_id' => $election->id,
                    'cast_at' => now(),
                ]);

                $rows = $selections
                    ->map(function (array $selection) use (
                        $ballotId,
                        $election,
                    ): array {
                        return [
                            'ballot_id' => $ballotId,
                            'election_id' => $election->id,
                            'position_id' => $selection['position_id'],
                            'candidate_student_id' => $selection['candidate_student_id'],
                            'created_at' => now(),
                        ];
                    })
                    ->all();

                Vote::insert($rows);
            }, 3);
        } catch (QueryException $exception) {
            if ((string) $exception->getCode() === '23000') {
                return response()->json([
                    'message' => 'Your ballot could not be accepted because a vote has already been recorded for this student or the ballot contains duplicate data.',
                ], 409);
            }

            throw $exception;
        }

        $student->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Your vote was submitted successfully.',
        ], 201);
    }
}