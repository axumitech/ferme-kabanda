<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\InterventionEquipement;
use App\Models\OrdreTravail;
use App\Models\Tache;
use App\Models\TravailEquipement;
use App\Models\Unite;
use App\Models\User;
use App\Services\MagasinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EquipmentActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_work_log_updates_the_meter_consumes_fuel_and_opens_an_anomaly_task(): void
    {
        $manager = User::factory()->create([
            'is_admin' => true,
            'actif' => true,
            'name' => 'Responsable atelier',
        ]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-FT-01',
            'nom' => 'Tracteur fiche test',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 100,
            'consommation_ref' => 4,
            'responsable_id' => $manager->id,
            'statut' => 'disponible',
            'actif' => true,
        ]);
        $litre = Unite::query()->where('code', 'l')->firstOrFail();
        $fuel = Article::query()->create([
            'code' => 'CAR-GAZ-TEST',
            'categorie' => 'CAR',
            'libelle' => 'Gazole test',
            'unite_achat_id' => $litre->id,
            'unite_usage_id' => $litre->id,
            'prix_unitaire' => 1.50,
            'quantite_base' => 0,
            'actif' => true,
        ]);

        $this->actingAs($manager);
        app(MagasinService::class)->entree($fuel, 100, $litre, 'Stock initial du test');

        $response = $this->post(route('maintenance.equipment.work-logs.store', $equipment), [
            'date' => today()->toDateString(),
            'operateur_id' => $manager->id,
            'heure_debut' => '08:00',
            'heure_fin' => '10:30',
            'compteur_debut' => 100,
            'compteur_fin' => 105,
            'nature' => 'interne',
            'travail' => 'Préparation du sol',
            'article_carburant_id' => $fuel->id,
            'carburant_litres' => 10,
            'devise' => 'USD',
            'anomalie' => 'Fuite légère sur le flexible hydraulique.',
        ]);

        $response->assertRedirect()->assertSessionHasNoErrors();

        $work = TravailEquipement::query()->sole();
        $this->assertSame('2.50', $work->duree_heures);
        $this->assertSame('5.00', $work->compteur_parcouru);
        $this->assertSame('15.00', $work->cout_carburant);
        $this->assertNotNull($work->mouvement_carburant_id);
        $this->assertNotNull($work->tache_id);
        $this->assertSame('105.00', $equipment->fresh()->compteur_actuel);
        $this->assertSame(90.0, $fuel->fresh()->stockUsage());
        $this->assertTrue(Tache::query()->whereKey($work->tache_id)->exists());
    }

    public function test_a_work_log_cannot_move_the_known_meter_backwards(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-FT-02',
            'nom' => 'Tracteur compteur test',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 100,
            'statut' => 'disponible',
            'actif' => true,
        ]);

        $response = $this->actingAs($manager)->post(
            route('maintenance.equipment.work-logs.store', $equipment),
            [
                'date' => today()->toDateString(),
                'compteur_debut' => 90,
                'compteur_fin' => 95,
                'nature' => 'interne',
                'travail' => 'Essai du compteur',
                'devise' => 'USD',
            ],
        );

        $response->assertRedirect()->assertSessionHasErrors('maintenance');
        $this->assertDatabaseCount('travaux_equipement', 0);
        $this->assertSame('100.00', $equipment->fresh()->compteur_actuel);
    }

    public function test_a_linked_intervention_recalculates_the_plan_and_an_autonomous_one_does_not(): void
    {
        $manager = User::factory()->create([
            'is_admin' => true,
            'actif' => true,
            'name' => 'Chef maintenance',
        ]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-MNT-01',
            'nom' => 'Tracteur entretien test',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 300,
            'statut' => 'maintenance',
            'motif_immobilisation' => 'Vidange en cours',
            'actif' => true,
        ]);
        $plan = EntretienPlanifie::query()->create([
            'equipement_id' => $equipment->id,
            'libelle' => 'Vidange moteur',
            'type' => 'preventif',
            'periodicite_compteur' => 250,
            'periodicite_jours' => 30,
            'prochain_compteur' => 300,
            'prochain_le' => today(),
            'actif' => true,
        ]);

        $linked = $this->actingAs($manager)->post(
            route('maintenance.equipment.interventions.store', $equipment),
            [
                'date' => today()->toDateString(),
                'type' => 'preventif',
                'entretien_planifie_id' => $plan->id,
                'compteur' => 300,
                'description' => 'Vidange et remplacement des filtres.',
                'pieces_utilisees' => 'Filtre à huile x1',
                'cout_pieces' => 40,
                'cout_main_oeuvre' => 20,
                'immobilisation_heures' => 3,
                'remettre_en_service' => 1,
            ],
        );

        $linked->assertRedirect()->assertSessionHasNoErrors();
        $plan->refresh();
        $this->assertSame('300.00', $plan->dernier_compteur);
        $this->assertSame('550.00', $plan->prochain_compteur);
        $this->assertSame(today()->addDays(30)->toDateString(), $plan->prochain_le?->toDateString());
        $this->assertSame('disponible', $equipment->fresh()->statut);

        $autonomous = $this->post(
            route('maintenance.equipment.interventions.store', $equipment),
            [
                'date' => today()->toDateString(),
                'type' => 'controle',
                'compteur' => 301,
                'description' => 'Contrôle autonome après remise en service.',
            ],
        );

        $autonomous->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseCount('interventions_equipement', 2);
        $this->assertSame(1, InterventionEquipement::query()->whereNull('entretien_planifie_id')->count());
        $this->assertSame('550.00', $plan->fresh()->prochain_compteur);
        $this->assertSame(1, $plan->interventions()->count());
    }

    public function test_meter_update_opens_only_one_targeted_preventive_order_when_plan_becomes_close(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-PREV-CIBLE',
            'nom' => 'Tracteur préventif ciblé',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 100,
            'statut' => 'disponible',
            'actif' => true,
        ]);
        $plan = EntretienPlanifie::query()->create([
            'equipement_id' => $equipment->id,
            'libelle' => 'Vidange ciblée',
            'type' => 'preventif',
            'periodicite_compteur' => 10,
            'prochain_compteur' => 110,
            'alerte_avant_compteur' => 5,
            'actif' => true,
        ]);

        $this->actingAs($manager)->post(route('maintenance.equipment.work-logs.store', $equipment), [
            'date' => today()->toDateString(),
            'compteur_debut' => 100,
            'compteur_fin' => 106,
            'nature' => 'interne',
            'travail' => 'Travail faisant approcher la vidange',
            'devise' => 'USD',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('ordres_travail', [
            'cible_type' => Equipement::class,
            'cible_id' => $equipment->id,
            'entretien_planifie_id' => $plan->id,
            'origine' => 'preventif',
            'priorite' => 'normale',
        ]);

        $this->actingAs($manager)->post(route('maintenance.equipment.work-logs.store', $equipment), [
            'date' => today()->toDateString(),
            'compteur_debut' => 106,
            'compteur_fin' => 111,
            'nature' => 'interne',
            'travail' => 'Travail dépassant ensuite la vidange',
            'devise' => 'USD',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertSame(1, OrdreTravail::query()
            ->where('cible_type', Equipement::class)
            ->where('cible_id', $equipment->id)
            ->where('entretien_planifie_id', $plan->id)
            ->whereNotIn('statut', ['clos', 'refuse', 'annule'])
            ->count());
    }

    public function test_workspace_exposes_work_logs_and_interventions_beyond_the_twenty_fifth_entry(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-HIST-26',
            'nom' => 'Tracteur historique complet',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 200,
            'statut' => 'disponible',
            'actif' => true,
        ]);

        for ($index = 1; $index <= 26; $index++) {
            TravailEquipement::query()->create([
                'reference' => sprintf('FT-HIST-%02d', $index),
                'equipement_id' => $equipment->id,
                'date' => today()->subDays($index),
                'operateur_nom' => 'Opérateur historique',
                'nature' => 'interne',
                'travail' => "Travail historique {$index}",
            ]);
            InterventionEquipement::query()->create([
                'reference' => sprintf('MNT-HIST-%02d', $index),
                'equipement_id' => $equipment->id,
                'date' => today()->subDays($index),
                'type' => 'controle',
                'description' => "Intervention historique {$index}",
                'realise_par_nom' => 'Technicien historique',
            ]);
        }

        $this->actingAs($manager)->get(route('maintenance.index', ['resource' => 'equipment']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('equipment.0.work_logs', 26)
                ->has('equipment.0.interventions', 26));
    }
}
