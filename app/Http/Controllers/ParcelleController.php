<?php

namespace App\Http\Controllers;

use App\Models\Culture;
use App\Models\Parcelle;
use App\Models\Site;
use App\Services\PlantationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ParcelleController extends Controller
{
    public const TYPES = ['bloc' => 'Bloc', 'parc' => 'Parc', 'planche' => 'Planche'];

    public const IRRIGATIONS = [
        'goutte' => 'Goutte-à-goutte',
        'aspersion' => 'Aspersion',
        'manuel' => 'Arrosage manuel',
        'pluvial' => 'Pluvial',
    ];

    public const EXPOSITIONS = [
        'plein_soleil' => 'Plein soleil',
        'partielle' => 'Moins de 6 h de soleil',
        'ombragee' => "Moins de 50 % d'ensoleillement",
    ];

    public function index(): Response
    {
        $parcelles = Parcelle::query()
            ->with(['parent:id,nom', 'site:id,code,nom', 'plantationsActives.culture:id,nom'])
            ->withCount(['plantations as cultures_en_place' => fn ($query) => $query->where('statut', 'active')])
            ->orderBy('code')
            ->get();

        return Inertia::render('terrain/parcelles/index', [
            'parcelles' => $parcelles,
            'filters' => [
                'types' => $this->valueOptions(self::TYPES),
                'sites' => Site::query()->orderBy('nom')->get(['id', 'nom']),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('terrain/parcelles/form', [
            'mode' => 'create',
            'parcelle' => null,
            'options' => $this->formOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $parcelle = Parcelle::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('parcelles.create')->with('success', 'Parcelle créée. Vous pouvez en ajouter une autre.');
        }

        return redirect()->route('parcelles.show', $parcelle)->with('success', 'Parcelle créée.');
    }

    public function show(Parcelle $parcelle): Response
    {
        $parcelle->load([
            'parent:id,code,nom',
            'site:id,code,nom',
            'plantations' => fn ($query) => $query->with('culture:id,nom,famille')->orderByDesc('j0'),
        ]);

        return Inertia::render('terrain/parcelles/show', [
            'parcelle' => $parcelle,
            'cultures' => Culture::query()
                ->where('actif', true)
                ->orderBy('nom')
                ->get(['id', 'nom', 'famille', 'unite_travail']),
            'today' => now('Africa/Kinshasa')->toDateString(),
            'labels' => [
                'types' => self::TYPES,
                'irrigations' => self::IRRIGATIONS,
                'expositions' => self::EXPOSITIONS,
            ],
        ]);
    }

    public function edit(Parcelle $parcelle): Response
    {
        return Inertia::render('terrain/parcelles/form', [
            'mode' => 'edit',
            'parcelle' => $parcelle,
            'options' => $this->formOptions($parcelle),
        ]);
    }

    public function update(Request $request, Parcelle $parcelle): RedirectResponse
    {
        $parcelle->update($this->validated($request, $parcelle));

        return redirect()->route('parcelles.show', $parcelle)->with('success', 'Parcelle modifiée.');
    }

    public function addCulture(Request $request, Parcelle $parcelle, PlantationService $service): RedirectResponse
    {
        $data = $request->validate([
            'culture_id' => ['required', Rule::exists('cultures', 'id')->where('actif', true)],
            'j0' => ['required', 'date'],
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:24'],
            'surface_m2' => ['nullable', 'numeric', 'min:0'],
            'forcer_rotation' => ['nullable', 'boolean'],
        ]);

        if (filled($data['surface_m2'] ?? null) && $parcelle->surface_m2 !== null) {
            $occupee = (float) $parcelle->plantationsActives()->sum('surface_m2');
            if ($occupee + (float) $data['surface_m2'] > (float) $parcelle->surface_m2) {
                throw ValidationException::withMessages([
                    'surface_m2' => 'La surface occupée dépasse la surface disponible sur la parcelle.',
                ]);
            }
        }

        try {
            $service->planter(array_merge($data, [
                'parcelle_id' => $parcelle->id,
                'lieu' => $parcelle->nom,
                'site_id' => $parcelle->site_id,
            ]));
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['forcer_rotation' => $exception->getMessage()]);
        }

        return back()->with('success', "Culture ajoutée sur {$parcelle->nom}.");
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Parcelle $parcelle = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:32', Rule::unique('parcelles', 'code')->ignore($parcelle)],
            'nom' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
            'parent_id' => ['nullable', 'exists:parcelles,id', Rule::notIn(array_filter([$parcelle?->id]))],
            'site_id' => ['nullable', 'exists:sites,id'],
            'surface_m2' => ['nullable', 'numeric', 'min:0'],
            'nb_planches' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'irrigation' => ['nullable', Rule::in(array_keys(self::IRRIGATIONS))],
            'exposition' => ['nullable', Rule::in(array_keys(self::EXPOSITIONS))],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'actif' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);
    }

    /** @return array<string, mixed> */
    private function formOptions(?Parcelle $parcelle = null): array
    {
        return [
            'types' => $this->valueOptions(self::TYPES),
            'parents' => Parcelle::query()
                ->whereIn('type', ['bloc', 'parc'])
                ->when($parcelle, fn ($query) => $query->whereKeyNot($parcelle->id))
                ->orderBy('code')
                ->get(['id', 'code', 'nom']),
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
            'irrigations' => $this->valueOptions(self::IRRIGATIONS),
            'expositions' => $this->valueOptions(self::EXPOSITIONS),
        ];
    }

    /** @param array<string, string> $values
     * @return array<int, array{value: string, label: string}>
     */
    private function valueOptions(array $values): array
    {
        return collect($values)->map(fn (string $label, string $value) => compact('value', 'label'))->values()->all();
    }
}
