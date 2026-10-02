<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'election_id' => [
                'required',
                'integer',
                'exists:elections,id',
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('positions', 'name')
                    ->where(
                        fn ($query) => $query->where(
                            'election_id',
                            $request->integer('election_id'),
                        ),
                    ),
            ],
            'max_selections' => [
                'required',
                'integer',
                'min:1',
                'max:50',
            ],
            'display_order' => [
                'required',
                'integer',
                'min:0',
            ],
        ]);

        $election = Election::findOrFail(
            $validated['election_id'],
        );

        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Positions can only be changed while the election is in draft status.',
            ], 409);
        }

        $position = Position::create($validated);

        return response()->json([
            'message' => 'Position created successfully.',
            'data' => $position,
        ], 201);
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
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('positions', 'name')
                    ->where(
                        fn ($query) => $query->where(
                            'election_id',
                            $position->election_id,
                        ),
                    )
                    ->ignore($position->id),
            ],
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

    public function destroy(Position $position): JsonResponse
    {
        if ($position->election->status !== 'draft') {
            return response()->json([
                'message' => 'Positions can only be deleted while the election is in draft status.',
            ], 409);
        }

        if ($position->candidacies()->exists()) {
            return response()->json([
                'message' => 'Remove the candidates assigned to this position before deleting it.',
            ], 409);
        }

        $position->delete();

        return response()->json([
            'message' => 'Position deleted successfully.',
        ]);
    }
}
