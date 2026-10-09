<?php

use App\Http\Controllers\Admin\AdminAuthController;
use App\Http\Controllers\Admin\CandidateController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ElectionController;
use App\Http\Controllers\Admin\PositionController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Voter\BallotController;
use App\Http\Controllers\Voter\VoteController;
use App\Http\Controllers\Voter\VoterAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('voter')->group(function (): void {
    Route::post(
        '/login',
        [VoterAuthController::class, 'login'],
    )->middleware('throttle:20,1');

    Route::middleware([
        'auth:sanctum',
        'voter.only',
    ])->group(function (): void {
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
        Route::post(
            '/logout',
            [AdminAuthController::class, 'logout'],
        );

        Route::get(
            '/dashboard',
            [DashboardController::class, 'show'],
        );

        Route::get(
            '/students',
            [StudentController::class, 'index'],
        );

        Route::post(
            '/students',
            [StudentController::class, 'store'],
        );

        Route::put(
            '/students/{studentId}',
            [StudentController::class, 'update'],
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

        Route::post(
            '/positions',
            [PositionController::class, 'store'],
        );

        Route::put(
            '/positions/reorder',
            [PositionController::class, 'reorder'],
        );

        Route::put(
            '/positions/{position}',
            [PositionController::class, 'update'],
        );

        Route::delete(
            '/positions/{position}',
            [PositionController::class, 'destroy'],
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
