<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class HandleLocale
{
    /** @param Closure(Request): Response $next */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = auth()->check()
            ? (auth()->user()->locale ?? 'fr')
            : ($request->session()->get('locale') ?? config('app.locale', 'fr'));

        if (! in_array($locale, ['fr', 'en'], true)) {
            $locale = 'fr';
        }

        App::setLocale($locale);

        return $next($request);
    }
}
