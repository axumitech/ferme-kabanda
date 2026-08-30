<?php

namespace App\Http\Controllers;

use App\Enums\StatutTache;
use App\Models\Article;
use App\Models\ClotureJournaliere;
use App\Models\FarmRecord;
use App\Models\MapFeature;
use App\Models\ProductStock;
use App\Models\ReferenceItem;
use App\Models\Tache;
use App\Services\FluxActiviteService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FluxActiviteService $flux): Response
    {
        $user = $request->user();
        $taskScope = fn (Builder $query): Builder => $query
            ->where('est_modele', false)
            ->when(! $user?->is_admin, fn (Builder $query): Builder => $query
                ->where(function (Builder $query) use ($user): void {
                    $query->where('responsable_id', $user?->id)
                        ->orWhereHas('intervenants', fn (Builder $intervenants): Builder => $intervenants->where('user_id', $user?->id))
                        ->orWhereNull('responsable_id');
                }));
        $lowInventoryBase = Article::query()
            ->join('unites as unite_usage', 'unite_usage.id', '=', 'articles.unite_usage_id')
            ->where('articles.actif', true)
            ->whereNotNull('articles.seuil_min')
            ->whereRaw('articles.quantite_base <= articles.seuil_min * unite_usage.vers_base');

        $lowInventoryCount = (clone $lowInventoryBase)->count('articles.id');
        $lowInventoryItems = (clone $lowInventoryBase)
            ->select('articles.*')
            ->with('uniteUsage:id,code,nom,dimension,vers_base,conditionnement')
            ->orderByRaw('articles.quantite_base / nullif(unite_usage.vers_base, 0) asc')
            ->limit(8)
            ->get();
        $taskStats = $taskScope(Tache::query())
            ->toBase()
            ->selectRaw('sum(case when date(date_due) = ? then 1 else 0 end) as due_today', [today()->toDateString()])
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as open_count', [StatutTache::AFaire->value])
            ->selectRaw('sum(case when statut = ? and date(date_due) < ? then 1 else 0 end) as late_count', [StatutTache::AFaire->value, today()->toDateString()])
            ->selectRaw('sum(case when statut = ? and date(fait_le) = ? then 1 else 0 end) as done_today', [StatutTache::Faite->value, today()->toDateString()])
            ->first();

        return Inertia::render('dashboard', [
            'stats' => [
                'tasksToday' => (int) $taskStats->due_today,
                'openTasks' => (int) $taskStats->open_count,
                'lateTasks' => (int) $taskStats->late_count,
                'doneToday' => (int) $taskStats->done_today,
                'lowInventory' => $lowInventoryCount,
                'lowProducts' => ProductStock::query()
                    ->where('active', true)
                    ->whereNotNull('minimum_quantity')
                    ->whereColumn('quantity_on_hand', '<=', 'minimum_quantity')
                    ->count(),
                'reportsToday' => FarmRecord::query()->where('record_key', 'like', 'rap:%:'.today()->toDateString())->count(),
                'closedToday' => ClotureJournaliere::query()->whereDate('date', today())->where('verrouillee', true)->count(),
            ],
            'tasks' => $taskScope(Tache::query())
                ->with(['responsable:id,name', 'intervenants.user:id,name', 'site:id,code,nom', 'departement:id,code,nom'])
                ->orderByRaw(
                    'case when statut = ? and date_due < ? then 0 when statut = ? then 1 else 2 end',
                    [StatutTache::AFaire->value, today()->toDateString(), StatutTache::AFaire->value]
                )
                ->orderBy('date_due')
                ->limit(8)
                ->get(),
            'closures' => ClotureJournaliere::query()
                ->with(['site:id,code,nom', 'departement:id,code,nom'])
                ->latest('updated_at')
                ->limit(6)
                ->get(),
            'lowInventoryItems' => $lowInventoryItems
                ->map(fn (Article $article): array => [
                    'id' => $article->id,
                    'code' => $article->code,
                    'name' => $article->libelle,
                    'unit' => $article->uniteUsage->code,
                    'quantity_on_hand' => number_format($article->stockUsage(), 3, '.', ''),
                    'minimum_quantity' => $article->seuil_min,
                ]),
            'mapFeatures' => MapFeature::query()
                ->where('active', true)
                ->orderBy('sort_order')
                ->limit(6)
                ->get(['id', 'name', 'feature_type', 'area_ha', 'area_m2']),
            'referencesCount' => ReferenceItem::query()->where('active', true)->count(),
            'latestActivity' => $flux->journee(null, 10),
        ]);
    }
}
