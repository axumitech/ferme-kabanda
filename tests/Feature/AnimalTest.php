<?php

namespace Tests\Feature;

use App\Models\Animal;
use App\Models\AnimalEvenement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AnimalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_animal_register_lists_animals_and_opens_create_form(): void
    {
        $user = User::factory()->create();
        Animal::query()->create([
            'code' => 'P-001', 'espece' => 'porc', 'categorie' => 'Truie reproductrice',
            'sexe' => 'femelle', 'effectif' => 1, 'statut' => 'present',
        ]);

        $this->actingAs($user)->get('/animaux')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('animaux/index')
                ->has('animaux', 1)->where('animaux.0.code', 'P-001'));
        $this->actingAs($user)->get('/animaux/create')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('animaux/form')->where('mode', 'create'));
    }

    public function test_user_can_create_update_and_open_an_animal_carnet(): void
    {
        $user = User::factory()->create();
        $data = [
            'code' => 'P-002', 'espece' => 'porc', 'categorie' => 'Cochette', 'sexe' => 'femelle',
            'effectif' => 1, 'ligne' => 'Pure', 'cohorte' => 'Blanche', 'encoche' => '12',
            'naissance' => '2026-08-01', 'origine' => 'Né sur le site', 'pere' => 'V01',
            'atelier' => 'Porcherie A', 'stade_alimentaire' => 'Porcelet sevré',
        ];

        $this->actingAs($user)->post('/animaux', $data)->assertRedirect();
        $animal = Animal::query()->where('code', 'P-002')->firstOrFail();
        $this->assertSame('V01', $animal->verrat_interdit);
        $this->assertDatabaseHas('animal_evenements', ['animal_id' => $animal->id, 'type' => 'naissance']);

        $this->actingAs($user)->get("/animaux/{$animal->id}")->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('animaux/show')
                ->where('animal.code', 'P-002')->has('evenements', 1));
        $this->actingAs($user)->put("/animaux/{$animal->id}", array_merge($data, ['categorie' => 'Truie reproductrice']))
            ->assertRedirect(route('animaux.show', $animal));
        $this->assertDatabaseHas('animaux', ['id' => $animal->id, 'categorie' => 'Truie reproductrice']);
    }

    public function test_carnet_actions_append_events_and_update_the_animal(): void
    {
        $user = User::factory()->create();
        $animal = Animal::query()->create([
            'code' => 'B-001', 'espece' => 'bovin', 'categorie' => 'Vache',
            'effectif' => 1, 'statut' => 'present',
        ]);

        $this->actingAs($user)->post("/animaux/{$animal->id}/peser", ['poids' => 320, 'date' => '2026-09-01'])->assertRedirect();
        $this->actingAs($user)->post("/animaux/{$animal->id}/traiter", [
            'type' => 'vaccination', 'produit' => 'Vaccin A', 'lot_produit' => 'LOT-01',
            'dose' => '2 ml', 'voie' => 'IM', 'duree_jours' => 1, 'dar_jours' => 7,
            'date' => '2026-09-01',
        ])->assertRedirect();
        $this->actingAs($user)->post("/animaux/{$animal->id}/observer", ['texte' => 'Bon état général.'])->assertRedirect();

        $this->assertDatabaseHas('animaux', ['id' => $animal->id, 'poids' => 320]);
        $this->assertSame(3, AnimalEvenement::query()->where('animal_id', $animal->id)->count());
        $this->assertDatabaseHas('animal_evenements', ['animal_id' => $animal->id, 'produit' => 'Vaccin A', 'lot_produit' => 'LOT-01']);
    }
}
