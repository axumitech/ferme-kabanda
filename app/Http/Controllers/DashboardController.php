<?php

namespace App\Http\Controllers;

use App\Enums\StatutTache;
use App\Models\Article;
use App\Models\ClotureJournaliere;
use App\Models\Equipement;
use App\Models\FarmRecord;
use App\Models\Incident;
use App\Models\InterventionEquipement;
use App\Models\MapFeature;
use App\Models\ProductStock;
use App\Models\Recolte;
use App\Models\ReferenceItem;
use App\Models\Requisition;
use App\Models\Tache;
use App\Models\TravailEquipement;
use App\Models\User;
use App\Services\FluxActiviteService;
use App\Services\MaintenanceService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, FluxActiviteService $flux, MaintenanceService $maintenance): Response
    {
        $user = $request->user();
        $niveau = $user->is_admin
            ? 1
            : (int) ($user->niveau_hierarchie ?? 4);
        $taskScope = fn (Builder $query): Builder => $query
            ->where('est_modele', false)
            ->when($niveau === 3, fn (Builder $query): Builder => $query
                ->where('departement_id', $user->departement_id))
            ->when($niveau >= 4, fn (Builder $query): Builder => $query
                ->where(function (Builder $query) use ($user): void {
                    $query->where('responsable_id', $user->id)
                        ->orWhereHas('intervenants', fn (Builder $intervenants): Builder => $intervenants->where('user_id', $user->id))
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
        $maintenanceIndicators = $maintenance->indicateurs(now()->subDays(90), now());
        $maintenanceBacklog = $maintenance->retardAccumule();
        $periodeDebut = today()->subDays(30);
        $equipements = Equipement::query()->where('actif', true)->get();
        $recoltes = Recolte::query()
            ->whereBetween('date', [$periodeDebut, today()])
            ->get(['canal_commercial', 'valeur']);
        $ventesTotal = round((float) $recoltes->sum('valeur'), 2);

        $performance = $niveau <= 2
            ? User::query()
                ->where('actif', true)
                ->whereHas('taches', fn (Builder $query): Builder => $query
                    ->where('est_modele', false)
                    ->whereBetween('date_due', [$periodeDebut, today()]))
                ->with('departement:id,nom')
                ->withCount([
                    'taches as dues' => fn (Builder $query): Builder => $query
                        ->where('est_modele', false)
                        ->whereBetween('date_due', [$periodeDebut, today()]),
                    'taches as faites' => fn (Builder $query): Builder => $query
                        ->where('est_modele', false)
                        ->whereBetween('date_due', [$periodeDebut, today()])
                        ->where('statut', StatutTache::Faite),
                    'taches as justifiees' => fn (Builder $query): Builder => $query
                        ->where('est_modele', false)
                        ->whereBetween('date_due', [$periodeDebut, today()])
                        ->where('statut', StatutTache::NonFaiteJustifiee),
                    'taches as non_justifiees' => fn (Builder $query): Builder => $query
                        ->where('est_modele', false)
                        ->whereBetween('date_due', [$periodeDebut, today()])
                        ->where('statut', StatutTache::NonFaiteNonJustifiee),
                    'taches as ouvertes' => fn (Builder $query): Builder => $query
                        ->where('est_modele', false)
                        ->whereBetween('date_due', [$periodeDebut, today()])
                        ->where('statut', StatutTache::AFaire),
                ])
                ->orderByDesc('dues')
                ->get()
                ->map(function (User $member): array {
                    $dues = (int) $member->getAttribute('dues');
                    $faites = (int) $member->getAttribute('faites');

                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'department' => $member->departement?->nom,
                        'dues' => $dues,
                        'done' => $faites,
                        'justified' => (int) $member->getAttribute('justifiees'),
                        'unjustified' => (int) $member->getAttribute('non_justifiees'),
                        'open' => (int) $member->getAttribute('ouvertes'),
                        'rate' => $dues > 0 ? (int) round($faites / $dues * 100) : null,
                    ];
                })
                ->values()
            : collect();

        return Inertia::render('dashboard', [
            'stats' => [
                'tasksToday' => (int) $taskStats->due_today,
                'openTasks' => (int) $taskStats->open_count,
                'lateTasks' => (int) $taskStats->late_count,
                'doneToday' => (int) $taskStats->done_today,
                'dueTasks' => $taskScope(Tache::query())
                    ->where('statut', StatutTache::AFaire)
                    ->whereDate('date_due', '<=', today())
                    ->count(),
                'pendingApprovals' => 0,
                'ddeToValidate' => $taskScope(Tache::query())->where('dde_statut', 'a_valider')->count(),
                'requisitionsInCircuit' => $niveau <= 2
                    ? Requisition::query()->whereIn('statut', ['demandee', 'verifiee'])->count()
                    : 0,
                'openIncidents' => $niveau <= 2
                    ? Incident::query()->where('statut', '!=', 'cloture')->count()
                    : 0,
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
            'overdueTasks' => $taskScope(Tache::query())
                ->where('statut', StatutTache::AFaire)
                ->whereDate('date_due', '<', today())
                ->with(['responsable:id,name', 'departement:id,code,nom'])
                ->orderBy('date_due')
                ->limit(25)
                ->get(),
            'decisions' => $niveau <= 3
                ? $taskScope(Tache::query())
                    ->where('dde_statut', 'a_valider')
                    ->with('responsable:id,name')
                    ->orderBy('date_due')
                    ->limit(25)
                    ->get()
                    ->map(function ($task): array {
                        if (! $task instanceof Tache) {
                            throw new \LogicException('Une tâche était attendue dans le pipeline de décision.');
                        }

                        return [
                            'id' => $task->id,
                            'reference' => $task->reference,
                            'title' => $task->titre,
                            'description' => $task->motif_precision,
                            'responsible' => $task->responsable?->name,
                            'nature' => 'DDE à valider',
                            'estimatedCost' => null,
                        ];
                    })
                    ->values()
                : collect(),
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
            'hierarchyLevel' => $niveau,
            'commercial' => [
                'total' => $ventesTotal,
                'count' => $recoltes->count(),
                'outstanding' => 0,
                'channels' => $recoltes
                    ->filter(fn (Recolte $recolte): bool => filled($recolte->canal_commercial))
                    ->groupBy('canal_commercial')
                    ->map(function ($items, string $channel) use ($ventesTotal): array {
                        $amount = round((float) $items->sum('valeur'), 2);

                        return [
                            'channel' => $channel,
                            'amount' => $amount,
                            'share' => $ventesTotal > 0 ? (int) round($amount / $ventesTotal * 100) : 0,
                            'count' => $items->count(),
                        ];
                    })
                    ->values(),
            ],
            'equipment' => [
                'maintenanceDue' => $equipements->sum(fn (Equipement $equipment): int => $equipment->entretiensDus()->count()),
                'unavailable' => $equipements->whereIn('statut', ['maintenance', 'immobilise'])->count(),
                'active' => $equipements->count(),
                'thirdPartyRevenue' => round((float) TravailEquipement::query()
                    ->where('nature', 'tiers')
                    ->whereBetween('date', [$periodeDebut, today()])
                    ->sum('montant_facture'), 2),
                'operatingCosts' => round(
                    (float) TravailEquipement::query()->whereBetween('date', [$periodeDebut, today()])->sum('cout_carburant')
                    + (float) InterventionEquipement::query()->whereBetween('date', [$periodeDebut, today()])->sum('cout_pieces')
                    + (float) InterventionEquipement::query()->whereBetween('date', [$periodeDebut, today()])->sum('cout_main_oeuvre'),
                    2
                ),
            ],
            'performance' => $performance,
            'maintenance' => [
                'openOrders' => (int) $maintenanceBacklog['total'],
                'urgentOrders' => (int) $maintenanceBacklog['urgents'],
                'overThirtyDays' => (int) $maintenanceBacklog['plus_30j'],
                'preventiveShare' => $maintenanceIndicators['part_preventif'],
                'averageRepairHours' => $maintenanceIndicators['temps_reparation'],
                'downtimeHours' => $maintenanceIndicators['immobilisation'],
                'recurringFailures' => (int) $maintenanceIndicators['recurrents'],
            ],
        ]);
    }
}
