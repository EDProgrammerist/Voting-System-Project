<?php

namespace App\Http\Middleware;

use App\Models\Student;
use App\Support\VoterElection;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VoterOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Student || (! $user->tokenCan('vote') && ! $user->tokenCan('tally-only') && ! $user->tokenCan('password-setup'))) {
            return response()->json([
                'message' => 'Voter access required.',
            ], 403);
        }

        if ($user->academic_status !== 'enrolled') {
            return response()->json(['message' => 'Your student record is no longer eligible for voter access.'], 403);
        }

        if ($user->password_change_required && ! $request->is('api/voter/password', 'api/voter/session', 'api/voter/logout')) {
            return response()->json(['message' => 'Create your secure password before continuing.', 'password_change_required' => true], 403);
        }

        if (! $user->password_change_required && $user->tokenCan('password-setup')) {
            return response()->json(['message' => 'Please sign in again.'], 401);
        }

        $election = VoterElection::current();
        if ($election && VoterElection::tallyOnly($user, $election) && ! $request->is('api/voter/tally', 'api/voter/logout', 'api/voter/password', 'api/voter/session')) {
            return response()->json(['message' => 'Your access is restricted to Live Tally.', 'tally_only' => true], 403);
        }

        return $next($request);
    }
}
