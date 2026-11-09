<?php

namespace App\Http\Controllers\Committee;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CommitteeAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', $data['email'])->where('role', 'committee')->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid committee credentials.'], 401);
        }
        $user->tokens()->where('name', 'committee-session')->delete();
        $token = $user->createToken('committee-session', ['committee'], now()->addHours(8))->plainTextToken;

        return response()->json(['message' => 'Committee member signed in.', 'token' => $token, 'committee' => ['name' => $user->name, 'email' => $user->email, 'role' => $user->role]])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Committee member signed out.']);
    }
}
