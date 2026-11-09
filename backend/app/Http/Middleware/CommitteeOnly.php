<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CommitteeOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof User || $user->role !== 'committee' || ! $user->tokenCan('committee')) {
            return response()->json(['message' => 'Election committee access required.'], 403);
        }

        return $next($request);
    }
}
