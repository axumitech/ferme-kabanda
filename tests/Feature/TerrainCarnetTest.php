<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\Culture;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\JournalAudit;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Site;
use App\Models\Tache;
use App\Models\TacheEvenement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TerrainCarnetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_carnet_remains_available_at_its_dedicated_url(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('terrain.carnet.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('terrain/carnet'));

        $this->actingAs($user)->get('/terrain/carnet')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('terrain/carnet'));
    }

    public function test_reference_exports_the_team_tasks_but_only_marks_authorized_ones_actionable(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $mine = $this->task($viewer, 'Mon contrôle terrain');
        $theirs = $this->task($owner, 'Contrôle de la collègue');
        $activeEquipment = Equipement::query()->create([
            'code' => 'TR-01',
            'nom' => 'Tracteur principal',
            'categorie' => 'tracteur',
            'actif' => true,
        ]);
        Equipement::query()->create([
            'code' => 'TR-99',
            'nom' => 'Tracteur réformé',
            'categorie' => 'tracteur',
            'actif' => false,
        ]);
        $activeInfrastructure = Infrastructure::query()->create([
            'code' => 'IRR-01',
            'nom' => 'Canal principal',
            'categorie' => 'irrigation',
            'actif' => true,
        ]);
        Infrastructure::query()->create([
            'code' => 'IRR-99',
            'nom' => 'Ancien canal',
            'categorie' => 'irrigation',
            'actif' => false,
        ]);
        $openOrders = collect(['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'])
            ->map(fn (string $status, int $index): OrdreTravail => $this->workOrder($status, 'OT-TERRAIN-OPEN-'.($index + 1)));
        $closedOrders = collect(['clos', 'refuse', 'annule'])
            ->map(fn (string $status, int $index): OrdreTravail => $this->workOrder($status, 'OT-TERRAIN-CLOSED-'.($index + 1)));
        TacheEvenement::query()->create([
            'tache_id' => $theirs->id,
            'type' => 'faite',
            'user_nom' => $owner->name,
            'resume' => 'Contrôle consigné.',
        ]);

        $response = $this->actingAs($viewer)->getJson('/terrain/api/reference')
            ->assertOk()
            ->assertJsonStructure([
                'jeton',
                'reference' => [
                    'sites',
                    'plantations',
                    'equipements',
                    'infrastructures',
                    'ordres_travail',
                    'motifs',
                    'canaux_recolte',
                    'natures_incident',
                ],
                'taches',
                'journee',
            ]);

        $tasks = collect($response->json('taches'));
        $ownTask = $tasks->firstWhere('id', $mine->id);
        $otherTask = $tasks->firstWhere('id', $theirs->id);

        $this->assertTrue($ownTask['can_act']);
        $this->assertTrue($ownTask['mienne']);
        $this->assertFalse($otherTask['can_act']);
        $this->assertFalse($otherTask['mienne']);
        $this->assertSame([$activeEquipment->id], array_column($response->json('reference.equipements'), 'id'));
        $this->assertSame([$activeInfrastructure->id], array_column($response->json('reference.infrastructures'), 'id'));
        $this->assertEqualsCanonicalizing(
            $openOrders->pluck('id')->all(),
            array_column($response->json('reference.ordres_travail'), 'id'),
        );
        $this->assertEmpty(array_intersect(
            $closedOrders->pluck('id')->all(),
            array_column($response->json('reference.ordres_travail'), 'id'),
        ));
        $this->assertNotContains('surete', array_column($response->json('reference.natures_incident'), 'value'));
        $this->assertNotEmpty($response->json('journee'));
    }

    public function test_task_breakdown_sync_refuses_missing_closed_and_non_breakdown_work_orders(): void
    {
        $user = User::factory()->create();
        $task = $this->task($user, 'Irrigation du bloc A');
        $breakdown = $this->breakdownReason();
        $rain = MotifNonExecution::query()->create([
            'code' => 'PLUIE',
            'libelle' => 'Pluie',
            'recevable' => true,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
            'actif' => true,
        ]);
        $closedOrder = $this->workOrder('clos', 'OT-TERRAIN-CLOSED-101');
        $openOrder = $this->workOrder('approuve', 'OT-TERRAIN-OPEN-101');

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [[
                'uuid' => 'terrain-panne-sans-ot-0001',
                'type' => 'tache_non_faite',
                'donnees' => [
                    'tache_id' => $task->id,
                    'motif_id' => $breakdown->id,
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', false)
            ->assertJsonPath('resultats.0.message', 'Le motif PANNE exige un ordre de travail ouvert.');

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [[
                'uuid' => 'terrain-panne-ot-clos-0001',
                'type' => 'tache_non_faite',
                'donnees' => [
                    'tache_id' => $task->id,
                    'motif_id' => $breakdown->id,
                    'ordre_travail_id' => $closedOrder->id,
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', false)
            ->assertJsonPath('resultats.0.message', 'L’ordre de travail sélectionné est introuvable ou n’est plus ouvert.');

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [[
                'uuid' => 'terrain-pluie-avec-ot-0001',
                'type' => 'tache_non_faite',
                'donnees' => [
                    'tache_id' => $task->id,
                    'motif_id' => $rain->id,
                    'ordre_travail_id' => $openOrder->id,
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', false)
            ->assertJsonPath('resultats.0.message', 'Un ordre de travail ne peut être lié qu’au motif PANNE.');

        $task->refresh();
        $this->assertSame(StatutTache::AFaire, $task->statut);
        $this->assertNull($task->ordre_travail_id);
        $this->assertDatabaseMissing('journal_audit', ['reference_externe' => 'terrain-panne-sans-ot-0001']);
        $this->assertDatabaseMissing('journal_audit', ['reference_externe' => 'terrain-panne-ot-clos-0001']);
        $this->assertDatabaseMissing('journal_audit', ['reference_externe' => 'terrain-pluie-avec-ot-0001']);
    }

    public function test_task_breakdown_sync_links_an_open_work_order_and_uses_its_reference_as_proof(): void
    {
        $user = User::factory()->create();
        $task = $this->task($user, 'Irrigation du bloc B');
        $breakdown = $this->breakdownReason();
        $openOrder = $this->workOrder('en_cours', 'OT-TERRAIN-OPEN-201');

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [[
                'uuid' => 'terrain-panne-ot-ouvert-0001',
                'type' => 'tache_non_faite',
                'donnees' => [
                    'tache_id' => $task->id,
                    'motif_id' => $breakdown->id,
                    'ordre_travail_id' => $openOrder->id,
                    'motif_precision' => 'Pompe déposée à l’atelier.',
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Enregistré.');

        $task->refresh();
        $this->assertSame(StatutTache::NonFaiteJustifiee, $task->statut);
        $this->assertSame($openOrder->id, $task->ordre_travail_id);
        $this->assertSame('OT-TERRAIN-OPEN-201 Pompe déposée à l’atelier.', $task->motif_precision);
        $this->assertDatabaseHas('tache_evenements', [
            'tache_id' => $task->id,
            'type' => 'justifiee',
        ]);
        $this->assertDatabaseHas('journal_audit', [
            'reference_externe' => 'terrain-panne-ot-ouvert-0001',
        ]);
    }

    public function test_synchronisation_refuses_a_task_owned_by_someone_else(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $task = $this->task($owner, 'Tâche d’autrui');

        $this->actingAs($viewer)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [[
                'uuid' => 'terrain-refus-tache-0001',
                'type' => 'tache_faite',
                'donnees' => ['tache_id' => $task->id, 'quantite' => 2, 'unite' => 'planches'],
            ]],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', false)
            ->assertJsonPath('resultats.0.uuid', 'terrain-refus-tache-0001');

        $this->assertSame(StatutTache::AFaire, $task->fresh()->statut);
        $this->assertDatabaseMissing('journal_audit', ['reference_externe' => 'terrain-refus-tache-0001']);
    }

    public function test_synchronisation_is_idempotent_for_a_completed_task(): void
    {
        $owner = User::factory()->create();
        $task = $this->task($owner, 'Arrosage à synchroniser');
        $record = [
            'uuid' => 'terrain-tache-idempotente-0001',
            'type' => 'tache_faite',
            'appareil' => 'telephone-test',
            'saisi_le' => now()->toIso8601String(),
            'gps' => ['lat' => -4.45123, 'lon' => 15.26667],
            'donnees' => [
                'tache_id' => $task->id,
                'quantite' => 4,
                'unite' => 'planches',
                'commentaire' => 'Réalisé sans réseau.',
            ],
        ];

        $this->actingAs($owner)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Enregistré.');

        $this->actingAs($owner)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Déjà reçu.');

        $this->assertSame(StatutTache::Faite, $task->fresh()->statut);
        $this->assertSame(1, TacheEvenement::query()->where('tache_id', $task->id)->where('type', 'faite')->count());
        $this->assertSame(1, JournalAudit::query()->where('reference_externe', $record['uuid'])->count());
        $this->assertDatabaseHas('journal_audit', [
            'reference_externe' => $record['uuid'],
            'appareil' => 'telephone-test',
            'gps' => '-4.45123,15.26667',
        ]);
    }

    public function test_synchronisation_opens_one_corrective_work_order_for_an_offline_breakdown(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create([
            'code' => 'KBG',
            'nom' => 'Kabanda',
            'actif' => true,
        ]);
        $equipment = Equipement::query()->create([
            'code' => 'POM-01',
            'nom' => 'Pompe du forage',
            'categorie' => 'pompe',
            'actif' => true,
        ]);
        $record = [
            'uuid' => 'terrain-panne-idempotente-0001',
            'type' => 'ordre_travail',
            'appareil' => 'telephone-maintenance',
            'donnees' => [
                'cible_type' => 'equipement',
                'cible_id' => $equipment->id,
                'site_id' => $site->id,
                'objet' => 'Pompe bloquée au démarrage',
                'description' => 'Le moteur ronfle, mais l’axe ne tourne pas.',
                'priorite' => 'normale',
                'arret_production' => true,
                'consequence' => 'L’irrigation est interrompue.',
                'consignation_requise' => true,
                'permis_travail' => 'electrique',
                'epi_requis' => 'Gants isolants et lunettes',
            ],
        ];

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Enregistré.');

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Déjà reçu.');

        $this->assertDatabaseCount('ordres_travail', 1);
        $this->assertDatabaseHas('ordres_travail', [
            'origine' => 'demande',
            'type_intervention' => 'correctif',
            'cible_type' => Equipement::class,
            'cible_id' => $equipment->id,
            'site_id' => $site->id,
            'demandeur_id' => $user->id,
            'objet' => 'Pompe bloquée au démarrage',
            'priorite' => 'urgente',
            'arret_production' => true,
            'consignation_requise' => true,
            'permis_travail' => 'electrique',
        ]);
        $this->assertSame(1, OrdreTravail::query()->where('cible_id', $equipment->id)->count());
        $this->assertSame(1, JournalAudit::query()->where('reference_externe', $record['uuid'])->count());
    }

    public function test_surete_is_hidden_and_refused_to_an_agent_but_available_to_an_authorized_supervisor(): void
    {
        $agent = User::factory()->create(['niveau_hierarchie' => 4]);
        $supervisor = User::factory()->create(['niveau_hierarchie' => 2]);
        $record = [
            'uuid' => 'terrain-surete-0001',
            'type' => 'incident',
            'donnees' => [
                'nature' => 'surete',
                'survenu_le' => now()->subHour()->toIso8601String(),
                'description' => 'Déclaration sensible.',
            ],
        ];

        $this->actingAs($agent)->getJson('/terrain/api/reference')
            ->assertOk();
        $this->assertNotContains('surete', array_column($this->actingAs($agent)->getJson('/terrain/api/reference')->json('reference.natures_incident'), 'value'));

        $this->actingAs($agent)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', false);
        $this->assertDatabaseMissing('incidents', ['description' => 'Déclaration sensible.']);

        $this->actingAs($supervisor)->getJson('/terrain/api/reference')
            ->assertOk();
        $this->assertContains('surete', array_column($this->actingAs($supervisor)->getJson('/terrain/api/reference')->json('reference.natures_incident'), 'value'));

        $this->actingAs($supervisor)->postJson('/terrain/api/synchroniser', ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true);
        $this->assertDatabaseHas('incidents', ['nature' => 'surete', 'description' => 'Déclaration sensible.']);
    }

    public function test_synchronisation_records_harvests_and_incidents_through_existing_services(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        $culture = Culture::query()->create([
            'code' => 'TOM',
            'nom' => 'Tomate',
            'unite_recolte' => 'kg',
            'unite_travail' => 'planches',
            'actif' => true,
        ]);
        $plantation = Plantation::query()->create([
            'reference' => 'PLT-2026-08-0001',
            'culture_id' => $culture->id,
            'site_id' => $site->id,
            'lieu' => 'Parcelle A',
            'j0' => today(),
            'statut' => 'active',
        ]);

        $this->actingAs($user)->postJson('/terrain/api/synchroniser', [
            'enregistrements' => [
                [
                    'uuid' => 'terrain-recolte-0001',
                    'type' => 'recolte',
                    'donnees' => [
                        'plantation_id' => $plantation->id,
                        'date' => today()->toDateString(),
                        'quantite' => 18.5,
                        'unite' => 'kg',
                        'qualite' => 'A',
                        'canal_commercial' => Recolte::CANAUX[0],
                    ],
                ],
                [
                    'uuid' => 'terrain-incident-0001',
                    'type' => 'incident',
                    'donnees' => [
                        'nature' => 'securite',
                        'survenu_le' => now()->subHour()->toIso8601String(),
                        'site_id' => $site->id,
                        'lieu' => 'Parcelle A',
                        'description' => 'Sol glissant après la pluie.',
                        'actions_immediates' => 'Zone balisée.',
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.1.accepte', true);

        $this->assertDatabaseHas('recoltes', [
            'plantation_id' => $plantation->id,
            'quantite' => 18.5,
            'canal_commercial' => Recolte::CANAUX[0],
        ]);
        $this->assertDatabaseHas('incidents', [
            'nature' => 'securite',
            'lieu' => 'Parcelle A',
            'description' => 'Sol glissant après la pluie.',
        ]);
    }

    private function task(User $owner, string $title): Tache
    {
        return Tache::query()->create([
            'reference' => 'TSK-2026-08-'.str_pad((string) Tache::query()->count() + 1, 4, '0', STR_PAD_LEFT),
            'source' => SourceTache::Manuelle,
            'titre' => $title,
            'responsable_id' => $owner->id,
            'date_due' => today(),
        ]);
    }

    private function breakdownReason(): MotifNonExecution
    {
        return MotifNonExecution::query()->create([
            'code' => 'PANNE',
            'libelle' => "Panne d'équipement",
            'recevable' => true,
            'preuve_requise' => MotifNonExecution::PREUVE_BON_TRAVAIL,
            'actif' => true,
        ]);
    }

    private function workOrder(string $status, string $reference): OrdreTravail
    {
        return OrdreTravail::query()->create([
            'reference' => $reference,
            'origine' => 'correctif',
            'type_intervention' => 'correctif',
            'objet' => 'Réparer la pompe principale',
            'priorite' => 'normale',
            'arret_production' => false,
            'statut' => $status,
            'demandeur_nom' => 'Atelier',
            'demande_le' => now(),
        ]);
    }
}
