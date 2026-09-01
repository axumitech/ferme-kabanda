<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\Article;
use App\Models\Departement;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\JournalAudit;
use App\Models\MotifNonExecution;
use App\Models\Site;
use App\Models\Tache;
use App\Models\TacheEvenement;
use App\Models\Unite;
use App\Models\User;
use App\Services\MagasinService;
use App\Services\TacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class OperationalSocleTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_service_requires_all_due_tasks_to_be_answered_before_closing_the_day(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        $departement = Departement::query()->create(['code' => 'AGR', 'nom' => 'Bureau Technique Agricole']);
        $service = app(TacheService::class);

        $this->actingAs($admin);

        $tache = $service->creer([
            'source' => SourceTache::Manuelle,
            'titre' => 'Arrosage parc A',
            'site_id' => $site->id,
            'departement_id' => $departement->id,
            'responsable_id' => $admin->id,
            'date_due' => today()->toDateString(),
        ]);

        try {
            $service->cloturer($site->id, $departement->id, today());
            $this->fail('La journée a été clôturée avec une tâche encore ouverte.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('CLÔTURE REFUSÉE', $exception->getMessage());
        }

        $service->marquerFaite($tache);
        $cloture = $service->cloturer($site->id, $departement->id, today());

        $this->assertTrue($cloture->verrouillee);
        $this->assertSame(1, $cloture->dues);
        $this->assertSame(1, $cloture->faites);
    }

    public function test_non_receivable_task_justification_opens_a_disciplinary_reference(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $motif = MotifNonExecution::query()->create([
            'code' => 'OUBLI',
            'libelle' => 'Oubli',
            'recevable' => false,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
            'article_reglement' => 'Art. 2 - diligence',
        ]);
        $service = app(TacheService::class);

        $this->actingAs($admin);

        $tache = $service->creer([
            'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle irrigation',
            'responsable_id' => $admin->id,
            'date_due' => today()->toDateString(),
        ]);

        $service->justifier($tache, $motif);

        $this->assertSame(StatutTache::NonFaiteNonJustifiee, $tache->fresh()->statut);
        $this->assertNull($tache->fresh()->dde_reference);
        $this->assertSame('a_valider', $tache->fresh()->dde_statut);
        $this->assertDatabaseHas('tache_evenements', ['tache_id' => $tache->id, 'type' => 'dde_a_valider']);
        $this->assertDatabaseHas('journal_audit', ['auditable_type' => Tache::class, 'auditable_id' => $tache->id]);
    }

    public function test_superior_confirms_a_pending_disciplinary_case_and_task_can_have_support_staff(): void
    {
        $responsable = User::factory()->create(['niveau_hierarchie' => 4]);
        $superieur = User::factory()->create(['niveau_hierarchie' => 2]);
        $appui = User::factory()->create();
        $motif = MotifNonExecution::query()->create([
            'code' => 'OUBLI', 'libelle' => 'Oubli', 'recevable' => false,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
        ]);
        $service = app(TacheService::class);

        $this->actingAs($responsable);
        $tache = $service->creer([
            'source' => SourceTache::Manuelle, 'titre' => 'Suivi parcelle',
            'responsable_id' => $responsable->id, 'appui_ids' => [$appui->id],
            'date_due' => today()->toDateString(),
        ]);
        $this->assertDatabaseHas('tache_intervenants', ['tache_id' => $tache->id, 'user_id' => $responsable->id, 'role' => 'responsable']);
        $this->assertDatabaseHas('tache_intervenants', ['tache_id' => $tache->id, 'user_id' => $appui->id, 'role' => 'appui']);

        $service->justifier($tache, $motif);
        $this->actingAs($superieur);
        $service->validerDossierDisciplinaire($tache->fresh(), $superieur, 'Absence de justification recevable.');

        $this->assertSame('confirme', $tache->fresh()->dde_statut);
        $this->assertNotNull($tache->fresh()->dde_reference);
    }

    public function test_inventory_movement_and_audit_rows_are_append_only(): void
    {
        $user = User::factory()->create();
        $category = InventoryCategory::query()->create(['user_id' => $user->id, 'code' => 'OUT', 'name' => 'Outillage']);
        $item = InventoryItem::query()->create([
            'user_id' => $user->id,
            'inventory_category_id' => $category->id,
            'code' => 'OUT-001',
            'name' => 'Bêche',
            'unit' => 'pièce',
            'quantity_on_hand' => 1,
            'unit_price' => 10,
        ]);
        $movement = InventoryMovement::query()->create([
            'user_id' => $user->id,
            'inventory_item_id' => $item->id,
            'actor_user_id' => $user->id,
            'movement_type' => 'opening_balance',
            'quantity_change' => 1,
            'quantity_before' => 0,
            'quantity_after' => 1,
            'occurred_at' => now(),
        ]);
        $event = TacheEvenement::query()->create([
            'tache_id' => Tache::query()->create([
                'reference' => 'TSK-2026-08-9999',
                'source' => SourceTache::Manuelle,
                'titre' => 'Test',
                'date_due' => today()->toDateString(),
            ])->id,
            'type' => 'creee',
            'user_nom' => 'système',
            'resume' => 'Test',
        ]);
        $audit = JournalAudit::query()->create([
            'user_nom' => 'système',
            'action' => 'cree',
            'auditable_type' => InventoryMovement::class,
            'auditable_id' => $movement->id,
        ]);

        foreach ([$movement, $event, $audit] as $appendOnlyModel) {
            try {
                $appendOnlyModel->delete();
                $this->fail('Le registre append-only a été supprimé.');
            } catch (RuntimeException $exception) {
                $this->assertStringContainsString('ajout seul', $exception->getMessage());
            }
        }
    }

    public function test_admin_operations_screen_exposes_and_updates_the_operational_architecture(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        $departement = Departement::query()->create(['code' => 'AGR', 'nom' => 'Bureau Technique Agricole']);
        MotifNonExecution::query()->create([
            'code' => 'PLUIE',
            'libelle' => 'Pluie',
            'recevable' => true,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
        ]);

        $this->actingAs($admin)->get(route('admin.operations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations')
                ->has('sites', 1)
                ->has('departements', 1)
                ->has('motifs', 1)
                ->has('users', 1)
            );

        $this->actingAs($admin)->post(route('admin.operations.tasks.store'), [
            'source' => SourceTache::Manuelle->value,
            'titre' => 'Sarclage bloc A',
            'site_id' => $site->id,
            'departement_id' => $departement->id,
            'responsable_id' => $admin->id,
            'date_due' => today()->toDateString(),
            'priorite' => 'normale',
        ])->assertRedirect();

        $task = Tache::query()->where('titre', 'Sarclage bloc A')->firstOrFail();

        $this->actingAs($admin)->post(route('admin.operations.tasks.complete', $task), [
            'quantite' => 12,
            'unite' => 'planche',
            'commentaire' => 'Terminé',
        ])->assertRedirect();

        $this->assertSame(StatutTache::Faite, $task->fresh()->statut);
        $this->assertDatabaseHas('tache_evenements', ['tache_id' => $task->id, 'type' => 'faite']);

        $this->actingAs($admin)->post(route('admin.operations.close-day'), [
            'site_id' => $site->id,
            'departement_id' => $departement->id,
            'date' => today()->toDateString(),
        ])->assertRedirect();

        $this->assertDatabaseHas('clotures_journalieres', [
            'site_id' => $site->id,
            'departement_id' => $departement->id,
            'verrouillee' => true,
        ]);
    }

    public function test_my_day_screen_lets_an_assigned_user_complete_a_task(): void
    {
        $user = User::factory()->create(['actif' => true]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-1001',
            'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle pépinière',
            'responsable_id' => $user->id,
            'date_due' => today()->toDateString(),
        ]);
        MotifNonExecution::query()->create([
            'code' => 'PLUIE',
            'libelle' => 'Pluie',
            'recevable' => true,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
        ]);

        $this->actingAs($user)->get(route('my-day.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('my-day')
                ->has('tasks', 1)
                ->where('tasks.0.titre', 'Contrôle pépinière')
                ->where('stats.open', 1));

        $this->actingAs($user)->post(route('my-day.tasks.complete', $task), [
            'quantite' => 1,
            'unite' => 'passage',
            'commentaire' => 'RAS',
        ])->assertRedirect();

        $this->assertSame(StatutTache::Faite, $task->fresh()->statut);
        $this->assertDatabaseHas('tache_evenements', ['tache_id' => $task->id, 'type' => 'faite']);
    }

    public function test_offline_replay_can_complete_an_assigned_task_as_json(): void
    {
        $user = User::factory()->create(['actif' => true]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-OFF1',
            'source' => SourceTache::Manuelle,
            'titre' => 'Replay hors ligne',
            'responsable_id' => $user->id,
            'date_due' => today()->toDateString(),
        ]);

        $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json', 'X-Offline-Replay' => '1'])
            ->post(route('my-day.tasks.complete', $task), [
                'quantite' => 2,
                'unite' => 'passage',
                'commentaire' => 'Synchronisé après coup',
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame(StatutTache::Faite, $task->fresh()->statut);
    }

    public function test_user_can_submit_an_action_proposal_from_my_day(): void
    {
        $user = User::factory()->create(['actif' => true]);

        $this->actingAs($user)->post(route('my-day.proposals.store'), [
            'titre' => 'Réparer la clôture nord',
            'description' => 'Remplacer les poteaux endommagés.',
            'date_due' => today()->addDay()->toDateString(),
            'justification' => 'Éviter la sortie des animaux.',
            'cout_estime' => 125.50,
        ])->assertRedirect();

        $task = Tache::query()->where('titre', 'Réparer la clôture nord')->firstOrFail();

        $this->assertSame($user->id, $task->responsable_id);
        $this->assertSame('soumise', $task->statut_approbation);
        $this->assertSame('125.50', $task->cout_estime);
        $this->assertSame('Éviter la sortie des animaux.', $task->justification_demande);

        $this->actingAs($user)
            ->post(route('my-day.tasks.complete', $task))
            ->assertServerError();
        $this->assertSame(StatutTache::AFaire, $task->fresh()->statut);
    }

    public function test_offline_notebook_remains_available_beside_the_parcel_registry(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('terrain.carnet.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terrain/carnet'));

        $this->actingAs($user)->get('/terrain')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terrain/parcelles/index'));
    }

    public function test_employee_dashboard_is_scoped_to_their_own_tasks(): void
    {
        $employee = User::factory()->create(['actif' => true]);
        $other = User::factory()->create(['actif' => true]);

        Tache::query()->create([
            'reference' => 'TSK-2026-08-2001',
            'source' => SourceTache::Manuelle,
            'titre' => 'Tâche visible',
            'responsable_id' => $employee->id,
            'date_due' => today()->toDateString(),
        ]);
        Tache::query()->create([
            'reference' => 'TSK-2026-08-2002',
            'source' => SourceTache::Manuelle,
            'titre' => 'Tâche autre employé',
            'responsable_id' => $other->id,
            'date_due' => today()->toDateString(),
        ]);

        $this->actingAs($employee)->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.tasksToday', 1)
                ->has('tasks', 1)
                ->where('tasks.0.titre', 'Tâche visible'));
    }

    public function test_recurring_task_command_generates_due_tasks_from_models(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'actif' => true]);

        $this->actingAs($admin);

        Tache::query()->create([
            'reference' => 'TSK-2026-08-M001',
            'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle journalier clôture',
            'responsable_id' => $admin->id,
            'date_due' => today()->toDateString(),
            'recurrence' => 'quotidien',
            'est_modele' => true,
        ]);

        $this->artisan('taches:generer')
            ->expectsOutputToContain('1 tâche(s) générée(s)')
            ->assertSuccessful();

        $this->assertDatabaseHas('taches', [
            'titre' => 'Contrôle journalier clôture',
            'responsable_id' => $admin->id,
            'est_modele' => false,
        ]);
    }

    public function test_magasin_recalculation_command_restores_article_cache_from_movements(): void
    {
        $unit = Unite::query()->firstOrCreate(
            ['code' => 'kg'],
            [
                'nom' => 'kilogramme',
                'dimension' => 'masse',
                'vers_base' => 1000,
            ],
        );
        $article = Article::query()->create([
            'code' => 'ENG-TEST',
            'categorie' => 'ENG',
            'libelle' => 'Engrais test',
            'unite_achat_id' => $unit->id,
            'unite_usage_id' => $unit->id,
            'quantite_base' => 0,
            'actif' => true,
        ]);

        app(MagasinService::class)->entree($article, 10, $unit, 'Test entrée');
        $article->forceFill(['quantite_base' => 0])->saveQuietly();

        $this->artisan('magasin:recalculer')
            ->expectsOutputToContain('1 article(s) recalculé(s)')
            ->assertSuccessful();

        $this->assertSame(10.0, (float) $article->fresh()->stockUsage());
    }
}
