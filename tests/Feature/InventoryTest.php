<?php

namespace Tests\Feature;

use App\Models\FarmRecord;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\ProductStock;
use App\Models\ProductStockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_normalized_inventory(): void
    {
        $this->getJson(route('inventory.items.index'))->assertUnauthorized();
        $this->getJson(route('product-stocks.index'))->assertUnauthorized();
    }

    public function test_inventory_items_are_normalized_and_quantity_changes_are_audited(): void
    {
        $user = User::factory()->create();
        $payload = ['items' => [[
            'cat' => 'ENG',
            'lib' => 'Urée 46% N',
            'unite' => 'sac 50 kg',
            'qte' => 20,
            'pu' => 45.5,
            'mini' => 5,
            'cc' => 'EXA',
            'code' => 'ENG-001',
            'cree' => '2026-08-26',
        ]]];

        $this->actingAs($user)
            ->putJson(route('inventory.items.sync'), $payload)
            ->assertOk()
            ->assertJsonPath('items.0.code', 'ENG-001')
            ->assertJsonPath('items.0.qte', 20);

        $item = InventoryItem::query()->whereBelongsTo($user)->firstOrFail();
        $this->assertSame('ENG', $item->category->code);
        $this->assertSame('20.000', $item->quantity_on_hand);
        $this->assertDatabaseHas('inventory_movements', [
            'inventory_item_id' => $item->id,
            'movement_type' => 'opening_balance',
            'quantity_before' => 0,
            'quantity_after' => 20,
        ]);
        $this->assertFalse(FarmRecord::query()->whereBelongsTo($user)->where('record_key', 'articles')->exists());

        $payload['items'][0]['qte'] = 12.5;
        $this->actingAs($user)->putJson(route('inventory.items.sync'), $payload)->assertOk();

        $this->assertSame(2, InventoryMovement::query()->whereBelongsTo($user)->count());
        $this->assertDatabaseHas('inventory_movements', [
            'inventory_item_id' => $item->id,
            'movement_type' => 'adjustment_out',
            'quantity_change' => -7.5,
            'quantity_before' => 20,
            'quantity_after' => 12.5,
        ]);

        $this->actingAs($user)->putJson(route('inventory.items.sync'), $payload)->assertOk();
        $this->assertSame(2, InventoryMovement::query()->whereBelongsTo($user)->count());
    }

    public function test_product_stocks_are_isolated_and_every_change_is_audited(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)
            ->putJson(route('product-stocks.sync'), ['stocks' => ['HERO MECTIN' => 30]])
            ->assertOk()
            ->assertJsonPath('stocks.HERO MECTIN', 30);

        $this->actingAs($owner)
            ->putJson(route('product-stocks.sync'), ['stocks' => ['HERO MECTIN' => 24]])
            ->assertOk();

        $this->actingAs($other)
            ->getJson(route('product-stocks.index'))
            ->assertOk()
            ->assertExactJson(['stocks' => []]);

        $stock = ProductStock::query()->whereBelongsTo($owner)->firstOrFail();
        $this->assertSame('24.000', $stock->quantity_on_hand);
        $this->assertSame(2, ProductStockMovement::query()->whereBelongsTo($owner)->count());
        $this->assertDatabaseHas('product_stock_movements', [
            'product_stock_id' => $stock->id,
            'movement_type' => 'adjustment_out',
            'quantity_change' => -6,
        ]);
    }

    public function test_invalid_or_negative_quantities_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson(route('product-stocks.sync'), ['stocks' => ['Urée' => -1]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('stocks.Urée');

        $this->assertDatabaseCount('product_stocks', 0);
    }

    public function test_legacy_farm_record_keys_are_reserved(): void
    {
        $user = User::factory()->create();

        foreach (['articles', 'stock'] as $key) {
            $this->actingAs($user)
                ->putJson(route('farm-data.store', ['recordKey' => $key]), ['value' => '{}'])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('record_key');
        }
    }

    public function test_migration_imports_and_removes_valid_legacy_json_records(): void
    {
        $user = User::factory()->create();
        $now = now();

        DB::table('farm_records')->insert([
            [
                'user_id' => $user->id,
                'record_key' => 'articles',
                'value' => json_encode([[
                    'cat' => 'OUT',
                    'lib' => 'Bêche',
                    'unite' => 'pièce',
                    'qte' => 4,
                    'pu' => 12,
                    'mini' => 1,
                    'cc' => 'EXA',
                    'code' => 'OUT-001',
                    'cree' => '2026-08-25',
                ]]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'user_id' => $user->id,
                'record_key' => 'stock',
                'value' => json_encode(['AMISTAR 250 SC' => 8.5]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $migration = require database_path('migrations/2026_08_26_010000_create_normalized_inventory_tables.php');
        $migration->down();
        $migration->up();

        $this->assertDatabaseHas('inventory_items', [
            'user_id' => $user->id,
            'code' => 'OUT-001',
            'quantity_on_hand' => 4,
        ]);
        $this->assertDatabaseHas('product_stocks', [
            'user_id' => $user->id,
            'product_name' => 'AMISTAR 250 SC',
            'quantity_on_hand' => 8.5,
        ]);
        $this->assertDatabaseMissing('farm_records', ['user_id' => $user->id, 'record_key' => 'articles']);
        $this->assertDatabaseMissing('farm_records', ['user_id' => $user->id, 'record_key' => 'stock']);
        $this->assertDatabaseCount('inventory_movements', 1);
        $this->assertDatabaseCount('product_stock_movements', 1);

        $migration->down();
        $this->assertDatabaseHas('farm_records', ['user_id' => $user->id, 'record_key' => 'articles']);
        $this->assertDatabaseHas('farm_records', ['user_id' => $user->id, 'record_key' => 'stock']);

        // Recrée le schéma pour que le nettoyage standard de la suite reste intact.
        $migration->up();
    }
}
