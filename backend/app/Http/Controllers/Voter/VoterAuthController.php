<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Student;
use App\Models\VoterBallotId;
use App\Models\VoterParticipation;
use App\Support\VoterElection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class VoterAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_code' => ['nullable', 'uuid', 'exists:elections,qr_entry_code'],
            'student_id' => [
                'required',
                'string',
                'max:50',
            ],
            'password' => [
                'required',
                'string',
                'max:72',
            ],
        ]);

        return DB::transaction(function () use ($validated): JsonResponse {
            $student = Student::whereKey($validated['student_id'])->lockForUpdate()->first();

            if (
                ! $student ||
                ! $student->password ||
                strlen($validated['password']) > 72 ||
                ! Hash::check($validated['password'], $student->password)
            ) {
                return response()->json([
                    'message' => 'Student ID number or password is incorrect.',
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

            $election = isset($validated['entry_code']) ? Election::where('qr_entry_code', $validated['entry_code'])->firstOrFail() : VoterElection::current();
            if (isset($validated['entry_code']) && (! in_array($election->status, ['draft', 'active'], true) || ($election->ends_at && $election->ends_at->isPast()))) {
                return response()->json(['message' => 'This election is closed. Its QR code no longer accepts voters.'], 409);
            }

            return $this->issueSession($student, $election);
        });
    }

    public function session(Request $request): JsonResponse
    {
        $student = $request->user();
        $election = VoterElection::forStudent($student);

        if (! $election) {
            return response()->json(['message' => 'There is currently no active SSG election.'], 409);
        }

        return response()->json([
            'ballot_reference' => VoterBallotId::summary($student, $election),
            'password_change_required' => $student->password_change_required,
            'tally_only' => VoterElection::tallyOnly($student, $election),
            'election' => ['id' => $election->id, 'name' => $election->name, 'ends_at' => $election->ends_at],
        ])->header('Cache-Control', 'no-store');
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'max:72', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols(), function ($attribute, $value, $fail): void {
                if (str_contains($value, "\0")) {
                    $fail('Passwords cannot contain null characters.');
                }
                if (strlen($value) > 72) {
                    $fail('This password is too long. Please use a shorter password.');
                }
            }],
        ]);

        return DB::transaction(function () use ($request, $validated): JsonResponse {
            $student = Student::whereKey($request->user()->student_id)->lockForUpdate()->firstOrFail();
            // A setup token is single use, including concurrent setup requests.
            if (! $student->password_change_required || ! $student->tokens()->whereKey($request->user()->currentAccessToken()->id)->exists()) {
                return response()->json(['message' => 'Password setup has already been completed. Please sign in again.'], 403);
            }

            $election = VoterElection::forStudent($request->user());
            if (! $election) {
                return response()->json(['message' => 'There is currently no active SSG election.'], 409);
            }

            $student->update(['password' => $validated['password'], 'password_change_required' => false]);
            $student->tokens()->delete();

            return $this->issueSession($student, $election);
        });
    }

    private function issueSession(Student $student, ?Election $election): JsonResponse
    {

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

        if (! $student->password_change_required) {
            VoterBallotId::issue($student, $election);
        }

        $student->tokens()
            ->where('name', 'voter-session')
            ->delete();

        $token = $student->createToken(
            'voter-session',
            [$student->password_change_required ? 'password-setup' : ($tallyOnly ? 'tally-only' : 'vote'), 'election:'.$election->id],
            now()->addHours(2),
        )->plainTextToken;

        return response()->json([
            'message' => 'Voter verified.',
            'ballot_reference' => $student->password_change_required ? null : VoterBallotId::summary($student, $election),
            'password_change_required' => $student->password_change_required,
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
        ])->header('Cache-Control', 'no-store');
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
}
