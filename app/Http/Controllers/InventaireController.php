<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\CampagneInventaire;
use App\Models\Emplacement;
use App\Models\LigneInventaire;
use App\Models\Site;
use App\Services\InventaireService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class InventaireController extends Controller
{
    public function index(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('inventaires/index', [
            'inventaires' => CampagneInventaire::query()->with('site:id,nom')->orderByDesc('date_comptage')->get()
                ->map(function (CampagneInventaire $campaign): array {
                    return [...$campaign->toArray(), 'avancement' => $campaign->avancement()];
                }),
            'statuts' => CampagneInventaire::STATUTS,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('inventaires/form', [
            'types' => CampagneInventaire::TYPES,
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
            'categories' => Article::CATEGORIES,
            'emplacements' => Emplacement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'libelle']),
            'today' => today()->toDateString(),
        ]);
    }

    public function store(Request $request, InventaireService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate([
            'libelle' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(array_keys(CampagneInventaire::TYPES))],
            'date_comptage' => ['required', 'date'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'categorie' => ['nullable', Rule::in(array_keys(Article::CATEGORIES))],
            'classe_abc' => ['nullable', Rule::in(['A', 'B', 'C'])],
            'emplacement_id' => ['nullable', 'exists:emplacements,id'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $campaign = $service->ouvrir($data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['libelle' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('inventaires.create')->with('success', 'Inventaire ouvert. Vous pouvez en ouvrir un autre.');
        }

        return redirect()->route('inventaires.show', $campaign)->with('success', 'Inventaire ouvert — le stock théorique a été figé.');
    }

    public function show(Request $request, CampagneInventaire $inventaire): Response
    {
        $this->admin($request);
        $inventaire->load('site:id,nom');

        return Inertia::render('inventaires/show', [
            'inventaire' => [...$inventaire->toArray(), 'avancement' => $inventaire->avancement()],
            'lignes' => $inventaire->lignes()->with(['article.uniteUsage', 'emplacement:id,code'])->orderBy('statut')->get()
                ->map(fn (LigneInventaire $line): array => $this->linePayload($line)),
            'causes' => LigneInventaire::CAUSES,
            'canClose' => (int) ($request->user()->niveau_hierarchie ?? 4) <= 2,
        ]);
    }

    public function countLine(Request $request, CampagneInventaire $inventaire, LigneInventaire $ligne, InventaireService $service): RedirectResponse
    {
        $this->admin($request);
        $this->belongsToCampaign($inventaire, $ligne);
        $data = $request->validate([
            'compte' => ['required', 'numeric', 'min:0'],
            'observation' => ['nullable', 'string', 'max:1000'],
            'recomptage' => ['required', 'boolean'],
        ]);

        return $this->transition(
            fn () => $service->compter($ligne, (float) $data['compte'], $data['observation'] ?? null, (bool) $data['recomptage']),
            'Comptage enregistré.',
        );
    }

    public function arbitrateLine(Request $request, CampagneInventaire $inventaire, LigneInventaire $ligne, InventaireService $service): RedirectResponse
    {
        $this->admin($request);
        $this->belongsToCampaign($inventaire, $ligne);
        $data = $request->validate([
            'cause' => ['required', Rule::in(array_keys(LigneInventaire::CAUSES))],
            'observation' => ['nullable', 'string', 'max:1000'],
        ]);

        return $this->transition(
            fn () => $service->arbitrer($ligne, $data['cause'], $data['observation'] ?? null),
            'Écart arbitré.',
        );
    }

    public function close(Request $request, CampagneInventaire $inventaire, InventaireService $service): RedirectResponse
    {
        $this->admin($request);

        return $this->transition(
            fn () => $service->cloturer($inventaire),
            'Inventaire clôturé — les ajustements sont écrits au registre.',
        );
    }

    public function recalculateAbc(Request $request, InventaireService $service): RedirectResponse
    {
        $this->admin($request);
        $result = $service->classerAbc();

        return back()->with('success', sprintf(
            'Classification ABC recalculée — A : %d · B : %d · C : %d articles.',
            $result['A'], $result['B'], $result['C'],
        ));
    }

    /** @return array<string, mixed> */
    private function linePayload(LigneInventaire $line): array
    {
        $unit = $line->article->uniteUsage;
        $isCounted = $line->compte_base !== null;

        return [
            'id' => $line->id,
            'article' => ['code' => $line->article->code, 'libelle' => $line->article->libelle],
            'unite' => $unit->nom,
            'emplacement' => $line->emplacement?->code,
            // Comptage à l'aveugle : le théorique n'est transmis qu'après la première saisie.
            'theorique' => $isCounted ? $unit->depuisBase((float) $line->theorique_base) : null,
            'compte' => $isCounted ? $unit->depuisBase((float) $line->compte_base) : null,
            'recompte' => $line->recompte_base !== null ? $unit->depuisBase((float) $line->recompte_base) : null,
            'ecart' => $line->ecart_base !== null ? $unit->depuisBase((float) $line->ecart_base) : null,
            'taux_ecart' => $line->tauxEcart(),
            'ecart_valeur' => $line->ecart_valeur,
            'cause' => $line->cause,
            'observation' => $line->observation,
            'statut' => $line->statut,
        ];
    }

    private function transition(callable $action, string $message): RedirectResponse
    {
        try {
            $action();
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['action' => $exception->getMessage()]);
        }

        return back()->with('success', $message);
    }

    private function belongsToCampaign(CampagneInventaire $campaign, LigneInventaire $line): void
    {
        abort_unless($line->campagne_inventaire_id === $campaign->id, 404);
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
