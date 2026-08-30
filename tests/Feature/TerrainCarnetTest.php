<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\Culture;
use App\Models\JournalAudit;
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

    public function test_carnet_page_is_available_without_replacing_the_legacy_terrain_module(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('terrain.carnet.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('terrain/carnet'));

        $this->actingAs($user)->get(route('field-app'))->assertOk();
    }

    public function test_reference_exports_the_team_tasks_but_only_marks_authorized_ones_actionable(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $mine = $this->task($viewer, 'Mon contrôle terrain');
        $theirs = $this->task($owner, 'Contrôle de la collègue');
        TacheEvenement::query()->create([
            'tache_id' => $theirs->id,
            'type' => 'faite',
            'user_nom' => $owner->name,
            'resume' => 'Contrôle consigné.',
        ]);

        $response = $this->actingAs($viewer)->getJson(route('terrain.carnet.reference'))
            ->assertOk()
            ->assertJsonStructure([
                'jeton',
                'reference' => ['sites', 'plantations', 'motifs', 'canaux_recolte', 'natures_incident'],
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
        $this->assertNotContains('surete', array_column($response->json('reference.natures_incident'), 'value'));
        $this->assertNotEmpty($response->json('journee'));
    }

    public function test_synchronisation_refuses_a_task_owned_by_someone_else(): void
    {
        $viewer = User::factory()->create();
        $owner = User::factory()->create();
        $task = $this->task($owner, 'Tâche d’autrui');

        $this->actingAs($viewer)->postJson(route('terrain.carnet.synchroniser'), [
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

        $this->actingAs($owner)->postJson(route('terrain.carnet.synchroniser'), ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', true)
            ->assertJsonPath('resultats.0.message', 'Enregistré.');

        $this->actingAs($owner)->postJson(route('terrain.carnet.synchroniser'), ['enregistrements' => [$record]])
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

        $this->actingAs($agent)->getJson(route('terrain.carnet.reference'))
            ->assertOk();
        $this->assertNotContains('surete', array_column($this->actingAs($agent)->getJson(route('terrain.carnet.reference'))->json('reference.natures_incident'), 'value'));

        $this->actingAs($agent)->postJson(route('terrain.carnet.synchroniser'), ['enregistrements' => [$record]])
            ->assertOk()
            ->assertJsonPath('resultats.0.accepte', false);
        $this->assertDatabaseMissing('incidents', ['description' => 'Déclaration sensible.']);

        $this->actingAs($supervisor)->getJson(route('terrain.carnet.reference'))
            ->assertOk();
        $this->assertContains('surete', array_column($this->actingAs($supervisor)->getJson(route('terrain.carnet.reference'))->json('reference.natures_incident'), 'value'));

        $this->actingAs($supervisor)->postJson(route('terrain.carnet.synchroniser'), ['enregistrements' => [$record]])
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

        $this->actingAs($user)->postJson(route('terrain.carnet.synchroniser'), [
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
}
