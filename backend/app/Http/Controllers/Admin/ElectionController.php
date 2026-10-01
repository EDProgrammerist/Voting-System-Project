<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ElectionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Election::query()
                ->latest('id')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'starts_at' => [
                'nullable',
                'date',
            ],
            'ends_at' => [
                'nullable',
                'date',
                'after:starts_at',
            ],
        ]);

        $election = Election::create([
            ...$validated,
            'status' => 'draft',
        ]);

        return response()->json([
            'message' => 'Election created in draft status.',
            'data' => $election,
        ], 201);
    }

    public function update(
        Request $request,
        Election $election,
    ): JsonResponse {
        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft elections can be edited.',
            ], 409);
        }

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'starts_at' => [
                'sometimes',
                'nullable',
                'date',
            ],
            'ends_at' => [
                'sometimes',
                'nullable',
                'date',
            ],
        ]);

        $election->update($validated);

        return response()->json([
            'message' => 'Election updated successfully.',
            'data' => $election->fresh(),
        ]);
    }

    public function activate(Election $election): JsonResponse
    {
        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Only a draft election can be activated.',
            ], 409);
        }

        if (
            ! $election->positions()->exists() ||
            ! $election->candidacies()->exists()
        ) {
            return response()->json([
                'message' => 'Add positions and candidates before activating the election.',
            ], 422);
        }

        $anotherActiveElection = Election::currentlyActive()
            ->where('id', '!=', $election->id)
            ->exists();

        if ($anotherActiveElection) {
            return response()->json([
                'message' => 'Another election is already active.',
            ], 409);
        }

        DB::transaction(function () use ($election): void {
            $election->update([
                'status' => 'active',
                'starts_at' => $election->starts_at ?? now(),
            ]);
        });

        return response()->json([
            'message' => 'Election activated successfully.',
            'data' => $election->fresh(),
        ]);
    }

    public function close(Election $election): JsonResponse
    {
        if ($election->status !== 'active') {
            return response()->json([
                'message' => 'Only an active election can be closed.',
            ], 409);
        }

        $election->update([
            'status' => 'closed',
            'ends_at' => now(),
        ]);

        return response()->json([
            'message' => 'Election closed successfully.',
            'data' => $election->fresh(),
        ]);
    }
}