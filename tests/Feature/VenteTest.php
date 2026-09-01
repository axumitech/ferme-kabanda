<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\MouvementStock;
use App\Models\Unite;
use App\Models\User;
use App\Models\Vente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VenteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_creates_a_sale_adds_a_line_and_delivery_deducts_stock(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $unit = Unite::query()->create(['code' => 'piece-sale', 'nom' => 'unité', 'dimension' => 'unitaire', 'vers_base' => 1, 'actif' => true]);
        $article = Article::query()->create(['code' => 'OUT-901', 'categorie' => 'OUT', 'libelle' => 'Article vendu', 'unite_achat_id' => $unit->id, 'unite_usage_id' => $unit->id, 'prix_unitaire' => 5, 'actif' => true]);
        MouvementStock::query()->create(['article_id' => $article->id, 'type' => 'entree', 'quantite' => 10, 'quantite_base' => 10, 'unite_id' => $unit->id, 'motif' => 'Stock initial', 'user_nom' => 'Test']);
        $article->updateQuietly(['quantite_base' => 10]);

        $this->actingAs($admin)->get('/ventes/create')->assertOk()->assertInertia(fn (Assert $page) => $page->component('ventes/form')->where('taux', 2200));
        $this->actingAs($admin)->post('/ventes', ['date' => today()->toDateString(), 'client_libre' => 'Client passage', 'canal' => 'marche', 'devise' => 'USD'])->assertRedirect();
        $sale = Vente::query()->firstOrFail();
        $this->actingAs($admin)->post("/ventes/{$sale->id}/lignes", ['nature' => 'article', 'article_id' => $article->id, 'quantite' => 3, 'unite' => 'unité', 'prix_unitaire' => 8])->assertRedirect();
        $this->assertEquals(24, (float) $sale->fresh()->montant);
        $this->actingAs($admin)->post("/ventes/{$sale->id}/livrer")->assertRedirect();
        $this->assertSame('livree', $sale->fresh()->statut);
        $this->assertNotNull($sale->fresh()->bon_livraison);
        $this->assertEquals(7, (float) $article->fresh()->quantite_base);
    }

    public function test_payment_cannot_exceed_balance_and_cancellation_is_limited_to_draft(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $sale = Vente::query()->create(['reference' => 'VTE-TEST', 'date' => today(), 'client_libre' => 'Client', 'devise' => 'USD', 'taux_applique' => 2200, 'montant' => 100, 'montant_usd' => 100, 'montant_cdf' => 220000, 'statut' => 'brouillon']);

        $this->actingAs($admin)->post("/ventes/{$sale->id}/encaisser", ['montant' => 101, 'mode' => 'especes'])->assertSessionHasErrors('action');
        $this->actingAs($admin)->post("/ventes/{$sale->id}/encaisser", ['montant' => 40, 'mode' => 'especes'])->assertRedirect();
        $this->assertEquals(40, (float) $sale->fresh()->montant_regle);
        $this->actingAs($admin)->post("/ventes/{$sale->id}/annuler", ['motif' => 'Commande retirée'])->assertRedirect();
        $this->assertSame('annulee', $sale->fresh()->statut);
        $this->actingAs($admin)->post("/ventes/{$sale->id}/encaisser", ['montant' => 1])->assertSessionHasErrors('action');
    }

    public function test_non_admin_cannot_access_sales(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($user)->get('/ventes')->assertForbidden();
        $this->actingAs($user)->get('/ventes/create')->assertForbidden();
    }
}
