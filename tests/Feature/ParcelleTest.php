<?php

namespace Tests\Feature;

use App\Models\Culture;
use App\Models\Parcelle;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ParcelleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_parcel_registry_lists_parcels_and_exposes_the_create_page(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'type' => 'ferme']);
        $parcel = Parcelle::query()->create([
            'code' => 'K1-B-B1',
            'nom' => 'B1',
            'type' => 'parc',
            'site_id' => $site->id,
            'actif' => true,
        ]);

        $this->actingAs($user)->get('/terrain')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terrain/parcelles/index')
                ->has('parcelles', 1)
                ->where('parcelles.0.code', $parcel->code));

        $this->actingAs($user)->get('/terrain/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terrain/parcelles/form')
                ->where('mode', 'create'));
    }

    public function test_user_can_create_a_parcel_and_open_its_details(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'type' => 'ferme']);

        $response = $this->actingAs($user)->post('/terrain', [
            'code' => 'K1-B-B1',
            'nom' => 'B1',
            'type' => 'parc',
            'site_id' => $site->id,
            'surface_m2' => 120,
            'nb_planches' => 12,
            'irrigation' => 'goutte',
            'exposition' => 'plein_soleil',
            'latitude' => -4.45,
            'longitude' => 15.20,
            'actif' => true,
            'note' => 'Parcelle test.',
        ]);

        $parcel = Parcelle::query()->where('code', 'K1-B-B1')->firstOrFail();
        $response->assertRedirect(route('parcelles.show', $parcel));

        $this->actingAs($user)->get(route('parcelles.show', $parcel))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terrain/parcelles/show')
                ->where('parcelle.nom', 'B1')
                ->has('parcelle.plantations', 0));
    }

    public function test_user_can_add_a_culture_to_a_parcel(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'type' => 'ferme']);
        $parcel = Parcelle::query()->create([
            'code' => 'K1-B-B1',
            'nom' => 'B1',
            'type' => 'parc',
            'site_id' => $site->id,
            'surface_m2' => 100,
            'actif' => true,
        ]);
        $culture = Culture::query()->create([
            'code' => 'MAIS-SC419',
            'nom' => 'Maïs SC419',
            'famille' => 'Poaceae',
            'unite_travail' => 'planches',
            'unite_recolte' => 'kg',
            'actif' => true,
        ]);

        $this->actingAs($user)->post(route('parcelles.cultures.store', $parcel), [
            'culture_id' => $culture->id,
            'j0' => '2026-09-01',
            'quantite' => 4,
            'unite' => 'planches',
            'surface_m2' => 40,
            'forcer_rotation' => false,
        ])->assertRedirect();

        $this->assertDatabaseHas('plantations', [
            'parcelle_id' => $parcel->id,
            'culture_id' => $culture->id,
            'lieu' => 'B1',
            'unite' => 'planches',
            'surface_m2' => 40,
            'statut' => 'active',
        ]);
    }
}
