<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $admin = User::query()
            ->where('email', $validated['email'])
            ->first();

        if (
            ! $admin ||
            ! Hash::check($validated['password'], $admin->password)
        ) {
            return response()->json([
                'message' => 'Invalid administrator credentials.',
            ], 401);
        }

        $admin->tokens()
            ->where('name', 'admin-session')
            ->delete();

        $token = $admin->createToken(
            'admin-session',
            ['admin'],
            now()->addHours(8),
        )->plainTextToken;

        return response()->json([
            'message' => 'Administrator logged in.',
            'token' => $token,
            'admin' => [
                'name' => $admin->name,
                'email' => $admin->email,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()
            ->currentAccessToken()
            ?->delete();

        return response()->json([
            'message' => 'Administrator logged out.',
        ]);
    }
}