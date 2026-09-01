<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\CampagneInventaire;
use App\Models\MouvementStock;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InventoryCampaignTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_can_open_a_filtered_inventory_with_a_frozen_blind_count(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 1]);
        $unit = $this->unit();
        $included = $this->article($unit, 'ENG-001', 'ENG', 12);
        $this->article($unit, 'OUT-001', 'OUT', 5);

        $this->actingAs($admin)->get('/inventaires/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('inventaires/form')->has('types')->has('sites')->has('categories')->has('emplacements'));

        $this->actingAs($admin)->post('/inventaires', [
            'libelle' => 'Inventaire tournant — engrais, septembre 2026',
            'type' => 'tournant', 'date_comptage' => '2026-09-01',
            'categorie' => 'ENG', 'note' => 'Comptage mensuel.',
        ])->assertRedirect();

        $campaign = CampagneInventaire::query()->firstOrFail();
        $this->assertSame(1, $campaign->lignes()->count());
        $this->assertEquals(12.0, (float) $campaign->lignes()->firstOrFail()->theorique_base);
        $this->assertSame($included->id, $campaign->lignes()->firstOrFail()->article_id);

        $this->actingAs($admin)->get("/inventaires/{$campaign->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('inventaires/show')
            ->where('lignes.0.theorique', null)
            ->where('fkn.inventoryPending', 1));
    }

    public function test_count_recount_arbitration_and_closure_write_the_stock_movement(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 1]);
        $unit = $this->unit();
        $article = $this->article($unit, 'ENG-002', 'ENG', 10);
        $this->movement($article, $unit, 10, 'entree');
        $this->actingAs($admin)->post('/inventaires', [
            'libelle' => 'Comptage engrais', 'type' => 'ponctuel',
            'date_comptage' => '2026-09-01', 'categorie' => 'ENG',
        ]);
        $campaign = CampagneInventaire::query()->firstOrFail();
        $line = $campaign->lignes()->firstOrFail();

        $this->actingAs($admin)->post("/inventaires/{$campaign->id}/lignes/{$line->id}/compter", [
            'compte' => 8, 'observation' => 'Premier passage', 'recomptage' => false,
        ])->assertRedirect();
        $this->assertSame('a_recompter', $line->fresh()->statut);
        $this->actingAs($admin)->get("/inventaires/{$campaign->id}")->assertInertia(fn (Assert $page) => $page
            ->where('lignes.0.theorique', 10)
            ->where('lignes.0.compte', 8));

        $this->actingAs($admin)->post("/inventaires/{$campaign->id}/lignes/{$line->id}/compter", [
            'compte' => 8, 'observation' => 'Recomptage confirmé', 'recomptage' => true,
        ])->assertRedirect();
        $this->actingAs($admin)->post("/inventaires/{$campaign->id}/lignes/{$line->id}/arbitrer", [
            'cause' => 'perte', 'observation' => 'Perte confirmée',
        ])->assertRedirect();
        $this->actingAs($admin)->post("/inventaires/{$campaign->id}/cloturer")->assertRedirect();

        $this->assertSame('cloturee', $campaign->fresh()->statut);
        $this->assertEquals(8.0, (float) $article->fresh()->quantite_base);
        $this->assertDatabaseHas('mouvements_stock', ['article_id' => $article->id, 'campagne_inventaire_id' => $campaign->id]);
    }

    public function test_abc_recalculation_uses_the_last_twelve_months_consumption_and_classifies_dormant_items_as_c(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $unit = $this->unit();
        $high = $this->article($unit, 'A-001', 'ENG', 0, 1);
        $medium = $this->article($unit, 'B-001', 'ENG', 0, 1);
        $dormant = $this->article($unit, 'C-001', 'ENG', 0, 1);
        $this->movement($high, $unit, -100);
        $this->movement($medium, $unit, -10);

        $this->actingAs($admin)->post('/inventaires/recalculer-abc')->assertRedirect();

        $this->assertSame('A', $high->fresh()->classe_abc);
        $this->assertSame('B', $medium->fresh()->classe_abc);
        $this->assertSame('C', $dormant->fresh()->classe_abc);
    }

    public function test_non_admin_cannot_manage_inventory_campaigns(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->get('/inventaires')->assertForbidden();
        $this->actingAs($user)->get('/inventaires/create')->assertForbidden();
    }

    private function unit(): Unite
    {
        return Unite::query()->create(['code' => 'piece-inv', 'nom' => 'pièce', 'dimension' => 'unitaire', 'vers_base' => 1, 'actif' => true]);
    }

    private function article(Unite $unit, string $code, string $category, float $stock, float $price = 10): Article
    {
        return Article::query()->create([
            'code' => $code, 'categorie' => $category, 'libelle' => "Article {$code}",
            'unite_achat_id' => $unit->id, 'unite_usage_id' => $unit->id,
            'prix_unitaire' => $price, 'quantite_base' => $stock, 'actif' => true,
        ]);
    }

    private function movement(Article $article, Unite $unit, float $base, string $type = 'sortie'): MouvementStock
    {
        return MouvementStock::query()->create([
            'article_id' => $article->id, 'type' => $type, 'quantite' => abs($base),
            'unite_id' => $unit->id, 'quantite_base' => $base, 'motif' => 'Consommation terrain',
            'user_nom' => 'Test',
        ]);
    }
}
