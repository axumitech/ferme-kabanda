<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\AnimalEvenement;
use App\Models\Loge;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnimalController extends Controller
{
    private const ESPECES = ['porc' => 'Porc', 'bovin' => 'Bovin', 'volaille' => 'Volaille', 'poisson' => 'Poisson'];

    private const STADES = [
        'Porcelet pré-sevrage', 'Porcelet sevré', 'Porcelets en croissance', 'Porcs en finition',
        'Truie en début de gestation', 'Truie en fin de gestation', 'Truie allaitante',
        'Verrat', 'Truie tarie (hors production)',
    ];

    public function index(): Response
    {
        return Inertia::render('animaux/index', [
            'animaux' => Animal::query()->with(['loge:id,numero', 'mere:id,code'])->orderBy('code')->get(),
            'especes' => self::ESPECES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('animaux/form', $this->formProps('create'));
    }

    public function store(Request $request): RedirectResponse
    {
        $animal = Animal::query()->create(array_merge($this->validated($request), [
            'cree_par_id' => $request->user()?->id,
            'statut' => 'present',
        ]));
        $this->event($request, $animal, [
            'type' => $animal->origine === 'Né sur le site' ? 'naissance' : 'entree',
            'date' => $animal->naissance ? Carbon::parse($animal->naissance)->toDateString() : today()->toDateString(),
            'titre' => $animal->origine === 'Né sur le site' ? 'Naissance' : 'Entrée au registre — '.($animal->origine ?? 'origine non précisée'),
        ]);

        if ($request->boolean('_create_another')) {
            return redirect()->route('animaux.create')->with('success', 'Animal créé. Vous pouvez en ajouter un autre.');
        }

        return redirect()->route('animaux.show', $animal)->with('success', 'Animal créé.');
    }

    public function show(Animal $animal): Response
    {
        $animal->load(['loge', 'mere', 'site', 'cycles']);
        $events = $animal->evenements()->orderByDesc('date')->orderByDesc('id')->get();

        return Inertia::render('animaux/show', [
            'animal' => $animal,
            'evenements' => $events,
            'types' => AnimalEvenement::TYPES,
            'age' => $animal->naissance ? (int) Carbon::parse($animal->naissance)->diffInDays(today()) : null,
            'dar' => $events->first(fn (AnimalEvenement $event): bool => filled($event->dar_jusquau) && Carbon::parse($event->dar_jusquau)->gte(today())),
        ]);
    }

    public function edit(Animal $animal): Response
    {
        return Inertia::render('animaux/form', $this->formProps('edit', $animal));
    }

    public function update(Request $request, Animal $animal): RedirectResponse
    {
        $animal->update($this->validated($request, $animal));

        return redirect()->route('animaux.show', $animal)->with('success', 'Fiche animale modifiée.');
    }

    public function weigh(Request $request, Animal $animal): RedirectResponse
    {
        $data = $request->validate(['poids' => ['required', 'numeric', 'min:0'], 'date' => ['required', 'date']]);
        $animal->update(['poids' => $data['poids'], 'poids_le' => $data['date']]);
        $this->event($request, $animal, [
            'type' => 'pesee', 'date' => $data['date'], 'titre' => "Pesée — {$data['poids']} kg",
            'valeur' => $data['poids'], 'unite' => 'kg',
        ]);

        return back()->with('success', 'Pesée enregistrée.');
    }

    public function treat(Request $request, Animal $animal): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['traitement', 'vaccination', 'vermifugation', 'supplementation'])],
            'produit' => ['required', 'string', 'max:255'], 'lot_produit' => ['required', 'string', 'max:48'],
            'dose' => ['required', 'string', 'max:48'], 'voie' => ['required', Rule::in(['IM', 'SC', 'IV', 'Oral', 'Topique'])],
            'duree_jours' => ['nullable', 'integer', 'min:1'], 'dar_jours' => ['nullable', 'integer', 'min:0'],
            'prescripteur' => ['nullable', 'string', 'max:255'], 'date' => ['required', 'date'],
            'detail' => ['nullable', 'string', 'max:5000'],
        ]);
        $date = Carbon::parse($data['date']);
        $this->event($request, $animal, array_merge($data, [
            'titre' => (AnimalEvenement::TYPES[$data['type']] ?? 'Soin').' — '.$data['produit'],
            'fin_traitement' => filled($data['duree_jours'] ?? null) ? $date->copy()->addDays((int) $data['duree_jours'] - 1) : null,
            'dar_jusquau' => filled($data['dar_jours'] ?? null) ? $date->copy()->addDays((int) $data['dar_jours']) : null,
        ]));

        return back()->with('success', 'Soin consigné au carnet.');
    }

    public function observe(Request $request, Animal $animal): RedirectResponse
    {
        $data = $request->validate(['texte' => ['required', 'string', 'max:5000']]);
        $this->event($request, $animal, [
            'type' => 'observation', 'date' => today()->toDateString(), 'titre' => 'Observation', 'detail' => $data['texte'],
        ]);

        return back()->with('success', 'Observation ajoutée.');
    }

    public function exit(Request $request, Animal $animal): RedirectResponse
    {
        $data = $request->validate([
            'motif' => ['required', Rule::in(['VENTE', 'ABATTAGE', 'RÉFORME', 'TRANSFERT', 'MORTALITÉ'])],
            'valeur' => ['nullable', 'numeric', 'min:0'], 'note' => ['nullable', 'string', 'max:5000'],
        ]);
        $animal->update([
            'statut' => $data['motif'] === 'MORTALITÉ' ? 'mort' : 'sorti', 'sortie_le' => today(),
            'sortie_motif' => $data['motif'], 'sortie_valeur' => $data['valeur'] ?? null, 'sortie_note' => $data['note'] ?? null,
        ]);
        $this->event($request, $animal, [
            'type' => $data['motif'] === 'MORTALITÉ' ? 'mort' : 'sortie', 'date' => today()->toDateString(),
            'titre' => 'Sortie — '.$data['motif'], 'detail' => $data['note'] ?? null,
            'valeur' => $data['valeur'] ?? null, 'unite' => filled($data['valeur'] ?? null) ? 'USD' : null,
        ]);

        return back()->with('success', 'Sortie consignée — la fiche reste au registre.');
    }

    /** @return array<string, mixed> */
    private function formProps(string $mode, ?Animal $animal = null): array
    {
        return [
            'mode' => $mode, 'animal' => $animal, 'especes' => self::ESPECES,
            'cohortes' => Animal::COHORTES,
            'meres' => Animal::query()->where('sexe', 'femelle')->orderBy('code')->get(['id', 'code']),
            'loges' => Loge::query()->where('actif', true)->orderBy('atelier')->orderBy('numero')->get(['id', 'atelier', 'numero']),
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
            'stades' => self::STADES,
        ];
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Animal $animal = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', Rule::unique('animaux', 'code')->ignore($animal)],
            'espece' => ['required', Rule::in(array_keys(self::ESPECES))], 'categorie' => ['required', 'string', 'max:48'],
            'sexe' => ['nullable', Rule::in(['femelle', 'male', 'mixte'])], 'effectif' => ['required', 'integer', 'min:1'],
            'ligne' => ['nullable', Rule::in(['Pure', 'Terminale'])], 'cohorte' => ['nullable', Rule::in(array_keys(Animal::COHORTES))],
            'encoche' => ['nullable', 'string', 'max:32'], 'naissance' => ['nullable', 'date'],
            'origine' => ['nullable', Rule::in(['Né sur le site', 'Acheté', 'Transfert', 'Don'])],
            'mere_id' => ['nullable', 'exists:animaux,id'], 'pere' => ['nullable', 'string', 'max:32'],
            'atelier' => ['nullable', 'string', 'max:255'], 'loge_id' => ['nullable', 'exists:loges,id'],
            'site_id' => ['nullable', 'exists:sites,id'], 'stade_alimentaire' => ['nullable', 'string', 'max:48'],
        ]);
        if ($data['espece'] === 'porc') {
            $data['verrat_interdit'] = Animal::COHORTES[$data['cohorte'] ?? ''] ?? null;
        } else {
            $data['ligne'] = $data['cohorte'] = $data['verrat_interdit'] = null;
        }

        return $data;
    }

    /** @param array<string, mixed> $data */
    private function event(Request $request, Animal $animal, array $data): void
    {
        $animal->evenements()->create(array_merge($data, [
            'user_id' => $request->user()?->id,
            'user_nom' => $request->user()->name,
            'created_at' => now(),
        ]));
    }
}
