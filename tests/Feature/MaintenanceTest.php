<?php

namespace Tests\Feature;

use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\OrdreTravail;
use App\Models\ReferenceItem;
use App\Models\Site;
use App\Models\User;
use App\Services\MaintenanceService;
use App\Services\OrdreTravailService;
use Database\Seeders\MaintenanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class MaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_requester_cannot_approve_their_own_work_order(): void
    {
        $requester = User::factory()->create(['niveau_hierarchie' => 4]);
        $this->actingAs($requester);
        $service = app(OrdreTravailService::class);
        $workOrder = $service->demander([
            'objet' => 'Réparer la pompe de transfert',
            'origine' => 'correctif',
        ]);

        try {
            $service->approuver($workOrder);
            self::fail('Le demandeur a approuvé son propre ordre de travail.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString("ne pouvez pas l'approuver", $exception->getMessage());
        }

        $this->assertSame('demande', $workOrder->fresh()->statut);
    }

    public function test_required_lockout_blocks_work_until_it_is_confirmed(): void
    {
        $requester = User::factory()->create(['niveau_hierarchie' => 4]);
        $approver = User::factory()->create(['niveau_hierarchie' => 2]);
        $this->actingAs($requester);
        $service = app(OrdreTravailService::class);
        $workOrder = $service->demander([
            'objet' => 'Intervenir sur le tableau de la pompe',
            'consignation_requise' => true,
            'permis_travail' => 'electrique',
        ]);
        $this->actingAs($approver);
        $workOrder = $service->approuver($workOrder);

        try {
            $service->demarrer($workOrder, false);
            self::fail('Le travail a démarré sans consignation confirmée.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('CONSIGNATION NON CONFIRMÉE', $exception->getMessage());
        }

        $started = $service->demarrer($workOrder->fresh(), true);
        $this->assertSame('en_cours', $started->statut);
        $this->assertTrue($started->consignation_faite);
    }

    public function test_an_independent_manager_can_verify_an_intervention(): void
    {
        $requester = User::factory()->create(['niveau_hierarchie' => 4]);
        $approver = User::factory()->create(['niveau_hierarchie' => 2]);
        $technician = User::factory()->create(['niveau_hierarchie' => 4]);
        $verifier = User::factory()->create(['niveau_hierarchie' => 3]);
        $this->actingAs($requester);
        $service = app(OrdreTravailService::class);
        $workOrder = $service->demander(['objet' => 'Remplacer le clapet anti-retour']);
        $this->actingAs($approver);
        $workOrder = $service->approuver($workOrder);
        $workOrder->update(['responsable_id' => $technician->id]);
        $this->actingAs($technician);
        $workOrder = $service->demarrer($workOrder->fresh());
        $workOrder = $service->terminer($workOrder, [
            'travaux_realises' => 'Clapet remplacé et circuit remis en pression.',
        ]);

        $this->actingAs($verifier);
        $verified = $service->verifier($workOrder->fresh(), true, 'Essai sous pression conforme.');
        $this->assertSame('verifie', $verified->statut);
        $this->assertSame($verifier->id, $verified->verifie_par_id);
    }

    public function test_a_manager_who_executes_an_order_can_complete_its_verification(): void
    {
        $requester = User::factory()->create(['niveau_hierarchie' => 4]);
        $executingManager = User::factory()->create(['niveau_hierarchie' => 2]);
        $service = app(OrdreTravailService::class);

        $this->actingAs($requester);
        $workOrder = $service->demander(['objet' => 'Réparer la pompe non assignée']);
        $this->actingAs($executingManager);
        $workOrder = $service->approuver($workOrder);
        $workOrder = $service->demarrer($workOrder);
        $workOrder = $service->terminer($workOrder, [
            'travaux_realises' => 'Pompe démontée, roulement remplacé et essai réalisé.',
        ]);

        $verified = $service->verifier($workOrder->fresh(), true, 'Contrôle final conforme.');
        $this->assertSame('verifie', $verified->statut);
        $this->assertSame($executingManager->id, $verified->verifie_par_id);
    }

    public function test_pointing_for_another_user_keeps_that_users_name_in_the_audit_trail(): void
    {
        $manager = User::factory()->create(['niveau_hierarchie' => 2, 'name' => 'Gestionnaire atelier']);
        $technician = User::factory()->create(['name' => 'Technicien pompe']);
        $workOrder = OrdreTravail::query()->create([
            'reference' => 'OT-POINT-001',
            'origine' => 'demande',
            'type_intervention' => 'correctif',
            'objet' => 'Contrôler la pompe',
            'priorite' => 'normale',
            'statut' => 'en_cours',
            'demandeur_nom' => 'Atelier',
            'demande_le' => now(),
        ]);

        $this->actingAs($manager);
        $entry = app(OrdreTravailService::class)->pointer($workOrder, [
            'user_id' => $technician->id,
            'date' => today()->toDateString(),
            'heures' => 2,
            'travail' => 'Diagnostic hydraulique',
        ]);

        $this->assertSame($technician->id, $entry->user_id);
        $this->assertSame('Technicien pompe', $entry->intervenant_nom);

        $externalEntry = app(OrdreTravailService::class)->pointer($workOrder, [
            'intervenant_nom' => 'Mécanicien externe',
            'date' => today()->toDateString(),
            'heures' => 1,
        ]);

        $this->assertNull($externalEntry->user_id);
        $this->assertSame('Mécanicien externe', $externalEntry->intervenant_nom);
    }

    public function test_a_degraded_inspection_opens_a_corrective_work_order(): void
    {
        $inspector = User::factory()->create();
        $infrastructure = Infrastructure::query()->create([
            'code' => 'IRR-TEST',
            'nom' => 'Canal d’essai',
            'categorie' => 'irrigation',
            'etat' => 'bon',
            'periodicite_inspection_jours' => 30,
            'actif' => true,
        ]);
        $this->actingAs($inspector);

        $inspection = app(MaintenanceService::class)->inspecter($infrastructure, [
            'date' => today()->toDateString(),
            'etat_constate' => 'critique',
            'constat' => 'Une brèche vide le canal avant la parcelle.',
            'actions_immediates' => 'Vanne amont fermée.',
            'intervention_requise' => true,
        ]);

        $this->assertDatabaseHas('ordres_travail', [
            'origine' => 'inspection',
            'type_intervention' => 'correctif',
            'cible_type' => Infrastructure::class,
            'cible_id' => $infrastructure->id,
            'inspection_id' => $inspection->id,
            'priorite' => 'urgente',
        ]);
    }

    public function test_preventive_scan_does_not_open_a_duplicate_work_order(): void
    {
        $equipment = Equipement::query()->create([
            'code' => 'TR-PREV',
            'nom' => 'Tracteur préventif',
            'categorie' => 'tracteur',
            'compteur_actuel' => 250,
            'actif' => true,
        ]);
        $maintenancePlan = EntretienPlanifie::query()->create([
            'equipement_id' => $equipment->id,
            'libelle' => 'Vidange moteur',
            'periodicite_compteur' => 250,
            'prochain_compteur' => 250,
            'prochain_le' => today(),
            'operations' => 'Vidanger et remplacer le filtre.',
            'actif' => true,
        ]);
        $service = app(MaintenanceService::class);

        $first = $service->ouvrirPreventifsDus();
        $second = $service->ouvrirPreventifsDus();

        $this->assertSame(1, $first['ordres_ouverts']);
        $this->assertSame(0, $second['ordres_ouverts']);
        $this->assertSame(1, OrdreTravail::query()
            ->where('entretien_planifie_id', $maintenancePlan->id)
            ->where('cible_type', Equipement::class)
            ->where('cible_id', $equipment->id)
            ->count());
    }

    public function test_maintenance_seeder_is_idempotent(): void
    {
        Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);

        $this->seed(MaintenanceSeeder::class);
        $infrastructures = Infrastructure::query()->count();
        $maintenancePlans = EntretienPlanifie::query()->whereNotNull('infrastructure_id')->count();
        $this->seed(MaintenanceSeeder::class);

        $this->assertGreaterThan(0, $infrastructures);
        $this->assertGreaterThan(0, $maintenancePlans);
        $this->assertSame($infrastructures, Infrastructure::query()->count());
        $this->assertSame($maintenancePlans, EntretienPlanifie::query()->whereNotNull('infrastructure_id')->count());
        $this->assertSame(1, Infrastructure::query()->where('code', 'IRR-01')->count());
    }

    public function test_manager_can_open_the_workspace_and_add_a_meter_based_plan(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-PLAN',
            'nom' => 'Tracteur à planifier',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 125,
            'statut' => 'disponible',
            'actif' => true,
        ]);

        $this->actingAs($manager)->get(route('maintenance.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('maintenance')
                ->has('equipment', 1)
                ->where('equipment.0.code', 'TR-PLAN')
                ->where('permissions.canManage', true));

        $this->actingAs($manager)->post(route('maintenance.plans.store'), [
            'target_type' => 'equipment',
            'target_id' => $equipment->id,
            'libelle' => 'Vidange moteur',
            'type' => 'preventif',
            'periodicite_compteur' => 250,
            'alerte_avant_compteur' => 20,
            'operations' => 'Vidanger et remplacer le filtre.',
            'actif' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('entretiens_planifies', [
            'equipement_id' => $equipment->id,
            'libelle' => 'Vidange moteur',
            'periodicite_compteur' => 250,
            'prochain_compteur' => 375,
            'actif' => true,
        ]);
    }

    public function test_manager_can_update_a_plan_and_recalculate_its_next_meter_and_date(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-PLAN-UPD',
            'nom' => 'Tracteur plan modifiable',
            'categorie' => 'tracteur',
            'type_compteur' => 'heures',
            'compteur_actuel' => 140,
            'statut' => 'disponible',
            'actif' => true,
        ]);
        $plan = EntretienPlanifie::query()->create([
            'equipement_id' => $equipment->id,
            'libelle' => 'Ancienne vidange',
            'type' => 'preventif',
            'periodicite_compteur' => 100,
            'dernier_compteur' => 100,
            'prochain_compteur' => 200,
            'periodicite_jours' => 30,
            'dernier_le' => today()->subDays(10),
            'prochain_le' => today()->addDays(20),
            'actif' => true,
        ]);
        $lastDate = today()->subDays(5);

        $this->actingAs($manager)->put(route('maintenance.plans.update', $plan), [
            'target_type' => 'equipment',
            'target_id' => $equipment->id,
            'libelle' => 'Vidange révisée',
            'type' => 'preventif',
            'periodicite_compteur' => 250,
            'dernier_compteur' => 125,
            'periodicite_jours' => 60,
            'dernier_le' => $lastDate->toDateString(),
            'alerte_avant_compteur' => 20,
            'operations' => 'Vidanger, contrôler et remplacer les filtres.',
            'actif' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $plan->refresh();
        $this->assertSame('Vidange révisée', $plan->libelle);
        $this->assertSame('375.00', $plan->prochain_compteur);
        $this->assertSame($lastDate->copy()->addDays(60)->toDateString(), $plan->prochain_le?->toDateString());

        $this->actingAs($manager)->patch(route('maintenance.plans.update', $plan), [
            'libelle' => 'Vidange révisée partiellement',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $plan->refresh();
        $this->assertSame('Vidange révisée partiellement', $plan->libelle);
        $this->assertSame('375.00', $plan->prochain_compteur);
        $this->assertSame($lastDate->copy()->addDays(60)->toDateString(), $plan->prochain_le?->toDateString());
    }

    public function test_targeted_order_requires_a_real_active_target(): void
    {
        $user = User::factory()->create(['actif' => true]);

        $this->actingAs($user)->post(route('maintenance.orders.store'), [
            'target_type' => 'equipment',
            'objet' => 'Réparer le tracteur',
            'type_intervention' => 'correctif',
            'priorite' => 'normale',
        ])->assertSessionHasErrors('target_id');

        $this->assertDatabaseCount('ordres_travail', 0);
    }

    public function test_an_order_opened_from_an_infrastructure_keeps_its_prefilled_target_and_site(): void
    {
        $manager = User::factory()->create(['niveau_hierarchie' => 2, 'actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        $infrastructure = Infrastructure::query()->create([
            'code' => 'INF-OT-01',
            'nom' => 'Canal principal',
            'categorie' => 'irrigation',
            'site_id' => $site->id,
            'etat' => 'degrade',
            'actif' => true,
        ]);

        $this->actingAs($manager)->post(route('maintenance.orders.store'), [
            'target_type' => 'infrastructure',
            'target_id' => $infrastructure->id,
            'site_id' => $site->id,
            'objet' => 'Colmater la fuite du canal',
            'description' => 'Perte d’eau au droit de la vanne principale.',
            'type_intervention' => 'correctif',
            'priorite' => 'elevee',
            'echeance' => today()->addDays(2)->toDateString(),
            'consignation_requise' => true,
            'permis_travail' => 'aucun',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('ordres_travail', [
            'cible_type' => Infrastructure::class,
            'cible_id' => $infrastructure->id,
            'site_id' => $site->id,
            'objet' => 'Colmater la fuite du canal',
            'type_intervention' => 'correctif',
            'priorite' => 'elevee',
            'consignation_requise' => true,
        ]);
    }

    public function test_non_manager_payload_never_exposes_maintenance_costs(): void
    {
        $worker = User::factory()->create(['niveau_hierarchie' => 4, 'is_admin' => false, 'actif' => true]);
        $equipment = Equipement::query()->create([
            'code' => 'TR-COST',
            'nom' => 'Tracteur coûts masqués',
            'categorie' => 'tracteur',
            'valeur_acquisition' => 45000,
            'tarif_horaire' => 75,
            'tarif_hectare' => 32,
            'actif' => true,
        ]);
        Infrastructure::query()->create([
            'code' => 'INF-COST',
            'nom' => 'Infrastructure coûts masqués',
            'categorie' => 'batiment',
            'valeur_remplacement' => 125000,
            'actif' => true,
        ]);
        $order = OrdreTravail::query()->create([
            'reference' => 'OT-COST-001',
            'origine' => 'correctif',
            'type_intervention' => 'correctif',
            'cible_type' => Equipement::class,
            'cible_id' => $equipment->id,
            'cible_libelle' => $equipment->code.' — '.$equipment->nom,
            'objet' => 'Réparer la transmission',
            'priorite' => 'normale',
            'statut' => 'en_cours',
            'demandeur_nom' => 'Atelier',
            'demande_le' => now(),
            'cout_pieces' => 200,
            'cout_main_oeuvre' => 80,
            'cout_prestataire' => 20,
            'cout_total' => 300,
        ]);
        $order->pieces()->create([
            'designation' => 'Courroie',
            'quantite' => 1,
            'cout' => 200,
            'origine_piece' => 'achat_direct',
        ]);
        $order->pointages()->create([
            'intervenant_nom' => 'Technicien',
            'date' => today(),
            'heures' => 2,
            'cout' => 80,
        ]);

        $this->actingAs($worker)->get(route('maintenance.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('permissions.canManage', false)
                ->where('orders.0.costs', null)
                ->missing('orders.0.pieces.0.cout')
                ->missing('orders.0.time_entries.0.cout')
                ->missing('stats.cout_total')
                ->missing('equipment.0.valeur_acquisition')
                ->missing('equipment.0.tarif_horaire')
                ->missing('equipment.0.tarif_hectare')
                ->missing('infrastructures.0.valeur_remplacement'));
    }

    public function test_long_work_order_labels_are_safely_limited_in_dependent_records(): void
    {
        $requester = User::factory()->create(['niveau_hierarchie' => 4]);
        $manager = User::factory()->create(['niveau_hierarchie' => 2]);
        $technician = User::factory()->create(['niveau_hierarchie' => 4]);
        $service = app(OrdreTravailService::class);
        $object = str_repeat('A', 255);

        $this->actingAs($requester);
        $order = $service->demander(['objet' => $object]);
        $this->assertLessThanOrEqual(255, mb_strlen((string) $order->evenements()->latest('id')->value('resume')));

        $this->actingAs($manager);
        $order = $service->approuver($order);
        $order = $service->planifier($order, [
            'responsable_id' => $technician->id,
            'planifie_le' => today()->toDateString(),
        ]);
        $this->assertLessThanOrEqual(200, mb_strlen((string) $order->tache?->titre));

        $service->ajouterPiece($order, [
            'origine_piece' => 'achat_direct',
            'designation' => str_repeat('B', 255),
            'quantite' => 1,
            'unite' => 'pièce',
            'cout' => 10,
        ]);
        $this->assertLessThanOrEqual(255, mb_strlen((string) $order->evenements()->latest('id')->value('resume')));
    }

    public function test_non_stock_part_requires_and_keeps_its_free_designation_and_unit(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $order = OrdreTravail::query()->create([
            'reference' => 'OT-EXT-001',
            'origine' => 'demande',
            'type_intervention' => 'correctif',
            'objet' => 'Réparer le groupe électrogène',
            'priorite' => 'normale',
            'statut' => 'en_cours',
            'demandeur_nom' => 'Atelier',
            'demande_le' => now(),
        ]);

        $this->actingAs($manager)->post(route('maintenance.orders.pieces.store', $order), [
            'origine_piece' => 'achat_direct',
            'quantite' => 1,
            'cout' => 25,
        ])->assertSessionHasErrors(['designation', 'unite']);

        $this->actingAs($manager)->post(route('maintenance.orders.pieces.store', $order), [
            'origine_piece' => 'achat_direct',
            'designation' => 'Joint mécanique spécial',
            'quantite' => 1,
            'unite' => 'pièce',
            'cout' => 25,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('ot_pieces', [
            'ordre_travail_id' => $order->id,
            'designation' => 'Joint mécanique spécial',
            'unite' => 'pièce',
            'origine_piece' => 'achat_direct',
        ]);
    }

    public function test_maintenance_photos_are_uploaded_and_exposed_as_public_proofs(): void
    {
        Storage::fake('public');
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);

        $this->actingAs($manager)->post(route('maintenance.orders.store'), [
            'target_type' => 'none',
            'objet' => 'Réparer une fuite',
            'type_intervention' => 'correctif',
            'priorite' => 'normale',
            'photo_avant' => UploadedFile::fake()->image('avant.jpg'),
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $order = OrdreTravail::query()->firstOrFail();
        Storage::disk('public')->assertExists((string) $order->photo_avant);
        $order->update(['statut' => 'en_cours']);

        $this->actingAs($manager)->post(route('maintenance.orders.finish', $order), [
            'travaux_realises' => 'Conduite remplacée et testée sous pression.',
            'photo_apres' => UploadedFile::fake()->image('apres.png'),
        ])->assertRedirect()->assertSessionDoesntHaveErrors();
        $order->refresh();
        Storage::disk('public')->assertExists((string) $order->photo_apres);

        $infrastructure = Infrastructure::query()->create([
            'code' => 'INF-PHOTO',
            'nom' => 'Canal photographié',
            'categorie' => 'irrigation',
            'etat' => 'bon',
            'actif' => true,
        ]);
        $this->actingAs($manager)->post(route('maintenance.infrastructures.inspect', $infrastructure), [
            'date' => today()->toDateString(),
            'etat_constate' => 'bon',
            'constat' => 'Aucune dégradation visible.',
            'photo_chemin' => UploadedFile::fake()->image('inspection.jpg'),
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $inspection = $infrastructure->inspections()->firstOrFail();
        Storage::disk('public')->assertExists((string) $inspection->photo_chemin);

        $this->actingAs($manager)->get(route('maintenance.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('orders.0.photo_before_url', Storage::disk('public')->url((string) $order->photo_avant))
                ->where('orders.0.photo_after_url', Storage::disk('public')->url((string) $order->photo_apres))
                ->where('infrastructures.0.inspections.0.photo_url', Storage::disk('public')->url((string) $inspection->photo_chemin)));
    }

    public function test_infrastructure_can_be_linked_only_to_an_active_parcel_reference(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $parcel = ReferenceItem::query()->create([
            'category' => 'parcelles',
            'label' => 'Bloc maintenance',
            'active' => true,
        ]);
        $wrongReference = ReferenceItem::query()->create([
            'category' => 'cultures',
            'label' => 'Culture non parcelle',
            'active' => true,
        ]);

        $this->actingAs($manager)->post(route('maintenance.infrastructures.store'), [
            'code' => 'INF-PARC-01',
            'nom' => 'Canal du bloc maintenance',
            'categorie' => 'irrigation',
            'site_id' => null,
            'parcelle_id' => $parcel->id,
            'etat' => 'bon',
            'criticite' => 2,
            'actif' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('infrastructures', [
            'code' => 'INF-PARC-01',
            'parcelle_id' => $parcel->id,
        ]);

        $this->actingAs($manager)->get(route('maintenance.index', ['resource' => 'infrastructures']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('infrastructures.0.parcelle.id', $parcel->id)
                ->where('infrastructures.0.parcelle.label', 'Bloc maintenance')
                ->has('parcelles', 18));

        $this->actingAs($manager)->put(route('maintenance.infrastructures.update', Infrastructure::query()->firstOrFail()), [
            'code' => 'INF-PARC-01',
            'nom' => 'Canal du bloc maintenance',
            'categorie' => 'irrigation',
            'parcelle_id' => $wrongReference->id,
            'etat' => 'bon',
            'criticite' => 2,
            'actif' => true,
        ])->assertSessionHasErrors('parcelle_id');
    }

    public function test_work_orders_are_paginated_past_120_and_filtered_by_nature_and_priority(): void
    {
        $manager = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $now = now();
        $rows = [];

        for ($index = 1; $index <= 121; $index++) {
            $rows[] = [
                'reference' => sprintf('OT-PAGE-%03d', $index),
                'origine' => 'demande',
                'type_intervention' => 'correctif',
                'objet' => "Ordre paginé {$index}",
                'priorite' => 'normale',
                'statut' => 'demande',
                'demandeur_nom' => 'Test pagination',
                'demande_le' => $now->copy()->subMinutes($index),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }
        $rows[] = [
            'reference' => 'OT-FILTRE-URGENT',
            'origine' => 'preventif',
            'type_intervention' => 'preventif',
            'objet' => 'Entretien urgent filtré',
            'priorite' => 'urgente',
            'statut' => 'demande',
            'demandeur_nom' => 'Test filtres',
            'demande_le' => $now->copy()->addMinute(),
            'created_at' => $now,
            'updated_at' => $now,
        ];
        OrdreTravail::query()->insert($rows);

        $this->actingAs($manager)->get(route('maintenance.index', ['page' => 3]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('orderPagination.currentPage', 3)
                ->where('orderPagination.lastPage', 3)
                ->where('orderPagination.total', 122)
                ->has('orders', 22));

        $this->actingAs($manager)->get(route('maintenance.index', [
            'statut' => 'all',
            'nature' => 'preventif',
            'priorite' => 'urgente',
        ]))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('orderPagination.total', 1)
                ->where('orderFilters.nature', 'preventif')
                ->where('orderFilters.priorite', 'urgente')
                ->where('orders.0.reference', 'OT-FILTRE-URGENT'));
    }
}
