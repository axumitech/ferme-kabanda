<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unites')) {
            Schema::create('unites', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 24)->unique();
                $table->string('nom');
                $table->string('dimension', 16);
                $table->decimal('vers_base', 16, 6);
                $table->boolean('conditionnement')->default(false);
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });
        }

        $this->seedUnites();

        if (! Schema::hasTable('articles')) {
            Schema::create('articles', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 60)->unique();
                $table->string('categorie', 20);
                $table->string('libelle', 180);
                $table->text('description')->nullable();
                $table->foreignId('unite_achat_id')->constrained('unites');
                $table->foreignId('unite_usage_id')->constrained('unites');
                $table->decimal('facteur_personnalise', 16, 6)->nullable();
                $table->string('produit_terrain')->nullable()->index();
                $table->decimal('prix_unitaire', 14, 4)->nullable();
                $table->decimal('seuil_min', 16, 4)->nullable();
                $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
                $table->string('centre_cout', 30)->nullable();
                $table->decimal('quantite_base', 20, 6)->default(0);
                $table->boolean('actif')->default(true);
                $table->timestamps();
                $table->index(['categorie', 'actif']);
            });
        }

        if (! Schema::hasTable('mouvements_stock')) {
            Schema::create('mouvements_stock', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
                $table->string('type', 16);
                $table->decimal('quantite', 16, 4);
                $table->foreignId('unite_id')->constrained('unites');
                $table->decimal('quantite_base', 20, 6);
                $table->string('motif');
                $table->nullableMorphs('origine');
                $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
                $table->string('centre_cout', 30)->nullable();
                $table->decimal('valeur', 14, 4)->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('user_nom');
                $table->foreignId('annule_mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
                $table->text('note')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['article_id', 'created_at']);
            });
        }

        $this->migrateInventoryItemsToMagasin();
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_stock');
        Schema::dropIfExists('articles');
        Schema::dropIfExists('unites');
    }

    private function seedUnites(): void
    {
        $now = now();

        foreach ([
            ['g', 'gramme', 'masse', 1, false],
            ['kg', 'kilogramme', 'masse', 1000, false],
            ['t', 'tonne', 'masse', 1000000, false],
            ['sac_25kg', 'sac de 25 kg', 'masse', 25000, true],
            ['sac_50kg', 'sac de 50 kg', 'masse', 50000, true],
            ['ml', 'millilitre', 'volume', 1, false],
            ['l', 'litre', 'volume', 1000, false],
            ['bidon_1l', 'bidon de 1 L', 'volume', 1000, true],
            ['bidon_5l', 'bidon de 5 L', 'volume', 5000, true],
            ['bidon_20l', 'bidon de 20 L', 'volume', 20000, true],
            ['fut_200l', 'fût de 200 L', 'volume', 200000, true],
            ['u', 'unité', 'unitaire', 1, false],
            ['piece', 'pièce', 'unitaire', 1, false],
            ['paire', 'paire', 'unitaire', 2, false],
            ['boite_12', 'boîte de 12', 'unitaire', 12, true],
            ['carton_24', 'carton de 24', 'unitaire', 24, true],
            ['mm', 'millimètre', 'longueur', 1, false],
            ['m', 'mètre', 'longueur', 1000, false],
            ['rouleau_100m', 'rouleau de 100 m', 'longueur', 100000, true],
        ] as [$code, $nom, $dimension, $versBase, $conditionnement]) {
            DB::table('unites')->updateOrInsert(
                ['code' => $code],
                [
                    'nom' => $nom,
                    'dimension' => $dimension,
                    'vers_base' => $versBase,
                    'conditionnement' => $conditionnement,
                    'actif' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    private function migrateInventoryItemsToMagasin(): void
    {
        if (! Schema::hasTable('inventory_items')) {
            return;
        }

        DB::table('inventory_items')
            ->leftJoin('inventory_categories', 'inventory_items.inventory_category_id', '=', 'inventory_categories.id')
            ->select([
                'inventory_items.*',
                'inventory_categories.code as category_code',
            ])
            ->orderBy('inventory_items.id')
            ->each(function (object $item): void {
                $row = (array) $item;
                $unit = $this->unitFor((string) $row['unit']);
                $code = $this->articleCode((string) $row['code'], (int) $row['user_id']);
                $now = now();

                DB::table('articles')->updateOrInsert(
                    ['code' => $code],
                    [
                        'categorie' => mb_substr((string) ($row['category_code'] ?? 'DIV'), 0, 20),
                        'libelle' => mb_substr((string) $row['name'], 0, 180),
                        'unite_achat_id' => $unit['id'],
                        'unite_usage_id' => $unit['id'],
                        'prix_unitaire' => $row['unit_price'],
                        'seuil_min' => $row['minimum_quantity'],
                        'centre_cout' => $row['cost_center'],
                        'quantite_base' => 0,
                        'actif' => (bool) ($row['active'] ?? true),
                        'created_at' => $row['created_at'] ?? $now,
                        'updated_at' => $row['updated_at'] ?? $now,
                    ],
                );

                $articleId = DB::table('articles')->where('code', $code)->value('id');
                $movementCount = $this->migrateMovementsForItem((int) $row['id'], (int) $articleId, $unit);

                if ($movementCount === 0 && (float) $row['quantity_on_hand'] > 0) {
                    $this->insertOpeningMovement($row, (int) $articleId, $unit);
                }

                DB::table('articles')
                    ->where('id', $articleId)
                    ->update([
                        'quantite_base' => DB::table('mouvements_stock')->where('article_id', $articleId)->sum('quantite_base'),
                        'updated_at' => $now,
                    ]);
            });
    }

    /** @param array{id: int|string, vers_base: int|float|string} $unit */
    private function migrateMovementsForItem(int $itemId, int $articleId, array $unit): int
    {
        if (! Schema::hasTable('inventory_movements')) {
            return 0;
        }

        $count = 0;

        DB::table('inventory_movements')
            ->where('inventory_item_id', $itemId)
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->each(function (object $movement) use ($articleId, $unit, &$count): void {
                $row = (array) $movement;
                $change = (float) $row['quantity_change'];

                if ($change === 0.0) {
                    return;
                }

                $actor = $row['actor_user_id']
                    ? (array) DB::table('users')->where('id', $row['actor_user_id'])->first(['id', 'name'])
                    : null;

                DB::table('mouvements_stock')->updateOrInsert(
                    [
                        'origine_type' => 'legacy_inventory_movement',
                        'origine_id' => $row['id'],
                    ],
                    [
                        'article_id' => $articleId,
                        'type' => $change >= 0 ? 'entree' : 'sortie',
                        'quantite' => abs($change),
                        'unite_id' => $unit['id'],
                        'quantite_base' => $change * (float) $unit['vers_base'],
                        'motif' => $row['notes'] ?: $this->legacyMovementLabel((string) $row['movement_type']),
                        'site_id' => null,
                        'centre_cout' => null,
                        'valeur' => null,
                        'user_id' => $actor['id'] ?? null,
                        'user_nom' => $actor['name'] ?? 'migration',
                        'annule_mouvement_id' => null,
                        'note' => 'Migré depuis inventory_movements',
                        'created_at' => $row['occurred_at'] ?? $row['created_at'] ?? now(),
                    ],
                );

                $count++;
            });

        return $count;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array{id: int|string, vers_base: int|float|string}  $unit
     */
    private function insertOpeningMovement(array $item, int $articleId, array $unit): void
    {
        $owner = (array) DB::table('users')->where('id', $item['user_id'])->first(['id', 'name']);
        $quantity = (float) $item['quantity_on_hand'];

        DB::table('mouvements_stock')->updateOrInsert(
            [
                'origine_type' => 'legacy_inventory_item',
                'origine_id' => $item['id'],
            ],
            [
                'article_id' => $articleId,
                'type' => 'entree',
                'quantite' => $quantity,
                'unite_id' => $unit['id'],
                'quantite_base' => $quantity * (float) $unit['vers_base'],
                'motif' => "Solde d'ouverture migré depuis l'ancien inventaire",
                'site_id' => null,
                'centre_cout' => $item['cost_center'],
                'valeur' => null,
                'user_id' => $owner['id'] ?? null,
                'user_nom' => $owner['name'] ?? 'migration',
                'annule_mouvement_id' => null,
                'note' => 'Migré depuis inventory_items',
                'created_at' => $item['updated_at'] ?? now(),
            ],
        );
    }

    /** @return array{id: int|string, vers_base: int|float|string} */
    private function unitFor(string $rawUnit): array
    {
        $normalized = Str::of($rawUnit)->lower()->ascii()->replace([' ', '-', '.'], '_')->toString();
        $code = match (true) {
            str_contains($normalized, 'sac') && str_contains($normalized, '25') => 'sac_25kg',
            str_contains($normalized, 'sac') => 'sac_50kg',
            str_contains($normalized, 'kg'), str_contains($normalized, 'kilo') => 'kg',
            str_contains($normalized, 'litre'), $normalized === 'l' => 'l',
            str_contains($normalized, 'paire') => 'paire',
            str_contains($normalized, 'piece'), str_contains($normalized, 'unite') => 'piece',
            str_contains($normalized, 'metre'), $normalized === 'm' => 'm',
            default => 'piece',
        };

        $unit = DB::table('unites')->where('code', $code)->first();

        if (! $unit) {
            throw new RuntimeException("Unité magasin introuvable : {$code}.");
        }

        return [
            'id' => $unit->id,
            'vers_base' => $unit->vers_base,
        ];
    }

    private function articleCode(string $legacyCode, int $userId): string
    {
        $code = mb_substr($legacyCode, 0, 60);

        $existing = DB::table('articles')->where('code', $code)->first();
        if (! $existing) {
            return $code;
        }

        return mb_substr($legacyCode, 0, 52).'-U'.$userId;
    }

    private function legacyMovementLabel(string $type): string
    {
        return match ($type) {
            'opening_balance' => "Solde d'ouverture migré",
            'adjustment_in', 'admin_entry' => 'Entrée migrée',
            'adjustment_out', 'admin_exit' => 'Sortie migrée',
            default => 'Mouvement migré: '.$type,
        };
    }
};
