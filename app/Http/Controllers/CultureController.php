<?php

namespace App\Http\Controllers;

use App\Models\Culture;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CultureController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('cultures/index', [
            'cultures' => Culture::query()->withCount('plantations')->orderBy('id')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('cultures/form', ['mode' => 'create', 'culture' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $culture = Culture::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('cultures.create')->with('success', 'Culture créée. Vous pouvez en ajouter une autre.');
        }

        return redirect()->route('cultures.edit', $culture)->with('success', 'Culture créée.');
    }

    public function edit(Culture $culture): Response
    {
        return Inertia::render('cultures/form', ['mode' => 'edit', 'culture' => $culture]);
    }

    public function update(Request $request, Culture $culture): RedirectResponse
    {
        $culture->update($this->validated($request, $culture));

        return redirect()->route('cultures.index')->with('success', 'Culture modifiée.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Culture $culture = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('cultures', 'code')->ignore($culture)],
            'nom' => ['required', 'string', 'max:255'],
            'famille' => ['nullable', 'string', 'max:48'],
            'delai_rotation' => ['nullable', 'integer', 'min:0', 'max:255'],
            'unite_recolte' => ['required', 'string', 'max:24'],
            'unite_travail' => ['required', 'string', 'max:24'],
            'jours_maturite' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'actif' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
