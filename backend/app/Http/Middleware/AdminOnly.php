<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->tokenCan('admin')) {
            return response()->json([
                'message' => 'Administrator access required.',
            ], 403);
        }

        return $next($request);
    }
}