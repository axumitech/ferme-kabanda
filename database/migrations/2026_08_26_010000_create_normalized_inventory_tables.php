<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inventory_categories')) {
            Schema::create('inventory_categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('code', 20);
                $table->string('name', 120);
                $table->timestamps();
                $table->unique(['user_id', 'code']);
            });
        }

        if (! Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('inventory_category_id')->constrained()->restrictOnDelete();
                $table->string('code', 60);
                $table->string('name', 180);
                $table->string('unit', 40);
                $table->decimal('quantity_on_hand', 14, 3)->default(0);
                $table->decimal('unit_price', 14, 2)->default(0);
                $table->decimal('minimum_quantity', 14, 3)->nullable();
                $table->string('cost_center', 30)->nullable();
                $table->date('created_on')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'code']);
                $table->index(['user_id', 'name']);
            });
        }

        if (! Schema::hasTable('inventory_movements')) {
            Schema::create('inventory_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
                $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('movement_type', 30);
                $table->decimal('quantity_change', 14, 3);
                $table->decimal('quantity_before', 14, 3);
                $table->decimal('quantity_after', 14, 3);
                $table->string('reference', 120)->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('occurred_at');
                $table->timestamps();
                $table->index(['user_id', 'occurred_at']);
                $table->index(['inventory_item_id', 'occurred_at']);
            });
        }

        if (! Schema::hasTable('product_stocks')) {
            Schema::create('product_stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('product_name', 180);
                $table->string('unit', 40)->nullable();
                $table->decimal('quantity_on_hand', 14, 3)->default(0);
                $table->decimal('minimum_quantity', 14, 3)->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'product_name']);
            });
        }

        if (! Schema::hasTable('product_stock_movements')) {
            Schema::create('product_stock_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_stock_id')->constrained()->cascadeOnDelete();
                $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('movement_type', 30);
                $table->decimal('quantity_change', 14, 3);
                $table->decimal('quantity_before', 14, 3);
                $table->decimal('quantity_after', 14, 3);
                $table->string('reference', 120)->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('occurred_at');
                $table->timestamps();
                $table->index(['user_id', 'occurred_at']);
                $table->index(['product_stock_id', 'occurred_at']);
            });
        }

        if (! Schema::hasTable('inventory_counts')) {
            Schema::create('inventory_counts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('reference', 60);
                $table->string('status', 20)->default('draft');
                $table->date('counted_on');
                $table->text('notes')->nullable();
                $table->timestamp('finalized_at')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'reference']);
                $table->index(['user_id', 'counted_on']);
            });
        }

        if (! Schema::hasTable('inventory_count_lines')) {
            Schema::create('inventory_count_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('inventory_count_id')->constrained()->cascadeOnDelete();
                $table->foreignId('inventory_item_id')->constrained()->restrictOnDelete();
                $table->decimal('expected_quantity', 14, 3);
                $table->decimal('counted_quantity', 14, 3)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->unique(['inventory_count_id', 'inventory_item_id']);
            });
        }

        $this->migrateLegacyData();
    }

    private function migrateLegacyData(): void
    {
        DB::table('farm_records')
            ->whereIn('record_key', ['articles', 'stock'])
            ->orderBy('id')
            ->each(function (object $record): void {
                $row = (array) $record;
                $data = json_decode((string) $row['value'], true);
                if (! is_array($data)) {
                    return;
                }

                if ($row['record_key'] === 'articles') {
                    $this->migrateArticles($row, $data);
                } else {
                    $this->migrateProductStocks($row, $data);
                }

                DB::table('farm_records')->where('id', $row['id'])->delete();
            });
    }

    /**
     * @param  array<string, mixed>  $record
     * @param  array<int, mixed>  $articles
     */
    private function migrateArticles(array $record, array $articles): void
    {
        foreach ($articles as $article) {
            if (! is_array($article) || blank($article['code'] ?? null) || blank($article['lib'] ?? null)) {
                continue;
            }

            $categoryCode = mb_substr((string) ($article['cat'] ?? 'DIV'), 0, 20);
            DB::table('inventory_categories')->updateOrInsert(
                ['user_id' => $record['user_id'], 'code' => $categoryCode],
                [
                    'name' => $categoryCode,
                    'created_at' => $record['created_at'],
                    'updated_at' => $record['updated_at'],
                ],
            );

            $categoryId = DB::table('inventory_categories')
                ->where('user_id', $record['user_id'])
                ->where('code', $categoryCode)
                ->value('id');

            $quantity = max(0, round((float) ($article['qte'] ?? 0), 3));
            $itemCode = mb_substr((string) $article['code'], 0, 60);
            DB::table('inventory_items')->updateOrInsert(
                ['user_id' => $record['user_id'], 'code' => $itemCode],
                [
                    'user_id' => $record['user_id'],
                    'inventory_category_id' => $categoryId,
                    'code' => $itemCode,
                    'name' => mb_substr((string) $article['lib'], 0, 180),
                    'unit' => mb_substr((string) ($article['unite'] ?? 'unité'), 0, 40),
                    'quantity_on_hand' => $quantity,
                    'unit_price' => max(0, round((float) ($article['pu'] ?? 0), 2)),
                    'minimum_quantity' => filled($article['mini'] ?? null) ? max(0, round((float) $article['mini'], 3)) : null,
                    'cost_center' => filled($article['cc'] ?? null) ? mb_substr((string) $article['cc'], 0, 30) : null,
                    'created_on' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($article['cree'] ?? '')) ? $article['cree'] : null,
                    'created_at' => $record['created_at'],
                    'updated_at' => $record['updated_at'],
                ],
            );

            $itemId = DB::table('inventory_items')
                ->where('user_id', $record['user_id'])
                ->where('code', $itemCode)
                ->value('id');

            if ($quantity > 0) {
                $reference = 'legacy:farm_records:'.$record['id'];
                DB::table('inventory_movements')->updateOrInsert(
                    [
                        'inventory_item_id' => $itemId,
                        'movement_type' => 'opening_balance',
                        'reference' => $reference,
                    ],
                    [
                        'user_id' => $record['user_id'],
                        'inventory_item_id' => $itemId,
                        'actor_user_id' => $record['user_id'],
                        'movement_type' => 'opening_balance',
                        'quantity_change' => $quantity,
                        'quantity_before' => 0,
                        'quantity_after' => $quantity,
                        'reference' => $reference,
                        'metadata' => json_encode(['source' => 'farm_records', 'legacy_record_id' => $record['id']]),
                        'occurred_at' => $record['updated_at'],
                        'created_at' => $record['created_at'],
                        'updated_at' => $record['updated_at'],
                    ],
                );
            }
        }
    }

    /**
     * @param  array<string, mixed>  $record
     * @param  array<array-key, mixed>  $stocks
     */
    private function migrateProductStocks(array $record, array $stocks): void
    {
        foreach ($stocks as $productName => $rawQuantity) {
            if (! is_string($productName) || blank($productName) || ! is_numeric($rawQuantity)) {
                continue;
            }

            $quantity = max(0, round((float) $rawQuantity, 3));
            $productName = mb_substr($productName, 0, 180);
            DB::table('product_stocks')->updateOrInsert(
                ['user_id' => $record['user_id'], 'product_name' => $productName],
                [
                    'user_id' => $record['user_id'],
                    'product_name' => $productName,
                    'quantity_on_hand' => $quantity,
                    'created_at' => $record['created_at'],
                    'updated_at' => $record['updated_at'],
                ],
            );

            $stockId = DB::table('product_stocks')
                ->where('user_id', $record['user_id'])
                ->where('product_name', $productName)
                ->value('id');

            if ($quantity > 0) {
                $reference = 'legacy:farm_records:'.$record['id'];
                DB::table('product_stock_movements')->updateOrInsert(
                    [
                        'product_stock_id' => $stockId,
                        'movement_type' => 'opening_balance',
                        'reference' => $reference,
                    ],
                    [
                        'user_id' => $record['user_id'],
                        'product_stock_id' => $stockId,
                        'actor_user_id' => $record['user_id'],
                        'movement_type' => 'opening_balance',
                        'quantity_change' => $quantity,
                        'quantity_before' => 0,
                        'quantity_after' => $quantity,
                        'reference' => $reference,
                        'metadata' => json_encode(['source' => 'farm_records', 'legacy_record_id' => $record['id']]),
                        'occurred_at' => $record['updated_at'],
                        'created_at' => $record['created_at'],
                        'updated_at' => $record['updated_at'],
                    ],
                );
            }
        }
    }

    public function down(): void
    {
        $this->restoreLegacyData();

        Schema::dropIfExists('inventory_count_lines');
        Schema::dropIfExists('inventory_counts');
        Schema::dropIfExists('product_stock_movements');
        Schema::dropIfExists('product_stocks');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('inventory_categories');
    }

    private function restoreLegacyData(): void
    {
        $userIds = DB::table('inventory_items')->pluck('user_id')
            ->merge(DB::table('product_stocks')->pluck('user_id'))
            ->unique();

        foreach ($userIds as $userId) {
            $now = now();
            $articles = DB::table('inventory_items')
                ->join('inventory_categories', 'inventory_categories.id', '=', 'inventory_items.inventory_category_id')
                ->where('inventory_items.user_id', $userId)
                ->orderBy('inventory_items.code')
                ->get([
                    'inventory_categories.code as cat',
                    'inventory_items.name as lib',
                    'inventory_items.unit as unite',
                    'inventory_items.quantity_on_hand as qte',
                    'inventory_items.unit_price as pu',
                    'inventory_items.minimum_quantity as mini',
                    'inventory_items.cost_center as cc',
                    'inventory_items.code',
                    'inventory_items.created_on as cree',
                ])
                ->map(fn (object $item): array => (array) $item)
                ->all();

            $stocks = DB::table('product_stocks')
                ->where('user_id', $userId)
                ->orderBy('product_name')
                ->pluck('quantity_on_hand', 'product_name')
                ->map(fn (mixed $quantity): float => (float) $quantity)
                ->all();

            $records = [];
            if ($articles !== []) {
                $records[] = [
                    'user_id' => $userId,
                    'record_key' => 'articles',
                    'value' => json_encode($articles, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
            if ($stocks !== []) {
                $records[] = [
                    'user_id' => $userId,
                    'record_key' => 'stock',
                    'value' => json_encode($stocks, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($records !== []) {
                DB::table('farm_records')->upsert(
                    $records,
                    ['user_id', 'record_key'],
                    ['value', 'updated_at'],
                );
            }
        }
    }
};
