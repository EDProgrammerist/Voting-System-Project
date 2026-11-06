<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Student;
use App\Models\VoterParticipation;
use App\Support\VoterElection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VoterAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'max:50',
            ],
            'full_name' => [
                'required',
                'string',
                'max:255',
            ],
        ]);

        return DB::transaction(function () use ($validated): JsonResponse {
            $student = Student::whereKey($validated['student_id'])->lockForUpdate()->first();

            if (
                ! $student ||
                $this->normalizeName($student->full_name) !==
                $this->normalizeName($validated['full_name'])
            ) {
                return response()->json([
                    'message' => 'Full name or password is incorrect. Use your student ID number as your password.',
                ], 401);
            }

            if ($student->academic_status !== 'enrolled') {
                return response()->json([
                    'message' => match ($student->academic_status) {
                        'graduated' => 'You cannot log in because your student record shows that you have already graduated.',
                        'stopped' => 'You cannot log in because your enrollment status is stopped.',
                        default => 'You cannot log in because your student record is not currently enrolled.',
                    },
                    'academic_status' => $student->academic_status,
                ], 403);
            }

            $election = VoterElection::current();

            if (! $election) {
                return response()->json([
                    'message' => 'There is currently no active SSG election.',
                ], 409);
            }

            $alreadyVoted = VoterParticipation::query()
                ->where('election_id', $election->id)
                ->where('student_id', $student->student_id)
                ->exists();

            $tallyOnly = $alreadyVoted || ($election->status !== 'draft' && ! Election::currentlyActive()->whereKey($election->id)->exists());

            $student->tokens()
                ->where('name', 'voter-session')
                ->delete();

            $token = $student->createToken(
                'voter-session',
                $tallyOnly ? ['tally-only'] : ['vote'],
                now()->addHours(2),
            )->plainTextToken;

            return response()->json([
                'message' => 'Voter verified.',
                'tally_only' => $tallyOnly,
                'token' => $token,
                'student' => [
                    'student_id' => $student->student_id,
                    'full_name' => $student->full_name,
                ],
                'election' => [
                    'id' => $election->id,
                    'name' => $election->name,
                    'ends_at' => $election->ends_at,
                ],
            ]);
        });
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()
            ->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Logged out.',
        ]);
    }

    private function normalizeName(string $name): string
    {
        return Str::of($name)
            ->lower()
            ->squish()
            ->value();
    }
}
