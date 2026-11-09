<?php

namespace App\Http\Controllers\Voter;

use App\Http\Controllers\Controller;
use App\Models\Election;
use Illuminate\Http\JsonResponse;

class QrEntryController extends Controller
{
    public function show(string $code): JsonResponse
    {
        $election = Election::where('qr_entry_code', $code)->first();
        if (! $election) {
            return response()->json(['message' => 'This voting QR code is invalid. Ask an election administrator for a new copy.'], 404);
        }
        if (! in_array($election->status, ['draft', 'active'], true) || ($election->ends_at && $election->ends_at->isPast())) {
            return response()->json(['message' => 'This election is closed. Its QR code no longer accepts voters.'], 409);
        }

        return response()->json(['election' => ['id' => $election->id, 'name' => $election->name, 'status' => $election->status, 'ends_at' => $election->ends_at]])->header('Cache-Control', 'no-store');
    }
}
