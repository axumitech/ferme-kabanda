<?php

namespace App\Http\Controllers;

use App\Models\PosteControle;
use App\Models\Site;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PosteControleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('postes-controle/index', [
            'posts' => PosteControle::query()
                ->with('site:id,code,nom')
                ->withCount('passages')
                ->orderBy('ordre')
                ->orderBy('code')
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return $this->form();
    }

    public function store(Request $request): RedirectResponse
    {
        $poste = PosteControle::query()->create($this->validated($request));

        if ($request->boolean('_create_another')) {
            return redirect()->route('postes-controle.create')->with('success', "{$poste->code} créé.");
        }

        return redirect()->route('postes-controle.index')->with('success', "{$poste->code} créé.");
    }

    public function edit(PosteControle $posteControle): Response
    {
        return $this->form($posteControle);
    }

    public function update(Request $request, PosteControle $posteControle): RedirectResponse
    {
        $posteControle->update($this->validated($request, $posteControle));

        return redirect()->route('postes-controle.index')->with('success', "{$posteControle->code} mis à jour.");
    }

    private function form(?PosteControle $poste = null): Response
    {
        return Inertia::render('postes-controle/form', [
            'post' => $poste,
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?PosteControle $poste = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('postes_controle', 'code')->ignore($poste?->id)],
            'nom' => ['required', 'string', 'max:255'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'ordre' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'actif' => ['required', 'boolean'],
        ]);
    }
}
