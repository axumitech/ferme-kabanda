<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\MouvementStock;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StoreArticleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_store_lists_articles_and_opens_the_complete_create_form(): void
    {
        $user = User::factory()->create();
        $unit = Unite::query()->create(['code' => 'u-test', 'nom' => 'unité test', 'dimension' => 'unitaire', 'vers_base' => 1, 'actif' => true]);
        Article::query()->create(['code' => 'OUT-001', 'categorie' => 'OUT', 'libelle' => 'Bêche', 'unite_achat_id' => $unit->id, 'unite_usage_id' => $unit->id, 'actif' => true]);
        Article::query()->create(['code' => 'OUT-002', 'categorie' => 'OUT', 'libelle' => 'Ancien outil', 'unite_achat_id' => $unit->id, 'unite_usage_id' => $unit->id, 'actif' => false]);

        $this->actingAs($user)->get('/magasin')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('magasin/index')->has('articles', 2)->where('articles.0.code', 'OUT-001')
            ->where('fkn.articleCount', 2));
        $this->actingAs($user)->get('/magasin/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('magasin/form')->where('mode', 'create')->has('unites'));
    }

    public function test_user_can_create_update_and_view_an_article(): void
    {
        $user = User::factory()->create();
        $kg = Unite::query()->create(['code' => 'kg-test', 'nom' => 'kilogramme', 'dimension' => 'masse', 'vers_base' => 1000, 'actif' => true]);
        $bag = Unite::query()->create(['code' => 'bag-test', 'nom' => 'sac de 50 kg', 'dimension' => 'masse', 'vers_base' => 50000, 'conditionnement' => true, 'actif' => true]);
        $data = ['code' => 'ENG-001', 'categorie' => 'ENG', 'libelle' => 'Urée 46% N', 'unite_achat_id' => $bag->id, 'unite_usage_id' => $kg->id, 'facteur_personnalise' => 37000, 'produit_terrain' => 'Urée 46% N', 'prix_unitaire' => 35, 'seuil_min' => 10, 'centre_cout' => 'BTA', 'actif' => true];

        $this->actingAs($user)->post('/magasin', $data)->assertRedirect();
        $article = Article::query()->where('code', 'ENG-001')->firstOrFail();
        $this->actingAs($user)->get("/magasin/{$article->id}")->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('magasin/show')->where('article.libelle', 'Urée 46% N')->has('mouvements', 0));
        $this->actingAs($user)->put("/magasin/{$article->id}", array_merge($data, ['libelle' => 'Urée granulée']))
            ->assertRedirect(route('magasin.show', $article));
        $this->assertDatabaseHas('articles', ['id' => $article->id, 'libelle' => 'Urée granulée']);
    }

    public function test_entry_and_output_use_only_compatible_units_and_write_movements(): void
    {
        $user = User::factory()->create();
        $piece = Unite::query()->create(['code' => 'piece-test', 'nom' => 'pièce', 'dimension' => 'unitaire', 'vers_base' => 1, 'actif' => true]);
        $box = Unite::query()->create(['code' => 'box-test', 'nom' => 'boîte de 12', 'dimension' => 'unitaire', 'vers_base' => 12, 'conditionnement' => true, 'actif' => true]);
        $litre = Unite::query()->create(['code' => 'litre-test', 'nom' => 'litre', 'dimension' => 'volume', 'vers_base' => 1000, 'actif' => true]);
        $article = Article::query()->create(['code' => 'EPI-001', 'categorie' => 'EPI', 'libelle' => 'Gants', 'unite_achat_id' => $box->id, 'unite_usage_id' => $piece->id, 'quantite_base' => 0, 'actif' => true]);

        $this->actingAs($user)->post("/magasin/{$article->id}/entree", ['quantite' => 2, 'unite_id' => $box->id, 'motif' => 'Réception fournisseur'])->assertRedirect();
        $this->actingAs($user)->post("/magasin/{$article->id}/sortie", ['quantite' => 3, 'unite_id' => $piece->id, 'motif' => 'Distribution terrain'])->assertRedirect();
        $this->actingAs($user)->post("/magasin/{$article->id}/entree", ['quantite' => 1, 'unite_id' => $litre->id, 'motif' => 'Incompatible'])->assertSessionHasErrors('quantite');

        $this->assertSame(2, MouvementStock::query()->where('article_id', $article->id)->count());
        $this->assertEquals(21.0, (float) $article->fresh()->quantite_base);
    }
}
