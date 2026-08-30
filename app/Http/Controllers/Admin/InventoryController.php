<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\MaterialAssignment;
use App\Models\MouvementStock;
use App\Models\ProductStock;
use App\Models\ProductStockMovement;
use App\Models\ReferenceItem;
use App\Models\Unite;
use App\Models\User;
use App\Services\MagasinService;
use App\Services\VisibiliteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(Request $request, VisibiliteService $visibilite): Response
    {
        $this->ensureAdmin($request);
        $user = $request->user();
        $voitValeursStock = $user !== null && $visibilite->peutVoir($user, 'valeurs_stock');

        $items = Article::query()
            ->with(['uniteUsage:id,code,nom,dimension,vers_base,conditionnement', 'uniteAchat:id,code,nom,dimension,vers_base,conditionnement'])
            ->orderByDesc('actif')->orderBy('code')->get()
            ->map(fn (Article $article): array => $this->articlePayload($article, $voitValeursStock));
        $stocks = ProductStock::query()
            ->with('user:id,name')->orderByDesc('active')->orderBy('product_name')->get();
        $lowItemsCount = Article::query()
            ->join('unites as unite_usage', 'unite_usage.id', '=', 'articles.unite_usage_id')
            ->where('articles.actif', true)
            ->whereNotNull('articles.seuil_min')
            ->whereRaw('articles.quantite_base <= articles.seuil_min * unite_usage.vers_base')
            ->count('articles.id');
        $inventoryValue = $voitValeursStock
            ? Article::query()
                ->join('unites as unite_achat', 'unite_achat.id', '=', 'articles.unite_achat_id')
                ->where('articles.actif', true)
                ->selectRaw('coalesce(sum((articles.quantite_base / nullif(unite_achat.vers_base, 0)) * coalesce(articles.prix_unitaire, 0)), 0) as total')
                ->value('total')
            : null;

        return Inertia::render('admin/inventory', [
            'items' => $items,
            'stocks' => $stocks,
            'assignments' => MaterialAssignment::query()
                ->with(['user:id,name', 'assignee.memberAccount:id,name,reference_item_id'])
                ->orderBy('is_replaced')->orderByDesc('assigned_on')->get(),
            'inventoryMovements' => MouvementStock::query()
                ->with(['article:id,code,libelle', 'auteur:id,name'])
                ->latest('created_at')->limit(30)->get()
                ->map(fn (MouvementStock $movement): array => [
                    'id' => $movement->id,
                    'movement_type' => $movement->type,
                    'quantity_change' => (string) $movement->quantite_base,
                    'quantity_before' => '0',
                    'quantity_after' => '0',
                    'notes' => $movement->motif,
                    'occurred_at' => $movement->created_at,
                    'actor' => $movement->auteur ? ['id' => $movement->auteur->id, 'name' => $movement->auteur->name] : null,
                    'item' => $movement->article ? ['code' => $movement->article->code, 'name' => $movement->article->libelle] : null,
                ]),
            'productMovements' => ProductStockMovement::query()
                ->with(['stock:id,product_name', 'actor:id,name'])
                ->latest('occurred_at')->limit(30)->get(),
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
            'people' => ReferenceItem::query()
                ->whereIn('category', ['agents_agri', 'agents_ani'])
                ->where('active', true)->orderBy('label')->get(['id', 'label']),
            'materials' => ReferenceItem::query()
                ->where('category', 'epi_types')->where('active', true)
                ->orderBy('label')->get(['id', 'label']),
            'stats' => [
                'activeItems' => Article::query()->where('actif', true)->count(),
                'inventoryValue' => $inventoryValue === null ? null : (float) $inventoryValue,
                'lowItems' => $lowItemsCount,
                'activeProducts' => ProductStock::query()->where('active', true)->count(),
                'activeAssignments' => MaterialAssignment::query()->where('is_replaced', false)->count(),
                'expiredAssignments' => MaterialAssignment::query()->where('is_replaced', false)->whereDate('expires_on', '<', today())->count(),
            ],
            'visibility' => [
                'stockValues' => $voitValeursStock,
            ],
        ]);
    }

    public function storeItem(Request $request, MagasinService $magasin): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'category_code' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string', 'max:60', Rule::unique('articles', 'code')],
            'name' => ['required', 'string', 'max:180'],
            'unit' => ['required', 'string', 'max:40'],
            'quantity' => ['required', 'numeric', 'min:0', 'max:99999999999.9999'],
            'unit_price' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'minimum_quantity' => ['nullable', 'numeric', 'min:0'],
            'cost_center' => ['nullable', 'string', 'max:30'],
        ]);

        DB::transaction(function () use ($data, $magasin): void {
            $unit = $this->resolveUnit((string) $data['unit']);
            $article = Article::query()->create([
                'code' => $data['code'],
                'categorie' => $data['category_code'],
                'libelle' => $data['name'],
                'unite_achat_id' => $unit->id,
                'unite_usage_id' => $unit->id,
                'prix_unitaire' => $data['unit_price'],
                'seuil_min' => $data['minimum_quantity'] ?? null,
                'centre_cout' => $data['cost_center'] ?? null,
                'quantite_base' => 0,
                'actif' => true,
            ]);

            if ((float) $data['quantity'] > 0) {
                $magasin->entree($article, (float) $data['quantity'], $unit, 'Création depuis l’administration');
            }
        }, 3);

        return back()->with('success', 'Article ajouté au magasin.');
    }

    public function adjustItem(Request $request, Article $article, MagasinService $magasin): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'quantity_change' => ['required', 'numeric', 'not_in:0', 'min:-99999999999.999', 'max:99999999999.999'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($article, $data, $magasin): void {
            $item = Article::query()->with('uniteUsage')->lockForUpdate()->findOrFail($article->id);
            $change = round((float) $data['quantity_change'], 3);

            if ($change > 0) {
                $magasin->entree($item, $change, $item->uniteUsage, $data['reason']);

                return;
            }

            try {
                $magasin->sortie($item, abs($change), $item->uniteUsage, $data['reason']);
            } catch (\RuntimeException) {
                throw ValidationException::withMessages(['quantity_change' => 'Le stock ne peut pas devenir négatif.']);
            }
        }, 3);

        return back()->with('success', 'Mouvement d’article enregistré.');
    }

    public function archiveItem(Request $request, Article $article): RedirectResponse
    {
        $this->ensureAdmin($request);
        if ((float) $article->quantite_base !== 0.0) {
            return back()->withErrors(['archive' => 'Ramenez d’abord la quantité à zéro pour archiver cet article.']);
        }
        $article->update(['actif' => false]);

        return back()->with('success', 'Article archivé sans supprimer son historique.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'product_name' => ['required', 'string', 'max:180', Rule::unique('product_stocks')->where('user_id', $request->integer('user_id'))],
            'unit' => ['nullable', 'string', 'max:40'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'minimum_quantity' => ['nullable', 'numeric', 'min:0'],
        ]);
        DB::transaction(function () use ($data, $request): void {
            User::query()->whereKey($data['user_id'])->lockForUpdate()->firstOrFail();
            $stock = ProductStock::query()->create([
                'user_id' => $data['user_id'], 'product_name' => $data['product_name'],
                'unit' => $data['unit'] ?? null, 'quantity_on_hand' => $data['quantity'],
                'minimum_quantity' => $data['minimum_quantity'] ?? null, 'active' => true,
            ]);
            if ((float) $data['quantity'] > 0) {
                ProductStockMovement::query()->create([
                    'user_id' => $data['user_id'], 'product_stock_id' => $stock->id,
                    'actor_user_id' => $request->user()->id, 'movement_type' => 'opening_balance',
                    'quantity_change' => $data['quantity'], 'quantity_before' => 0,
                    'quantity_after' => $data['quantity'], 'notes' => 'Création depuis l’administration',
                    'metadata' => ['source' => 'admin'], 'occurred_at' => now(),
                ]);
            }
        }, 3);

        return back()->with('success', 'Stock produit ajouté.');
    }

    public function adjustProduct(Request $request, ProductStock $productStock): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'quantity_change' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);
        DB::transaction(function () use ($productStock, $data, $request): void {
            $stock = ProductStock::query()->lockForUpdate()->findOrFail($productStock->id);
            $before = (float) $stock->quantity_on_hand;
            $change = round((float) $data['quantity_change'], 3);
            $after = round($before + $change, 3);
            if ($after < 0) {
                throw ValidationException::withMessages(['quantity_change' => 'Le stock ne peut pas devenir négatif.']);
            }
            $stock->update(['quantity_on_hand' => $after]);
            ProductStockMovement::query()->create([
                'user_id' => $stock->user_id, 'product_stock_id' => $stock->id,
                'actor_user_id' => $request->user()->id,
                'movement_type' => $change > 0 ? 'admin_entry' : 'admin_exit',
                'quantity_change' => $change, 'quantity_before' => $before, 'quantity_after' => $after,
                'notes' => $data['reason'], 'metadata' => ['source' => 'admin'], 'occurred_at' => now(),
            ]);
        }, 3);

        return back()->with('success', 'Mouvement de produit enregistré.');
    }

    public function archiveProduct(Request $request, ProductStock $productStock): RedirectResponse
    {
        $this->ensureAdmin($request);
        if ((float) $productStock->quantity_on_hand !== 0.0) {
            return back()->withErrors(['archive' => 'Ramenez d’abord la quantité à zéro avant archivage.']);
        }
        $productStock->update(['active' => false]);

        return back()->with('success', 'Produit archivé sans supprimer son historique.');
    }

    public function storeAssignment(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'assignee_reference_item_id' => ['required', 'integer', 'exists:reference_items,id'],
            'material_reference_item_id' => ['required', 'integer', 'exists:reference_items,id'],
            'size' => ['nullable', 'string', 'max:30'],
            'assigned_on' => ['required', 'date_format:Y-m-d'],
            'expires_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:assigned_on'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $person = ReferenceItem::query()->whereIn('category', ['agents_agri', 'agents_ani'])
            ->whereKey($data['assignee_reference_item_id'])->firstOrFail();
        $material = ReferenceItem::query()->where('category', 'epi_types')
            ->whereKey($data['material_reference_item_id'])->firstOrFail();
        $alreadyAssigned = MaterialAssignment::query()
            ->where('user_id', $data['user_id'])
            ->where('assignee_reference_item_id', $person->id)
            ->where('material_reference_item_id', $material->id)
            ->where('is_replaced', false)
            ->where(fn ($query) => $query->whereNull('expires_on')->orWhereDate('expires_on', '>=', today()))
            ->exists();
        if ($alreadyAssigned) {
            throw ValidationException::withMessages([
                'assignee_reference_item_id' => 'Cette personne détient déjà ce matériel avec une attribution active.',
            ]);
        }
        MaterialAssignment::query()->create([
            'user_id' => $data['user_id'], 'actor_user_id' => $request->user()->id,
            'assignee_reference_item_id' => $person->id, 'material_reference_item_id' => $material->id,
            'legacy_key' => (string) Str::uuid(), 'assignee_name' => $person->label,
            'material_name' => $material->label, 'size' => $data['size'] ?? null,
            'assigned_on' => $data['assigned_on'], 'expires_on' => $data['expires_on'] ?? null,
            'issued_by_name' => $request->user()->name, 'assignment_reason' => $data['reason'] ?? null,
        ]);

        return back()->with('success', 'Matériel attribué à la personne.');
    }

    public function endAssignment(Request $request, MaterialAssignment $materialAssignment): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $materialAssignment->update(['is_replaced' => true, 'end_reason' => $data['reason']]);

        return back()->with('success', 'Attribution clôturée et conservée dans l’historique.');
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }

    /** @return array<string, mixed> */
    private function articlePayload(Article $article, bool $inclureValeurs): array
    {
        $payload = [
            'id' => $article->id,
            'code' => $article->code,
            'name' => $article->libelle,
            'unit' => $article->uniteUsage->code,
            'quantity_on_hand' => number_format($article->stockUsage(), 3, '.', ''),
            'minimum_quantity' => $article->seuil_min,
            'active' => $article->actif,
            'user' => ['id' => 0, 'name' => 'Magasin central'],
            'category' => [
                'code' => $article->categorie,
                'name' => Article::CATEGORIES[$article->categorie] ?? $article->categorie,
            ],
        ];

        if ($inclureValeurs) {
            $payload['unit_price'] = (string) ($article->prix_unitaire ?? '0');
            $payload['cost_center'] = $article->centre_cout;
        }

        return $payload;
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
