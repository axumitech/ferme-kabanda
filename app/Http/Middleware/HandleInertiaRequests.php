<?php

namespace App\Http\Middleware;

use App\Enums\StatutTache;
use App\Models\Tache;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'locale' => app()->getLocale(),
            'availableLocales' => [
                ['value' => 'fr', 'label' => 'Français'],
                ['value' => 'en', 'label' => 'English'],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'fkn' => [
                // Le badge est volontairement personnel : il compte les actions
                // attendues de la personne, jamais le volume de la ferme.
                'actionsPending' => fn (): int => $request->user()
                    ? Tache::query()
                        ->where('est_modele', false)
                        ->where('statut', StatutTache::AFaire)
                        ->where(function ($query) use ($request): void {
                            $query->where('responsable_id', $request->user()->id)
                                ->orWhereHas('intervenants', fn ($intervenants) => $intervenants->where('user_id', $request->user()->id));
                        })
                        ->count()
                    : 0,
            ],
        ];
    }
}
