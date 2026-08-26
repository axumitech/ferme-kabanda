<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\MaterialAssignment;
use App\Models\ProductStock;
use App\Models\ProductStockMovement;
use App\Models\ReferenceItem;
use App\Models\User;
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
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        $items = InventoryItem::query()
            ->with(['user:id,name', 'category:id,code,name'])
            ->orderByDesc('active')->orderBy('code')->get();
        $stocks = ProductStock::query()
            ->with('user:id,name')->orderByDesc('active')->orderBy('product_name')->get();

        return Inertia::render('admin/inventory', [
            'items' => $items,
            'stocks' => $stocks,
            'assignments' => MaterialAssignment::query()
                ->with(['user:id,name', 'assignee.memberAccount:id,name,reference_item_id'])
                ->orderBy('is_replaced')->orderByDesc('assigned_on')->get(),
            'inventoryMovements' => InventoryMovement::query()
                ->with(['item:id,code,name', 'actor:id,name'])
                ->latest('occurred_at')->limit(30)->get(),
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
                'activeItems' => $items->where('active', true)->count(),
                'inventoryValue' => $items->where('active', true)->sum(fn (InventoryItem $item): float => (float) $item->quantity_on_hand * (float) $item->unit_price),
                'lowItems' => $items->where('active', true)->filter(fn (InventoryItem $item): bool => $item->minimum_quantity !== null && (float) $item->quantity_on_hand <= (float) $item->minimum_quantity)->count(),
                'activeProducts' => $stocks->where('active', true)->count(),
                'activeAssignments' => MaterialAssignment::query()->where('is_replaced', false)->count(),
                'expiredAssignments' => MaterialAssignment::query()->where('is_replaced', false)->whereDate('expires_on', '<', today())->count(),
            ],
        ]);
    }

    public function storeItem(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'category_code' => ['required', 'string', 'max:20'],
            'category_name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:60', Rule::unique('inventory_items')->where('user_id', $request->integer('user_id'))],
            'name' => ['required', 'string', 'max:180'],
            'unit' => ['required', 'string', 'max:40'],
            'quantity' => ['required', 'numeric', 'min:0', 'max:99999999999.999'],
            'unit_price' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'minimum_quantity' => ['nullable', 'numeric', 'min:0'],
            'cost_center' => ['nullable', 'string', 'max:30'],
        ]);

        DB::transaction(function () use ($data, $request): void {
            User::query()->whereKey($data['user_id'])->lockForUpdate()->firstOrFail();
            $category = InventoryCategory::query()->firstOrCreate(
                ['user_id' => $data['user_id'], 'code' => $data['category_code']],
                ['name' => $data['category_name']],
            );
            $item = InventoryItem::query()->create([
                'user_id' => $data['user_id'],
                'inventory_category_id' => $category->id,
                'code' => $data['code'], 'name' => $data['name'], 'unit' => $data['unit'],
                'quantity_on_hand' => $data['quantity'], 'unit_price' => $data['unit_price'],
                'minimum_quantity' => $data['minimum_quantity'] ?? null,
                'cost_center' => $data['cost_center'] ?? null, 'created_on' => today(), 'active' => true,
            ]);
            if ((float) $data['quantity'] > 0) {
                InventoryMovement::query()->create([
                    'user_id' => $data['user_id'], 'inventory_item_id' => $item->id,
                    'actor_user_id' => $request->user()->id, 'movement_type' => 'opening_balance',
                    'quantity_change' => $data['quantity'], 'quantity_before' => 0,
                    'quantity_after' => $data['quantity'], 'notes' => 'Création depuis l’administration',
                    'metadata' => ['source' => 'admin'], 'occurred_at' => now(),
                ]);
            }
        }, 3);

        return back()->with('success', 'Article ajouté au magasin.');
    }

    public function adjustItem(Request $request, InventoryItem $inventoryItem): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'quantity_change' => ['required', 'numeric', 'not_in:0', 'min:-99999999999.999', 'max:99999999999.999'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($inventoryItem, $data, $request): void {
            $item = InventoryItem::query()->lockForUpdate()->findOrFail($inventoryItem->id);
            $before = (float) $item->quantity_on_hand;
            $change = round((float) $data['quantity_change'], 3);
            $after = round($before + $change, 3);
            if ($after < 0) {
                throw ValidationException::withMessages(['quantity_change' => 'Le stock ne peut pas devenir négatif.']);
            }
            $item->update(['quantity_on_hand' => $after]);
            InventoryMovement::query()->create([
                'user_id' => $item->user_id, 'inventory_item_id' => $item->id,
                'actor_user_id' => $request->user()->id,
                'movement_type' => $change > 0 ? 'admin_entry' : 'admin_exit',
                'quantity_change' => $change, 'quantity_before' => $before, 'quantity_after' => $after,
                'notes' => $data['reason'], 'metadata' => ['source' => 'admin'], 'occurred_at' => now(),
            ]);
        }, 3);

        return back()->with('success', 'Mouvement d’article enregistré.');
    }

    public function archiveItem(Request $request, InventoryItem $inventoryItem): RedirectResponse
    {
        $this->ensureAdmin($request);
        if ((float) $inventoryItem->quantity_on_hand !== 0.0) {
            return back()->withErrors(['archive' => 'Ramenez d’abord la quantité à zéro pour archiver cet article.']);
        }
        $inventoryItem->update(['active' => false]);

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
}
