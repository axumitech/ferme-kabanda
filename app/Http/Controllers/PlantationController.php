<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Culture;
use App\Models\MatiereActive;
use App\Models\Parcelle;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Site;
use App\Services\PlantationService;
use App\Services\ProtectionCulturesService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PlantationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('plantations/index', [
            'plantations' => Plantation::query()
                ->with(['culture:id,nom,unite_recolte', 'parcelle:id,code,nom'])
                ->withSum('recoltes as total_recolte', 'quantite')
                ->latest('j0')->get(),
            'filters' => [
                'cultures' => Culture::query()->orderBy('nom')->get(['id', 'nom']),
                'statuses' => $this->statuses(),
            ],
            'today' => now('Africa/Kinshasa')->toDateString(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('plantations/form', [
            'options' => $this->createOptions(),
            'today' => now('Africa/Kinshasa')->toDateString(),
        ]);
    }

    public function store(Request $request, PlantationService $service): RedirectResponse
    {
        $data = $request->validate([
            'culture_id' => ['required', Rule::exists('cultures', 'id')->where('actif', true)],
            'parcelle_id' => ['required', Rule::exists('parcelles', 'id')->where('actif', true)],
            'lieu' => ['nullable', 'string', 'max:180'],
            'surface_m2' => ['nullable', 'numeric', 'min:0'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'j0' => ['required', 'date'],
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:24'],
            'forcer_rotation' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);
        try {
            $plantation = $service->planter($data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['lieu' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('plantations.create')->with('success', 'Plantation créée. Vous pouvez en ajouter une autre.');
        }

        return redirect()->route('plantations.show', $plantation)->with('success', 'Plantation créée et tracée.');
    }

    public function show(Request $request, Plantation $plantation): Response
    {
        $plantation->load([
            'culture', 'parcelle:id,code,nom', 'site:id,code,nom',
            'recoltes' => fn ($query) => $query->orderByDesc('date'),
            'taches' => fn ($query) => $query->orderBy('date_due'),
            'traitements.matiereActive',
        ]);

        return Inertia::render('plantations/show', [
            'plantation' => $plantation,
            'initialAction' => $request->string('action')->toString(),
            'today' => now('Africa/Kinshasa')->toDateString(),
            'options' => [
                'matieres' => MatiereActive::query()->where('actif', true)->orderBy('nom')->get()
                    ->map(fn (MatiereActive $matiere) => [
                        'id' => $matiere->id,
                        'label' => ($matiere->interdit ? '⛔ INTERDIT — ' : '').$matiere->nom.' ('.$matiere->libelleGroupe().')',
                        'dar_jours' => $matiere->dar_jours,
                    ]),
                'articles' => Article::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'libelle']),
                'canaux' => Recolte::CANAUX,
            ],
        ]);
    }

    public function treat(Request $request, Plantation $plantation, ProtectionCulturesService $service): RedirectResponse
    {
        abort_unless($plantation->statut === 'active', 422);
        $data = $request->validate([
            'date' => ['required', 'date', 'before_or_equal:today'],
            'matiere_active_id' => ['nullable', 'exists:matieres_actives,id'],
            'produit' => ['required', 'string', 'max:255'],
            'lot_produit' => ['nullable', 'string', 'max:255'],
            'dose_valeur' => ['required', 'numeric', 'gt:0'],
            'dose_unite' => ['required', Rule::in(['g/planche', 'ml/planche', 'g/pied', 'ml/pied'])],
            'planches_traitees' => ['nullable', 'numeric', 'min:0'],
            'cible' => ['nullable', 'string', 'max:255'],
            'dar_jours' => ['required', 'integer', 'min:0', 'max:3650'],
            'article_id' => ['nullable', 'exists:articles,id'],
            'quantite_sortie' => ['nullable', 'numeric', 'gt:0', 'required_with:article_id'],
            'epi_porte' => ['accepted'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ]);
        if ($request->hasFile('photo')) {
            $data['photo_chemin'] = $request->file('photo')?->store('traitements', 'public');
        }
        try {
            $service->traiter($plantation, $data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['produit' => $exception->getMessage()]);
        }

        return back()->with('success', 'Traitement consigné — la date de récolte autorisée est calculée.');
    }

    public function harvest(Request $request, Plantation $plantation, PlantationService $service): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'], 'quantite' => ['required', 'numeric', 'gt:0'],
            'unite' => ['required', 'string', 'max:24'], 'qualite' => ['nullable', Rule::in(['A', 'B', 'C'])],
            'canal_commercial' => ['required', 'string', 'max:48'], 'pertes' => ['nullable', 'numeric', 'min:0'],
            'valeur' => ['nullable', 'numeric', 'min:0'],
        ]);
        try {
            $service->recolter($plantation, $data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['date' => $exception->getMessage()]);
        }

        return back()->with('success', "Récolte enregistrée sur {$plantation->reference}.");
    }

    public function generate(Plantation $plantation, PlantationService $service): RedirectResponse
    {
        $count = $service->genererTaches($plantation);

        return back()->with('success', $count ? "{$count} tâche(s) générée(s)." : 'Aucune nouvelle tâche du plan à générer.');
    }

    public function finish(Request $request, Plantation $plantation, PlantationService $service): RedirectResponse
    {
        $data = $request->validate(['motif' => ['required', 'string', 'max:255']]);
        $service->terminer($plantation, $data['motif']);

        return back()->with('success', 'Plantation clôturée.');
    }

    /** @return array<string, mixed> */
    private function createOptions(): array
    {
        return [
            'cultures' => Culture::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom', 'unite_travail']),
            'parcelles' => Parcelle::query()->where('actif', true)->whereIn('type', ['parc', 'planche'])
                ->withCount(['plantations as cultures_en_place' => fn ($query) => $query->where('statut', 'active')])
                ->orderBy('code')->get(['id', 'code', 'nom', 'site_id']),
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
        ];
    }

    /** @return array<int, array{value: string, label: string}> */
    private function statuses(): array
    {
        return [
            ['value' => 'active', 'label' => 'Active'], ['value' => 'recoltee', 'label' => 'Récoltée'],
            ['value' => 'terminee', 'label' => 'Terminée'], ['value' => 'echouee', 'label' => 'Échouée'],
        ];
    }
}
