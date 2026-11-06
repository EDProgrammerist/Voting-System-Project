<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PositionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
        ]);

        return response()->json([
            'data' => Position::query()
                ->where('election_id', $validated['election_id'])
                ->orderBy('display_order')
                ->get(),
        ]);
    }

    public function update(
        Request $request,
        Position $position,
    ): JsonResponse {
        if ($position->election->status !== 'draft') {
            return response()->json([
                'message' => 'Positions can only be changed while the election is in draft status.',
            ], 409);
        }

        $validated = $request->validate([
            'name' => ['prohibited'],
            'max_selections' => [
                'sometimes',
                'required',
                'integer',
                'min:1',
                'max:50',
            ],
            'display_order' => [
                'sometimes',
                'required',
                'integer',
                'min:0',
            ],
        ]);

        $position->update($validated);

        return response()->json([
            'message' => 'Position updated successfully.',
            'data' => $position->fresh(),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
            'positions' => [
                'required',
                'array',
                'min:1',
            ],
            'positions.*.id' => [
                'required',
                'integer',
                'distinct',
                'exists:positions,id',
            ],
            'positions.*.display_order' => [
                'required',
                'integer',
                'min:1',
                'distinct',
            ],
        ]);

        $result = DB::transaction(function () use ($validated) {
            $election = Election::query()
                ->lockForUpdate()
                ->findOrFail($validated['election_id']);

            if ($election->status !== 'draft') {
                return null;
            }

            $positions = Position::query()
                ->where('election_id', $election->id)
                ->lockForUpdate()
                ->get();

            $submittedPositions = collect($validated['positions']);
            $expectedIds = $positions->pluck('id')->sort()->values()->all();
            $submittedIds = $submittedPositions
                ->pluck('id')
                ->sort()
                ->values()
                ->all();

            if ($expectedIds !== $submittedIds) {
                throw ValidationException::withMessages([
                    'positions' => 'Submit every position from the selected election exactly once.',
                ]);
            }

            $expectedOrders = range(1, $positions->count());
            $submittedOrders = $submittedPositions
                ->pluck('display_order')
                ->sort()
                ->values()
                ->all();

            if ($expectedOrders !== $submittedOrders) {
                throw ValidationException::withMessages([
                    'positions' => 'Display orders must be consecutive and start at 1.',
                ]);
            }

            foreach ($submittedPositions as $submittedPosition) {
                Position::query()
                    ->whereKey($submittedPosition['id'])
                    ->update([
                        'display_order' => $submittedPosition['display_order'],
                    ]);
            }

            return Position::query()
                ->where('election_id', $election->id)
                ->orderBy('display_order')
                ->get();
        });

        if ($result === null) {
            return response()->json([
                'message' => 'Positions can only be reordered while the election is in draft status.',
            ], 409);
        }

        return response()->json([
            'message' => 'Ballot position order updated successfully.',
            'data' => $result,
        ]);
    }
}
