<?php

namespace App\Http\Middleware;

use App\Enums\StatutTache;
use App\Models\Article;
use App\Models\CampagneInventaire;
use App\Models\Incident;
use App\Models\Infrastructure;
use App\Models\MainCourante;
use App\Models\OrdreTravail;
use App\Models\Patrouille;
use App\Models\PlanImport;
use App\Models\PosteControle;
use App\Models\Requisition;
use App\Models\Tache;
use App\Models\Vente;
use App\Services\VisibiliteService;
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
            'flash' => [
                'success' => fn (): ?string => $request->session()->get('success'),
                'error' => fn (): ?string => $request->session()->get('error'),
                'warning' => fn (): ?string => $request->session()->get('warning'),
                'info' => fn (): ?string => $request->session()->get('info'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'fkn' => [
                // Le badge est volontairement personnel : il compte les actions
                // attendues de la personne, jamais le volume de la ferme.
                'actionsPending' => fn (): int => $request->user()
                    ? Tache::query()
                        ->where('est_modele', false)
                        ->where('statut', StatutTache::AFaire)
                        ->whereDate('date_due', '<=', today())
                        ->where(function ($query) use ($request): void {
                            $query->where('responsable_id', $request->user()->id)
                                ->orWhereHas('intervenants', fn ($intervenants) => $intervenants->where('user_id', $request->user()->id));
                        })
                        ->count()
                    : 0,
                'registryTasks' => fn (): int => $request->user()
                    ? Tache::query()->where('est_modele', false)->count()
                    : 0,
                'articleCount' => fn (): int => $request->user()
                    ? Article::query()->count()
                    : 0,
                'requisitionCount' => fn (): int => $request->user()
                    ? Requisition::query()->count()
                    : 0,
                'inventoryPending' => fn (): int => $request->user()
                    ? CampagneInventaire::query()->whereIn('statut', ['ouverte', 'comptee', 'arbitree'])->count()
                    : 0,
                'salesPending' => fn (): int => $request->user()
                    ? Vente::query()->whereIn('statut', ['brouillon', 'livree', 'facturee'])->count()
                    : 0,
                'workOrdersPending' => fn (): int => $request->user()
                    ? OrdreTravail::query()->whereNotIn('statut', ['clos', 'refuse', 'annule'])->count()
                    : 0,
                'infrastructuresBad' => fn (): int => $request->user()
                    ? Infrastructure::query()->where('etat', 'mauvais')->count()
                    : 0,
                'incidentsOpen' => fn (): int => $request->user()
                    ? Incident::query()
                        ->where('statut', '!=', 'cloture')
                        ->when(
                            ! app(VisibiliteService::class)->peutVoir($request->user(), 'incidents_surete'),
                            fn ($query) => $query->where('nature', '!=', 'surete'),
                        )
                        ->count()
                    : 0,
                'patrolsOpen' => fn (): int => $request->user()
                    ? Patrouille::query()->where('statut', 'en_cours')->count()
                    : 0,
                'dailyLogCount' => fn (): int => $request->user()
                    ? MainCourante::query()->whereDate('survenu_le', today())->count()
                    : 0,
                'controlPostsActive' => fn (): int => $request->user()
                    ? PosteControle::query()->where('actif', true)->count()
                    : 0,
                'planImportsPending' => fn (): int => $request->user()
                    ? PlanImport::query()->where('statut', 'analyse')->count()
                    : 0,
            ],
        ];
    }
}
