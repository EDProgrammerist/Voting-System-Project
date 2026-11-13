<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\Partylist;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class PartylistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['election_id' => ['required', 'integer', 'exists:elections,id']]);

        return response()->json(['data' => Partylist::where('election_id', $data['election_id'])->orderBy('team')->get()->map(fn ($party) => $party->responseData())])->header('Cache-Control', 'no-store');
    }

    public function store(Request $request): JsonResponse
    {
        return $this->save($request);
    }

    public function update(Request $request, Partylist $partylist): JsonResponse
    {
        return $this->save($request, $partylist);
    }

    public function destroy(Partylist $partylist): JsonResponse
    {
        $banner = DB::transaction(function () use ($partylist): ?string {
            $election = Election::whereKey($partylist->election_id)->lockForUpdate()->firstOrFail();
            abort_if($election->status !== 'draft', 409, 'Partylists can only be deleted while the election is in draft status.');
            $current = Partylist::whereKey($partylist->id)->lockForUpdate()->firstOrFail();
            $path = $current->banner_image;
            $current->delete();

            return $path;
        });
        if ($banner) {
            Storage::disk('public')->delete($banner);
        }

        return response()->json(['message' => 'Partylist deleted. Its slot is available to create again. Candidates, votes, and attendance were kept.']);
    }

    private function save(Request $request, ?Partylist $partylist = null): JsonResponse
    {
        $data = $request->validate([
            'election_id' => ['required', 'integer', 'exists:elections,id', ...($partylist ? [Rule::in([$partylist->election_id])] : [])],
            'team' => ['required', Rule::in($partylist ? [$partylist->team] : ['TEAM_A', 'TEAM_B']), Rule::unique('partylists')->where('election_id', $request->input('election_id'))->ignore($partylist?->id)],
            'name' => ['required', 'string', 'max:100', Rule::unique('partylists')->where('election_id', $request->input('election_id'))->ignore($partylist?->id)],
            'platform' => ['required', 'string', 'max:5000'],
            'banner_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);
        $election = Election::findOrFail($data['election_id']);
        abort_if($election->status !== 'draft', 409, 'Partylists can only be changed while the election is in draft status.');
        $newPath = $request->file('banner_image')?->store('partylists', 'public');
        $oldPath = null;
        try {
            $saved = DB::transaction(function () use ($data, $partylist, $newPath, &$oldPath): Partylist {
                $election = Election::whereKey($data['election_id'])->lockForUpdate()->firstOrFail();
                abort_if($election->status !== 'draft', 409, 'Partylists can only be changed while the election is in draft status.');
                $party = $partylist ? Partylist::whereKey($partylist->id)->lockForUpdate()->firstOrFail() : new Partylist;
                $oldPath = $party->banner_image;
                $party->fill(['election_id' => $data['election_id'], 'team' => $data['team'], 'name' => Str::squish($data['name']), 'platform' => trim($data['platform'])]);
                if ($newPath) {
                    $party->banner_image = $newPath;
                }
                $party->save();

                return $party;
            });
        } catch (Throwable $error) {
            if ($newPath) {
                Storage::disk('public')->delete($newPath);
            }
            if ($error instanceof QueryException) {
                return response()->json(['message' => 'This partylist slot or name is already in use. Refresh the list and try again.'], 409);
            }
            throw $error;
        }
        if ($newPath && $oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json(['message' => $partylist ? 'Partylist updated.' : 'Partylist created.', 'data' => $saved->responseData()], $partylist ? 200 : 201);
    }
}
