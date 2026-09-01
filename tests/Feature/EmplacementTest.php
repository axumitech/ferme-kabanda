<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Emplacement;
use App\Models\Site;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmplacementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_can_create_and_edit_an_emplacement_visible_in_inventories(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1 — 19,57 ha', 'type' => 'ferme', 'actif' => true]);

        $this->actingAs($admin)->get('/emplacements/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('emplacements/form')->where('mode', 'create')->has('types', 5)->has('sites', 1));

        $this->actingAs($admin)->post('/emplacements', [
            'code' => 'A-03-2-07', 'libelle' => 'Casier engrais', 'zone' => 'Local A',
            'type' => 'casier', 'site_id' => $site->id, 'actif' => true,
        ])->assertRedirect();

        $emplacement = Emplacement::query()->firstOrFail();
        $this->actingAs($admin)->get('/inventaires/create')->assertInertia(fn (Assert $page) => $page
            ->where('emplacements.0.code', 'A-03-2-07')->where('emplacements.0.libelle', 'Casier engrais'));

        $this->actingAs($admin)->put("/emplacements/{$emplacement->id}", [
            'code' => 'A-03-2-08', 'libelle' => 'Casier semences', 'zone' => 'Local A',
            'type' => 'casier', 'site_id' => $site->id, 'actif' => false,
        ])->assertRedirect('/emplacements');

        $this->assertDatabaseHas('emplacements', ['code' => 'A-03-2-08', 'actif' => false]);
    }

    public function test_index_displays_article_count_and_non_admin_is_forbidden(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);
        $location = Emplacement::query()->create(['code' => 'B-01', 'libelle' => 'Palette B', 'type' => 'palette', 'actif' => true]);
        $unit = Unite::query()->create(['code' => 'piece-emp', 'nom' => 'pièce', 'dimension' => 'unitaire', 'vers_base' => 1, 'actif' => true]);
        Article::query()->create(['code' => 'PHY-004', 'categorie' => 'PHY', 'libelle' => 'Article test', 'unite_achat_id' => $unit->id, 'unite_usage_id' => $unit->id, 'emplacement_id' => $location->id, 'actif' => true]);

        $this->actingAs($admin)->get('/emplacements')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('emplacements/index')->where('emplacements.0.articles_count', 1)->where('types.palette', 'Palette'));
        $this->actingAs($user)->get('/emplacements')->assertForbidden();
    }
}
