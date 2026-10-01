<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Student;
use App\Models\VoterParticipation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $student = Student::find($validated['student_id']);

        if (
            ! $student ||
            $this->normalizeName($student->full_name) !==
            $this->normalizeName($validated['full_name'])
        ) {
            return response()->json([
                'message' => 'Student ID and full name do not match our records.',
            ], 401);
        }

        if ($student->academic_status !== 'enrolled') {
            return response()->json([
                'message' => 'You are not eligible to vote because your student record is not currently enrolled.',
                'academic_status' => $student->academic_status,
            ], 403);
        }

        $election = Election::currentlyActive()->first();

        if (! $election) {
            return response()->json([
                'message' => 'There is currently no active SSG election.',
            ], 409);
        }

        $alreadyVoted = VoterParticipation::query()
            ->where('election_id', $election->id)
            ->where('student_id', $student->student_id)
            ->exists();

        if ($alreadyVoted) {
            return response()->json([
                'message' => 'Our records show that you have already submitted your ballot for this election.',
            ], 409);
        }

        $student->tokens()
            ->where('name', 'voter-session')
            ->delete();

        $token = $student->createToken(
            'voter-session',
            ['vote'],
            now()->addHours(2),
        )->plainTextToken;

        return response()->json([
            'message' => 'Voter verified.',
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