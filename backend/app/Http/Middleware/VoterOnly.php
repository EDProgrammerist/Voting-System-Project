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

        if (! $user instanceof Student || (! $user->tokenCan('vote') && ! $user->tokenCan('tally-only'))) {
            return response()->json([
                'message' => 'Voter access required.',
            ], 403);
        }

        if ($user->academic_status !== 'enrolled') {
            return response()->json(['message' => 'Your student record is no longer eligible for voter access.'], 403);
        }

        $election = VoterElection::current();
        if ($election && VoterElection::tallyOnly($user, $election) && ! $request->is('api/voter/tally', 'api/voter/logout')) {
            return response()->json(['message' => 'Your access is restricted to Live Tally.', 'tally_only' => true], 403);
        }

        return $next($request);
    }
}
