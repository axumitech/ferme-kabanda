<?php

namespace App\Services;

use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\ProductStock;
use App\Models\ProductStockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StockSynchronizer
{
    private const CATEGORY_NAMES = [
        'ENG' => 'Engrais et amendements',
        'PHY' => 'Produits phytosanitaires',
        'SEM' => 'Semences et plants',
        'ALI' => 'Aliments du bétail',
        'VET' => 'Produits vétérinaires',
        'PIE' => 'Pièces détachées',
        'OUT' => 'Outillage',
        'EPI' => 'Équipements de protection',
        'CAR' => 'Carburants et lubrifiants',
        'CON' => 'Matériaux de construction',
        'IRR' => "Matériel d'irrigation",
        'BUR' => 'Fournitures de bureau',
        'DIV' => 'Divers',
    ];

    /** @param list<array<string, mixed>> $items */
    public function syncInventory(User $user, array $items): void
    {
        DB::transaction(function () use ($user, $items): void {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            foreach ($items as $data) {
                $category = InventoryCategory::query()->firstOrCreate(
                    ['user_id' => $user->id, 'code' => $data['cat']],
                    ['name' => self::CATEGORY_NAMES[$data['cat']] ?? $data['cat']],
                );

                $item = InventoryItem::query()
                    ->whereBelongsTo($user)
                    ->where('code', $data['code'])
                    ->lockForUpdate()
                    ->first();

                $isNew = $item === null;
                $before = $item ? (float) $item->quantity_on_hand : 0.0;
                $after = round((float) $data['qte'], 3);

                if (! $item) {
                    $item = new InventoryItem(['user_id' => $user->id, 'code' => $data['code']]);
                }

                $item->fill([
                    'inventory_category_id' => $category->id,
                    'name' => $data['lib'],
                    'unit' => $data['unite'],
                    'quantity_on_hand' => $after,
                    'unit_price' => $data['pu'] ?? 0,
                    'minimum_quantity' => filled($data['mini'] ?? null) ? $data['mini'] : null,
                    'cost_center' => $data['cc'] ?? null,
                    'created_on' => $data['cree'] ?? null,
                ])->save();

                $this->recordInventoryMovement($user, $item, $before, $after, $isNew);
            }
        }, 3);
    }

    /** @param array<string, int|float> $stocks */
    public function syncProductStocks(User $user, array $stocks): void
    {
        DB::transaction(function () use ($user, $stocks): void {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            foreach ($stocks as $productName => $quantity) {
                $stock = ProductStock::query()
                    ->whereBelongsTo($user)
                    ->where('product_name', $productName)
                    ->lockForUpdate()
                    ->first();

                $isNew = $stock === null;
                $before = $stock ? (float) $stock->quantity_on_hand : 0.0;
                $after = round((float) $quantity, 3);

                if (! $stock) {
                    $stock = ProductStock::query()->create([
                        'user_id' => $user->id,
                        'product_name' => $productName,
                        'quantity_on_hand' => $after,
                    ]);
                } else {
                    $stock->update(['quantity_on_hand' => $after]);
                }

                $this->recordProductMovement($user, $stock, $before, $after, $isNew);
            }
        }, 3);
    }

    private function recordInventoryMovement(User $user, InventoryItem $item, float $before, float $after, bool $isNew): void
    {
        $change = round($after - $before, 3);
        if ($change === 0.0) {
            return;
        }

        InventoryMovement::query()->create([
            'user_id' => $user->id,
            'inventory_item_id' => $item->id,
            'actor_user_id' => $user->id,
            'movement_type' => $isNew ? 'opening_balance' : ($change > 0 ? 'adjustment_in' : 'adjustment_out'),
            'quantity_change' => $change,
            'quantity_before' => $before,
            'quantity_after' => $after,
            'metadata' => ['source' => 'inventory_sync_api'],
            'occurred_at' => now(),
        ]);
    }

    private function recordProductMovement(User $user, ProductStock $stock, float $before, float $after, bool $isNew): void
    {
        $change = round($after - $before, 3);
        if ($change === 0.0) {
            return;
        }

        ProductStockMovement::query()->create([
            'user_id' => $user->id,
            'product_stock_id' => $stock->id,
            'actor_user_id' => $user->id,
            'movement_type' => $isNew ? 'opening_balance' : ($change > 0 ? 'adjustment_in' : 'adjustment_out'),
            'quantity_change' => $change,
            'quantity_before' => $before,
            'quantity_after' => $after,
            'metadata' => ['source' => 'product_stock_sync_api'],
            'occurred_at' => now(),
        ]);
    }
}
