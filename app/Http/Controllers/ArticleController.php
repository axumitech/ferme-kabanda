<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Site;
use App\Models\Unite;
use App\Services\MagasinService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ArticleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('magasin/index', [
            'articles' => Article::query()->with(['uniteAchat', 'uniteUsage', 'site'])->orderBy('code')->get()
                ->map(fn (Article $article): array => $this->present($article)),
            'categories' => Article::CATEGORIES,
            'unites' => Unite::query()->where('actif', true)->orderBy('conditionnement')->orderBy('nom')
                ->get(['id', 'nom', 'dimension']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('magasin/form', $this->formProps('create'));
    }

    public function store(Request $request): RedirectResponse
    {
        $article = Article::query()->create(array_merge($this->validated($request), ['quantite_base' => 0]));

        if ($request->boolean('_create_another')) {
            return redirect()->route('magasin.create')->with('success', 'Article créé. Vous pouvez en ajouter un autre.');
        }

        return redirect()->route('magasin.show', $article)->with('success', 'Article créé.');
    }

    public function show(Article $article): Response
    {
        $article->load(['uniteAchat', 'uniteUsage', 'site']);

        return Inertia::render('magasin/show', [
            'article' => $this->present($article),
            'mouvements' => $article->mouvements()->with('unite')->latest('created_at')->get(),
            'unites' => Unite::query()->where('actif', true)->where('dimension', $article->uniteUsage->dimension)
                ->orderBy('conditionnement')->orderBy('nom')->get(['id', 'nom', 'code']),
            'categories' => Article::CATEGORIES,
        ]);
    }

    public function edit(Article $article): Response
    {
        return Inertia::render('magasin/form', $this->formProps('edit', $article));
    }

    public function update(Request $request, Article $article): RedirectResponse
    {
        $article->update($this->validated($request, $article));

        return redirect()->route('magasin.show', $article)->with('success', 'Article modifié.');
    }

    public function entry(Request $request, Article $article, MagasinService $magasin): RedirectResponse
    {
        return $this->movement($request, $article, $magasin, 'entree');
    }

    public function output(Request $request, Article $article, MagasinService $magasin): RedirectResponse
    {
        return $this->movement($request, $article, $magasin, 'sortie');
    }

    /** @return array<string, mixed> */
    private function formProps(string $mode, ?Article $article = null): array
    {
        return [
            'mode' => $mode, 'article' => $article, 'categories' => Article::CATEGORIES,
            'unites' => Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom', 'dimension']),
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
        ];
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Article $article = null): array
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:60', Rule::unique('articles', 'code')->ignore($article)],
            'categorie' => ['required', Rule::in(array_keys(Article::CATEGORIES))],
            'libelle' => ['required', 'string', 'max:180'],
            'unite_achat_id' => ['required', 'exists:unites,id'], 'unite_usage_id' => ['required', 'exists:unites,id'],
            'facteur_personnalise' => ['nullable', 'numeric', 'min:0'], 'produit_terrain' => ['nullable', 'string', 'max:255'],
            'prix_unitaire' => ['nullable', 'numeric', 'min:0'], 'seuil_min' => ['nullable', 'numeric', 'min:0'],
            'site_id' => ['nullable', 'exists:sites,id'], 'centre_cout' => ['nullable', 'string', 'max:30'],
            'actif' => ['required', 'boolean'],
        ]);
        $achat = Unite::query()->findOrFail((int) $data['unite_achat_id']);
        $usage = Unite::query()->findOrFail((int) $data['unite_usage_id']);
        if (! $achat->estCompatible($usage)) {
            throw ValidationException::withMessages(['unite_usage_id' => 'L’unité d’usage doit avoir la même dimension que l’unité d’achat.']);
        }

        return $data;
    }

    private function movement(Request $request, Article $article, MagasinService $magasin, string $type): RedirectResponse
    {
        $data = $request->validate([
            'quantite' => ['required', 'numeric', 'gt:0'], 'unite_id' => ['required', 'exists:unites,id'],
            'motif' => ['required', 'string', 'max:1000'],
        ]);
        $unit = Unite::query()->findOrFail((int) $data['unite_id']);
        try {
            if ($type === 'entree') {
                $magasin->entree($article, (float) $data['quantite'], $unit, $data['motif']);
            } else {
                $magasin->sortie($article, (float) $data['quantite'], $unit, $data['motif']);
            }
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['quantite' => $exception->getMessage()]);
        }

        return back()->with('success', ucfirst($type).' écrite au registre.');
    }

    /** @return array<string, mixed> */
    private function present(Article $article): array
    {
        return array_merge($article->toArray(), [
            'stock_usage' => $article->stockUsage(), 'stock_achat' => $article->stockAchat(),
            'sous_seuil' => $article->sousSeuil(), 'valeur_stock' => $article->valeur(),
        ]);
    }
}
