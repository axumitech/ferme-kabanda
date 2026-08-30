<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Models\Article;
use App\Models\Incident;
use App\Models\JournalAudit;
use App\Models\Requisition;
use App\Models\Tache;
use App\Models\TacheEvenement;
use App\Models\Unite;
use App\Models\User;
use App\Services\FluxActiviteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_activity_feed_hides_disciplinary_and_security_events_outside_the_confidential_scope(): void
    {
        $fieldUser = User::factory()->create(['niveau_hierarchie' => 4]);
        $direction = User::factory()->create(['niveau_hierarchie' => 2]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-VIS1',
            'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle pépinière',
            'date_due' => today(),
        ]);
        TacheEvenement::query()->create([
            'tache_id' => $task->id,
            'type' => 'faite',
            'user_nom' => 'Équipe',
            'resume' => 'Contrôle terminé',
        ]);
        TacheEvenement::query()->create([
            'tache_id' => $task->id,
            'type' => 'dde_a_valider',
            'user_nom' => 'RH',
            'resume' => 'Dossier DDE confidentiel',
        ]);
        Incident::query()->create([
            'reference' => 'INC-SURETE-VIS1',
            'nature' => 'surete',
            'survenu_le' => now(),
            'signale_le' => now(),
            'description' => 'Incident de sûreté confidentiel',
        ]);

        $this->actingAs($fieldUser);
        $entries = app(FluxActiviteService::class)->journee(today());

        $this->assertTrue($entries->contains(fn (array $entry): bool => $entry['titre'] === 'Contrôle terminé'));
        $this->assertFalse($entries->contains(fn (array $entry): bool => $entry['titre'] === 'Dossier DDE confidentiel'));
        $this->assertFalse($entries->contains(fn (array $entry): bool => $entry['titre'] === 'INC-SURETE-VIS1'));

        $this->actingAs($direction);
        $entries = app(FluxActiviteService::class)->journee(today());

        $this->assertTrue($entries->contains(fn (array $entry): bool => $entry['titre'] === 'Dossier DDE confidentiel'));
        $this->assertTrue($entries->contains(fn (array $entry): bool => $entry['titre'] === 'INC-SURETE-VIS1'));
    }

    public function test_my_day_masks_disciplinary_fields_and_events_for_execution_level_users(): void
    {
        $fieldUser = User::factory()->create(['niveau_hierarchie' => 4]);
        $direction = User::factory()->create(['niveau_hierarchie' => 2]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-VIS2',
            'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle irrigation',
            'responsable_id' => $fieldUser->id,
            'date_due' => today(),
            'dde_reference' => 'DDE-2026-001',
            'dde_statut' => 'a_valider',
            'dde_observation' => 'Observation confidentielle',
        ]);
        TacheEvenement::query()->create([
            'tache_id' => $task->id,
            'type' => 'faite',
            'user_nom' => 'Équipe',
            'resume' => 'Contrôle fait',
        ]);
        TacheEvenement::query()->create([
            'tache_id' => $task->id,
            'type' => 'dde_a_valider',
            'user_nom' => 'RH',
            'resume' => 'DDE à valider',
        ]);

        $this->actingAs($fieldUser)->get(route('my-day.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('canViewDisciplinaryFiles', false)
                ->missing('tasks.0.dde_reference')
                ->missing('tasks.0.dde_statut')
                ->has('tasks.0.evenements', 1)
                ->where('tasks.0.evenements.0.type', 'faite'));

        $this->actingAs($direction)->get(route('my-day.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('canViewDisciplinaryFiles', true)
                ->where('tasks.0.dde_reference', 'DDE-2026-001')
                ->has('tasks.0.evenements', 2));
    }

    public function test_technical_admin_at_execution_level_cannot_read_disciplinary_or_audit_data(): void
    {
        $technicalAdmin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 4]);
        $directionAdmin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 2]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-VIS3',
            'source' => SourceTache::Manuelle,
            'titre' => 'Tâche sensible',
            'date_due' => today(),
            'dde_reference' => 'DDE-2026-002',
            'dde_statut' => 'confirme',
        ]);
        JournalAudit::query()->create([
            'user_nom' => 'Système',
            'action' => 'cree',
            'auditable_type' => Tache::class,
            'auditable_id' => $task->id,
            'resume' => 'Trace confidentielle',
        ]);

        $this->actingAs($technicalAdmin)->get(route('admin.operations.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('visibility.dossiersDisciplinaires', false)
                ->where('visibility.journalAudit', false)
                ->missing('tasks.0.dde_reference')
                ->has('audit', 0));

        $this->actingAs($directionAdmin)->get(route('admin.operations.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('visibility.dossiersDisciplinaires', true)
                ->where('visibility.journalAudit', true)
                ->where('tasks.0.dde_reference', 'DDE-2026-002')
                ->has('audit'));
    }

    public function test_process_screen_masks_requisition_values_and_security_incidents_outside_their_scopes(): void
    {
        $technicalAdmin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 4]);
        $directionAdmin = User::factory()->create(['is_admin' => true, 'niveau_hierarchie' => 2]);
        Requisition::query()->create([
            'reference' => 'REQ-2026-VIS1',
            'type' => 'CSH',
            'objet' => 'Achat urgent',
            'montant' => 250,
            'valeur' => 250,
            'niveau_requis' => 2,
        ]);
        Incident::query()->create([
            'reference' => 'INC-SEC-VIS1',
            'nature' => 'securite',
            'survenu_le' => now(),
            'signale_le' => now(),
            'description' => 'Incident HSE partagé',
            'cout_estime' => 75,
        ]);
        Incident::query()->create([
            'reference' => 'INC-SURETE-VIS2',
            'nature' => 'surete',
            'survenu_le' => now(),
            'signale_le' => now(),
            'description' => 'Incident de sûreté confidentiel',
        ]);

        $this->actingAs($technicalAdmin)->get(route('admin.processes.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('visibility.requisitionAmounts', false)
                ->where('visibility.incidentCosts', false)
                ->where('visibility.incidentsSurete', false)
                ->missing('requisitions.0.montant')
                ->missing('requisitions.0.valeur')
                ->missing('requisitions.0.niveau_requis')
                ->has('incidents', 1)
                ->missing('incidents.0.cout_estime'));

        $this->actingAs($directionAdmin)->get(route('admin.processes.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('visibility.requisitionAmounts', true)
                ->where('visibility.incidentCosts', true)
                ->where('visibility.incidentsSurete', true)
                ->where('requisitions.0.valeur', '250.00')
                ->has('incidents', 2));
    }

    public function test_stock_values_are_hidden_and_cannot_be_overwritten_outside_the_restricted_scope(): void
    {
        $fieldUser = User::factory()->create(['niveau_hierarchie' => 4]);
        $unit = Unite::query()->create([
            'code' => 'piece_test',
            'nom' => 'Pièce test',
            'dimension' => 'unite',
            'vers_base' => 1,
            'actif' => true,
        ]);
        $article = Article::query()->create([
            'code' => 'OUT-VIS-001',
            'categorie' => 'OUT',
            'libelle' => 'Bêche confidentielle',
            'unite_achat_id' => $unit->id,
            'unite_usage_id' => $unit->id,
            'prix_unitaire' => 15.5,
            'centre_cout' => 'FIN',
            'quantite_base' => 4,
            'actif' => true,
        ]);

        $this->actingAs($fieldUser)->getJson(route('inventory.items.index'))
            ->assertJsonPath('items.0.pu', null)
            ->assertJsonPath('items.0.cc', null);

        $this->actingAs($fieldUser)->putJson(route('inventory.items.sync'), ['items' => [[
            'cat' => 'OUT',
            'lib' => 'Bêche confidentielle',
            'unite' => 'piece_test',
            'qte' => 4,
            'pu' => 999,
            'mini' => 0,
            'cc' => 'AUTRE',
            'code' => $article->code,
            'cree' => today()->toDateString(),
        ]]])->assertOk();

        $article->refresh();
        $this->assertSame('15.5000', $article->prix_unitaire);
        $this->assertSame('FIN', $article->centre_cout);
    }
}
