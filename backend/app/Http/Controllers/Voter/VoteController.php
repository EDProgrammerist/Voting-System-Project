<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitVoteRequest;
use App\Models\Ballot;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\Position;
use App\Models\Vote;
use App\Models\VoterBallotId;
use App\Models\VoterParticipation;
use App\Support\VoterElection;
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

        if (VoterElection::forStudent($student)?->id !== (int) $data['election_id']) {
            return response()->json(['message' => 'This session belongs to a different election. Please scan its QR code and sign in again.'], 403);
        }

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
        $positions = Position::query()
            ->where('election_id', $election->id)
            ->orderBy('display_order')
            ->get()
            ->keyBy('id');
        $selectedPositionIds = $groupedSelections
            ->keys()
            ->map(fn ($positionId): int => (int) $positionId);
        $missingPositions = $positions
            ->reject(
                fn (Position $position): bool => $selectedPositionIds
                    ->contains($position->id),
            )
            ->pluck('name');

        foreach ($groupedSelections as $positionId => $positionSelections) {
            $position = $positions->get((int) $positionId);

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

        if ($missingPositions->isNotEmpty()) {
            throw ValidationException::withMessages([
                'selections' => 'Choose at least one candidate for every position. Missing: '.$missingPositions->join(', ').'.',
            ]);
        }

        try {
            DB::transaction(function () use (
                $student,
                $election,
                $selections,
                $data,
            ): void {
                $reference = VoterBallotId::issue($student, $election);
                if (isset($data['ballot_reference_id']) && $data['ballot_reference_id'] !== $reference->id) {
                    throw ValidationException::withMessages(['ballot_reference_id' => 'This ballot ID does not belong to your account and election.']);
                }
                VoterParticipation::create([
                    'election_id' => $election->id,
                    'student_id' => $student->student_id,
                    'voted_at' => now(),
                    'signature' => $data['signature'],
                    'thumbmark_confirmed_at' => now(),
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

        $student->tokens()->where('name', 'voter-session')->update(['abilities' => json_encode(['tally-only', 'election:'.$election->id])]);

        return response()->json([
            'message' => 'Your vote was submitted successfully.',
            'tally_only' => true,
            'ballot_reference' => VoterBallotId::summary($student, $election),
        ], 201);
    }
}
