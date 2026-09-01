<?php

namespace Tests\Feature;

use App\Models\MatiereActive;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MatiereActiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_reference_lists_active_ingredients_and_opens_create_form(): void
    {
        $user = User::factory()->create();
        MatiereActive::query()->create([
            'nom' => 'Mancozèbe', 'famille' => 'fongicide', 'groupe_frac' => 'M03',
            'mode_action' => 'Multisite', 'interdit' => false, 'actif' => true,
        ]);

        $this->actingAs($user)->get('/matieres-actives')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('matieres-actives/index')
                ->has('matieres', 1)->where('matieres.0.nom', 'Mancozèbe')
                ->where('familles.fongicide', 'Fongicide'));
        $this->actingAs($user)->get('/matieres-actives/create')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('matieres-actives/form')->where('mode', 'create'));
    }

    public function test_user_can_create_and_update_an_active_ingredient(): void
    {
        $user = User::factory()->create();
        $data = [
            'nom' => 'Produit test', 'famille' => 'fongicide', 'groupe_frac' => '2',
            'groupe_irac' => 'invalide', 'groupe_hrac' => 'invalide', 'mode_action' => 'Contact',
            'dar_jours' => 7, 'delai_reentree_heures' => 24, 'interdit' => true,
            'motif_interdiction' => 'Résistance locale.', 'actif' => true,
        ];

        $this->actingAs($user)->post('/matieres-actives', $data)->assertRedirect();
        $matiere = MatiereActive::query()->where('nom', 'Produit test')->firstOrFail();
        $this->assertNull($matiere->groupe_irac);
        $this->assertNull($matiere->groupe_hrac);

        $this->actingAs($user)->put("/matieres-actives/{$matiere->id}", array_merge($data, [
            'nom' => 'Produit modifié', 'interdit' => false, 'motif_interdiction' => '',
        ]))->assertRedirect(route('matieres-actives.index'));

        $this->assertDatabaseHas('matieres_actives', [
            'id' => $matiere->id, 'nom' => 'Produit modifié', 'interdit' => false,
            'motif_interdiction' => null,
        ]);
    }
}
