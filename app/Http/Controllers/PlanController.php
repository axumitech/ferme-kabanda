<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanLigne;
use App\Services\PlanExploitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PlanController extends Controller
{
    public function index(): Response
    {
        $plans = Plan::query()
            ->withCount('lignes')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Plan $plan): array => $this->payload($plan));

        return Inertia::render('plans/index', [
            'plans' => $plans,
            'summary' => [
                'total' => $plans->count(),
                'drafts' => $plans->where('statut', 'brouillon')->count(),
                'active' => $plans->where('statut', 'en_vigueur')->count(),
                'lineages' => $plans->pluck('code')->unique()->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('plans/form');
    }

    public function store(Request $request, PlanExploitationService $service): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/'],
            'libelle' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:2000'],
            'create_another' => ['nullable', 'boolean'],
        ]);

        $plan = $service->creer($data);

        if ($request->boolean('create_another')) {
            return redirect()->route('plans.create')->with('success', "Plan {$plan->code} v{$plan->version} créé. Vous pouvez en créer un autre.");
        }

        return redirect()->route('plans.show', $plan)->with('success', "Plan {$plan->code} v{$plan->version} créé en brouillon.");
    }

    public function show(Plan $plan): Response
    {
        $plan->load(['lignes' => fn ($query) => $query->orderByRaw('jour_offset is null')->orderBy('jour_offset')->orderBy('tache')]);

        return Inertia::render('plans/show', [
            'plan' => array_merge($this->payload($plan), [
                'note' => $plan->note,
                'lines' => $plan->lignes->map(fn (PlanLigne $line): array => [
                    'id' => $line->id,
                    'cible' => $line->cible,
                    'code_cible' => $line->code_cible,
                    'jour_offset' => $line->jour_offset,
                    'recurrence' => $line->recurrence,
                    'tache' => $line->tache,
                    'instruction' => $line->instruction,
                    'quantite' => $line->quantite,
                    'unite' => $line->unite,
                    'categorie' => $line->categorie,
                    'priorite' => $line->priorite,
                    'point_controle' => $line->point_controle,
                    'preuve' => $line->preuve,
                ])->values(),
            ]),
            'versions' => Plan::query()
                ->where('code', $plan->code)
                ->orderByDesc('version')
                ->get()
                ->map(fn (Plan $version): array => $this->payload($version)),
        ]);
    }

    public function duplicate(Plan $plan, PlanExploitationService $service): RedirectResponse
    {
        $nouveau = $service->dupliquer($plan);

        return redirect()->route('plans.show', $nouveau)
            ->with('success', "Version {$nouveau->version} créée en brouillon avec toutes les lignes du plan source.");
    }

    public function regenerate(Plan $plan, PlanExploitationService $service): RedirectResponse
    {
        try {
            $resultat = $service->regenererDates($plan);
        } catch (RuntimeException $exception) {
            return back()->withErrors(['plan' => $exception->getMessage()]);
        }

        $message = $resultat['taches'] > 0
            ? "{$resultat['taches']} tâche(s) datée(s) générée(s) sur {$resultat['plantations']} plantation(s)."
            : 'Aucune tâche nouvelle : toutes les dates sont déjà générées.';

        return back()->with('success', $message);
    }

    /** @return array<string, mixed> */
    private function payload(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'libelle' => $plan->libelle,
            'version' => $plan->version,
            'statut' => $plan->statut,
            'date_effet' => $plan->date_effet?->toDateString(),
            'lignes_count' => $plan->lignes_count ?? $plan->lignes()->count(),
            'created_at' => $plan->created_at?->toIso8601String(),
        ];
    }
}
