<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FarmRecord;
use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReferenceItemController extends Controller
{
    public const CATEGORIES = [
        'parcelles' => 'Parcelles et blocs',
        'ateliers' => 'Ateliers d’élevage',
        'cultures' => 'Cultures',
        'agents_agri' => 'Équipe agricole',
        'agents_ani' => 'Équipe élevage',
        'taches_agri' => 'Tâches agricoles',
        'taches_porcherie' => 'Tâches — porcherie',
        'taches_poulailler' => 'Tâches — poulailler',
        'taches_bovins' => 'Tâches — bovins',
        'taches_pisciculture' => 'Tâches — pisciculture',
        'unites' => 'Unités de mesure',
        'produits' => 'Produits et intrants',
        'soins' => 'Soins vétérinaires',
        'destinations' => 'Destinations des récoltes',
        'aliments_porcherie' => 'Aliments — porcherie',
        'aliments_poulailler' => 'Aliments — poulailler',
        'aliments_bovins' => 'Aliments — bovins',
        'aliments_pisciculture' => 'Aliments — pisciculture',
        'epi_types' => 'Types d’EPI',
        'tailles' => 'Tailles d’EPI',
    ];

    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        return Inertia::render('admin/references', [
            'categories' => self::CATEGORIES,
            'items' => ReferenceItem::query()
                ->with('memberAccount:id,name,reference_item_id')
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get(),
            'stats' => [
                'users' => User::count(),
                'records' => FarmRecord::count(),
                'reports' => FarmRecord::where('record_key', 'like', 'rap:%')->count(),
                'references' => ReferenceItem::count(),
                'activeReferences' => ReferenceItem::where('active', true)->count(),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        ReferenceItem::create($this->validated($request));

        return back()->with('success', 'Élément ajouté au référentiel.');
    }

    public function update(Request $request, ReferenceItem $referenceItem): RedirectResponse
    {
        $this->ensureAdmin($request);
        $referenceItem->update($this->validated($request, $referenceItem));

        return back()->with('success', 'Référentiel mis à jour.');
    }

    public function destroy(Request $request, ReferenceItem $referenceItem): RedirectResponse
    {
        $this->ensureAdmin($request);
        $referenceItem->delete();

        return back()->with('success', 'Élément supprimé.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?ReferenceItem $referenceItem = null): array
    {
        $request->merge([
            'label' => trim((string) $request->input('label')),
            'description' => filled($request->input('description'))
                ? trim((string) $request->input('description'))
                : null,
        ]);

        return $request->validate([
            'category' => ['required', Rule::in(array_keys(self::CATEGORIES))],
            'label' => [
                'required',
                'string',
                'max:160',
                Rule::unique(ReferenceItem::class, 'label')
                    ->where(fn ($query) => $query->where('category', $request->input('category')))
                    ->ignore($referenceItem),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'active' => ['required', 'boolean'],
        ]);
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
