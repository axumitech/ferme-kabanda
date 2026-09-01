<?php

namespace App\Http\Controllers;

use App\Models\Emplacement;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmplacementController extends Controller
{
    public function index(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('emplacements/index', [
            'emplacements' => Emplacement::query()
                ->with('site:id,nom')
                ->withCount('articles')
                ->orderBy('code')
                ->get(),
            'types' => Emplacement::TYPES,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->admin($request);

        return $this->form();
    }

    public function store(Request $request): RedirectResponse
    {
        $this->admin($request);
        $emplacement = Emplacement::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('emplacements.create')
                ->with('success', 'Emplacement créé. Vous pouvez en ajouter un autre.');
        }

        return redirect()->route('emplacements.edit', $emplacement)
            ->with('success', 'Emplacement créé — il est maintenant disponible dans les inventaires.');
    }

    public function edit(Request $request, Emplacement $emplacement): Response
    {
        $this->admin($request);

        return $this->form($emplacement);
    }

    public function update(Request $request, Emplacement $emplacement): RedirectResponse
    {
        $this->admin($request);
        $emplacement->update($this->validated($request, $emplacement));

        return redirect()->route('emplacements.index')->with('success', 'Emplacement modifié.');
    }

    private function form(?Emplacement $emplacement = null): Response
    {
        return Inertia::render('emplacements/form', [
            'mode' => $emplacement ? 'edit' : 'create',
            'emplacement' => $emplacement,
            'types' => Emplacement::TYPES,
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Emplacement $emplacement = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('emplacements', 'code')->ignore($emplacement)],
            'libelle' => ['required', 'string', 'max:255'],
            'zone' => ['nullable', 'string', 'max:24'],
            'type' => ['nullable', Rule::in(array_keys(Emplacement::TYPES))],
            'site_id' => ['nullable', 'exists:sites,id'],
            'actif' => ['required', 'boolean'],
        ]);

        $data['type'] ??= 'casier';

        return $data;
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
