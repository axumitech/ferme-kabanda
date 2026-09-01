<?php

namespace App\Http\Controllers;

use App\Models\MatiereActive;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MatiereActiveController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('matieres-actives/index', [
            'matieres' => MatiereActive::query()->withCount('traitements')->orderBy('nom')->get(),
            'familles' => MatiereActive::FAMILLES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('matieres-actives/form', [
            'mode' => 'create',
            'matiere' => null,
            'familles' => MatiereActive::FAMILLES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $matiere = MatiereActive::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('matieres-actives.create')->with('success', 'Matière active créée. Vous pouvez en ajouter une autre.');
        }

        return redirect()->route('matieres-actives.edit', $matiere)->with('success', 'Matière active créée.');
    }

    public function edit(MatiereActive $matiereActive): Response
    {
        return Inertia::render('matieres-actives/form', [
            'mode' => 'edit',
            'matiere' => $matiereActive,
            'familles' => MatiereActive::FAMILLES,
        ]);
    }

    public function update(Request $request, MatiereActive $matiereActive): RedirectResponse
    {
        $matiereActive->update($this->validated($request, $matiereActive));

        return redirect()->route('matieres-actives.index')->with('success', 'Matière active modifiée.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?MatiereActive $matiere = null): array
    {
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:255', Rule::unique('matieres_actives', 'nom')->ignore($matiere)],
            'famille' => ['required', Rule::in(array_keys(MatiereActive::FAMILLES))],
            'groupe_frac' => ['nullable', 'string', 'max:16'],
            'groupe_irac' => ['nullable', 'string', 'max:16'],
            'groupe_hrac' => ['nullable', 'string', 'max:16'],
            'mode_action' => ['nullable', 'string', 'max:255'],
            'dar_jours' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'delai_reentree_heures' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'interdit' => ['required', 'boolean'],
            'motif_interdiction' => ['nullable', 'required_if:interdit,true', 'string', 'max:255'],
            'actif' => ['required', 'boolean'],
        ]);

        if ($data['famille'] !== 'fongicide') {
            $data['groupe_frac'] = null;
        }
        if (! in_array($data['famille'], ['insecticide', 'acaricide'], true)) {
            $data['groupe_irac'] = null;
        }
        if ($data['famille'] !== 'herbicide') {
            $data['groupe_hrac'] = null;
        }
        if (! $data['interdit']) {
            $data['motif_interdiction'] = null;
        }

        return $data;
    }
}
