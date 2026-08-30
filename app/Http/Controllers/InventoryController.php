<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Unite;
use App\Services\MagasinService;
use App\Services\VisibiliteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request, VisibiliteService $visibilite): JsonResponse
    {
        $user = $request->user();
        $voitValeursStock = $user !== null && $visibilite->peutVoir($user, 'valeurs_stock');

        $items = Article::query()
            ->where('actif', true)
            ->with(['uniteUsage:id,code,nom,dimension,vers_base,conditionnement'])
            ->orderBy('code')
            ->get()
            ->map(fn (Article $article): array => [
                'cat' => $article->categorie,
                'lib' => $article->libelle,
                'unite' => $article->uniteUsage->code,
                'qte' => $article->stockUsage(),
                // La forme reste stable pour le carnet historique, sans lui
                // transmettre les prix ni centres de coût hors portée.
                'pu' => $voitValeursStock ? (float) ($article->prix_unitaire ?? 0) : null,
                'mini' => $article->seuil_min === null ? '' : (float) $article->seuil_min,
                'cc' => $voitValeursStock ? $article->centre_cout : null,
                'code' => $article->code,
                'cree' => $article->created_at?->toDateString(),
            ])
            ->values();

        return response()->json(['items' => $items]);
    }

    public function sync(Request $request, MagasinService $magasin, VisibiliteService $visibilite): JsonResponse
    {
        $user = $request->user();
        $voitValeursStock = $user !== null && $visibilite->peutVoir($user, 'valeurs_stock');
        $validated = $request->validate([
            'items' => ['required', 'array', 'max:2000'],
            'items.*' => ['required', 'array'],
            'items.*.cat' => ['required', 'string', 'max:20'],
            'items.*.lib' => ['required', 'string', 'max:180'],
            'items.*.unite' => ['required', 'string', 'max:40'],
            'items.*.qte' => ['required', 'numeric', 'min:0', 'max:99999999999.999'],
            'items.*.pu' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'items.*.mini' => ['nullable', 'numeric', 'min:0', 'max:99999999999.999'],
            'items.*.cc' => ['nullable', 'string', 'max:30'],
            'items.*.code' => ['required', 'string', 'max:60', 'distinct'],
            'items.*.cree' => ['nullable', 'date_format:Y-m-d'],
        ]);

        DB::transaction(function () use ($validated, $magasin, $voitValeursStock): void {
            foreach ($validated['items'] as $data) {
                $unit = $this->resolveUnit((string) $data['unite']);
                $article = Article::query()->where('code', $data['code'])->lockForUpdate()->first();

                $isNew = $article === null;

                $attributes = [
                    'categorie' => $data['cat'],
                    'libelle' => $data['lib'],
                    'unite_achat_id' => $unit->id,
                    'unite_usage_id' => $unit->id,
                    'seuil_min' => filled($data['mini'] ?? null) ? $data['mini'] : null,
                    'actif' => true,
                ];
                if ($voitValeursStock) {
                    $attributes['prix_unitaire'] = $data['pu'] ?? 0;
                    $attributes['centre_cout'] = $data['cc'] ?? null;
                }

                if (! $article) {
                    $article = Article::query()->create([
                        'code' => $data['code'],
                        'quantite_base' => 0,
                    ] + $attributes);
                } else {
                    $article->update($attributes);
                }

                $article->load('uniteUsage');

                if ($isNew && (float) $data['qte'] > 0) {
                    $magasin->entree($article, (float) $data['qte'], $unit, "Solde d'ouverture synchronisé");
                } elseif (abs($article->stockUsage() - (float) $data['qte']) > 0.0001) {
                    $magasin->inventaire($article, (float) $data['qte'], $unit, 'Synchronisation terrain');
                }
            }
        }, 3);

        return $this->index($request, $visibilite);
    }

    private function resolveUnit(string $rawUnit): Unite
    {
        $code = match ($rawUnit) {
            'litre' => 'l',
            'sac 50 kg' => 'sac_50kg',
            'sac 25 kg' => 'sac_25kg',
            'pièce' => 'piece',
            'bidon' => 'bidon_5l',
            'boîte' => 'boite_12',
            'mètre' => 'm',
            default => $rawUnit,
        };

        return Unite::query()->where('code', $code)->firstOrFail();
    }
}
