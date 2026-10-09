<?php

use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\VoterOnly;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin.only' => AdminOnly::class,
            'voter.only' => VoterOnly::class,
        ]);

        $middleware->redirectGuestsTo(
            fn (Request $request): ?string => $request->is('api/*')
                ? null
                : '/',
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $exception): bool => $request->is('api/*') || $request->expectsJson(),
        );
    })
    ->create();
