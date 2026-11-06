<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

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

        $startsAt = array_key_exists('starts_at', $validated)
            ? ($validated['starts_at'] ? Carbon::parse($validated['starts_at']) : null)
            : $election->starts_at;
        $endsAt = array_key_exists('ends_at', $validated)
            ? ($validated['ends_at'] ? Carbon::parse($validated['ends_at']) : null)
            : $election->ends_at;

        if ($startsAt && $endsAt && $endsAt->lessThanOrEqualTo($startsAt)) {
            throw ValidationException::withMessages([
                'ends_at' => 'The election end time must be after its start time.',
            ]);
        }

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
                'message' => 'Add at least one candidate to every default position before activating the election.',
            ], 422);
        }

        if ($election->positions()->whereDoesntHave('candidacies')->exists()) {
            return response()->json([
                'message' => 'Add at least one candidate to every position before activating the election.',
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

        $election->update([
            'status' => 'active',
            'starts_at' => $election->starts_at ?? now(),
        ]);

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
