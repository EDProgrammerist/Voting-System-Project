<?php

namespace App\Http\Middleware;

use App\Models\Student;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VoterOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Student || ! $user->tokenCan('vote')) {
            return response()->json([
                'message' => 'Voter access required.',
            ], 403);
        }

        return $next($request);
    }
}