<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\CandidateController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ElectionController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Committee\ClassListImportController;
use App\Http\Controllers\Committee\CommitteeAuthController;
use App\Http\Controllers\Committee\StudentController;
use App\Http\Controllers\Voter\BallotController;
use App\Http\Controllers\Voter\QrEntryController;
use App\Http\Controllers\Voter\TallyController;
use App\Http\Controllers\Voter\VoteController;
use App\Http\Controllers\Voter\VoterAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('voter')->group(function (): void {
    Route::get('/entry/{code}', [QrEntryController::class, 'show'])->middleware('throttle:120,1');
    Route::post(
        '/login',
        [VoterAuthController::class, 'login'],
    )->middleware('throttle:20,1');

    Route::middleware([
        'auth:sanctum',
        'voter.only',
    ])->group(function (): void {
        Route::get('/session', [VoterAuthController::class, 'session']);
        Route::post('/password', [VoterAuthController::class, 'changePassword'])->middleware('throttle:10,1');
        Route::get('/tally', [TallyController::class, 'show']);
        Route::get(
            '/ballot',
            [BallotController::class, 'show'],
        );

        Route::post(
            '/vote',
            [VoteController::class, 'store'],
        )->middleware('throttle:10,1');

        Route::post(
            '/logout',
            [VoterAuthController::class, 'logout'],
        );
    });
});

Route::prefix('admin')->group(function (): void {
    Route::post(
        '/login',
        [AdminAuthController::class, 'login'],
    )->middleware('throttle:20,1');

    Route::middleware([
        'auth:sanctum',
        'admin.only',
    ])->group(function (): void {
        Route::get('/elections/{election}/qr', [ElectionController::class, 'qr']);
        Route::post(
            '/logout',
            [AdminAuthController::class, 'logout'],
        );

        Route::get(
            '/dashboard',
            [DashboardController::class, 'show'],
        );

        Route::get(
            '/elections',
            [ElectionController::class, 'index'],
        );

        Route::post(
            '/elections',
            [ElectionController::class, 'store'],
        );

        Route::put(
            '/elections/{election}',
            [ElectionController::class, 'update'],
        );

        Route::post(
            '/elections/{election}/activate',
            [ElectionController::class, 'activate'],
        );

        Route::post(
            '/elections/{election}/close',
            [ElectionController::class, 'close'],
        );

        Route::get(
            '/positions',
            [PositionController::class, 'index'],
        );

        Route::put(
            '/positions/reorder',
            [PositionController::class, 'reorder'],
        );

        Route::put(
            '/positions/{position}',
            [PositionController::class, 'update'],
        );

        Route::get(
            '/candidates',
            [CandidateController::class, 'index'],
        );

        Route::post(
            '/candidates',
            [CandidateController::class, 'store'],
        );

        Route::delete(
            '/candidates/{studentId}',
            [CandidateController::class, 'destroy'],
        );
    });
});

Route::prefix('committee')->group(function (): void {
    Route::post('/login', [CommitteeAuthController::class, 'login'])->middleware('throttle:20,1');
    Route::middleware(['auth:sanctum', 'committee.only'])->group(function (): void {
        Route::post('/logout', [CommitteeAuthController::class, 'logout']);
        Route::get('/elections', [ElectionController::class, 'index']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{studentId}', [StudentController::class, 'update']);
        Route::get('/class-list/template', [ClassListImportController::class, 'template']);
        Route::post('/class-list/inspect', [ClassListImportController::class, 'inspect'])->middleware('throttle:10,1');
        Route::post('/class-list/preview', [ClassListImportController::class, 'preview'])->middleware('throttle:10,1');
        Route::post('/class-list/{import}/commit', [ClassListImportController::class, 'commit'])->middleware('throttle:5,1');
    });
});
