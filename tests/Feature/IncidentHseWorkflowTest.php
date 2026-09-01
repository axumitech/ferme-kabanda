<?php

namespace Tests\Feature;

use App\Enums\StatutTache;
use App\Models\Departement;
use App\Models\Incident;
use App\Models\Site;
use App\Models\User;
use Database\Seeders\IncidentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class IncidentHseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_complete_hse_workflow_keeps_fkn_closure_rules(): void
    {
        $this->seed(IncidentSeeder::class);
        $manager = User::factory()->create([
            'is_admin' => true,
            'actif' => true,
            'niveau_hierarchie' => 1,
        ]);
        $responsable = User::factory()->create(['actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        $departement = Departement::query()->create(['code' => 'QHSE', 'nom' => 'QHSE']);

        $this->actingAs($manager)->post(route('admin.processes.incidents.store'), [
            'nature' => 'securite',
            'survenu_le' => now()->subMinute()->format('Y-m-d H:i:s'),
            'site_id' => $site->id,
            'lieu' => 'Atelier principal',
            'departement_id' => $departement->id,
            'cout_estime' => 5200,
            'description' => 'Un opérateur a glissé près de la pompe pendant le nettoyage.',
            'actions_immediates' => 'Zone balisée et pompe arrêtée.',
            'temoins' => 'Chef atelier et magasinier',
            'personnes_impliquees' => 'Opérateur pompe',
            'tiers_implique' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $incident = Incident::query()->firstOrFail();
        $this->assertDatabaseHas('incidents', [
            'id' => $incident->id,
            'temoins' => 'Chef atelier et magasinier',
            'personnes_impliquees' => 'Opérateur pompe',
            'tiers_implique' => true,
            'statut' => 'signale',
        ]);

        $this->actingAs($manager)->post(route('admin.processes.incidents.classify', $incident), [
            'codes' => ['FAI', 'LTI'],
            'finale' => false,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();
        $this->assertSame('LTI', $incident->fresh()->categorie?->code);
        $this->assertSame('classifie', $incident->fresh()->statut);

        $this->actingAs($manager)->post(route('admin.processes.incidents.root-causes', $incident), [
            'p1' => 'Le sol était glissant.',
            'p2' => "De l'eau était restée au sol.",
            'p3' => "L'évacuation était obstruée.",
            'p4' => "La grille n'avait pas été contrôlée.",
            'p5' => "Le contrôle n'était pas intégré à la ronde.",
            'cause_racine' => "Absence de contrôle de l'évacuation dans la ronde atelier.",
            'facteurs' => 'Éclairage insuffisant et signalisation absente.',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();
        $this->assertCount(5, $incident->fresh()->cinq_pourquoi ?? []);

        $this->actingAs($manager)->post(route('admin.processes.incidents.classify', $incident), [
            'codes' => ['LTI'],
            'finale' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();
        $this->assertSame('en_investigation', $incident->fresh()->statut);
        $this->assertSame('LTI', $incident->fresh()->categorieFinale?->code);

        $this->actingAs($manager)->post(route('admin.processes.incidents.actions.store', $incident), [
            'action' => 'Ajouter le contrôle de la grille à la ronde quotidienne.',
            'responsable_id' => $responsable->id,
            'echeance' => today()->addWeek()->toDateString(),
            'type' => 'corrective',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $action = $incident->actions()->with('tache')->firstOrFail();
        $this->assertNotNull($action->tache);
        $this->assertSame(StatutTache::AFaire, $action->tache?->statut);

        $this->actingAs($manager)->post(route('admin.processes.incidents.close', $incident))
            ->assertSessionHasErrors('incident');
        $this->assertNotSame('cloture', $incident->fresh()->statut);

        $action->tache?->update(['statut' => StatutTache::Faite]);
        $this->actingAs($manager)->post(route('admin.processes.incidents.close', $incident))
            ->assertRedirect()->assertSessionDoesntHaveErrors();
        $this->assertSame('cloture', $incident->fresh()->statut);
        $this->assertSame('fermee', $action->fresh()->statut);
    }

    public function test_incident_page_exposes_reference_data_and_full_incident_details(): void
    {
        $this->seed(IncidentSeeder::class);
        $manager = User::factory()->create([
            'is_admin' => true,
            'actif' => true,
            'niveau_hierarchie' => 1,
        ]);

        $this->actingAs($manager)->get(route('admin.processes.index', ['tab' => 'incidents']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/processes')
                ->has('incidentCategories', 9)
                ->where('visibility.canCloseIncidents', true)
                ->has('departments'));
    }

    public function test_incident_declaration_uses_a_dedicated_creation_page(): void
    {
        $manager = User::factory()->create([
            'is_admin' => true,
            'actif' => true,
            'niveau_hierarchie' => 4,
        ]);
        Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);
        Departement::query()->create(['code' => 'QHSE', 'nom' => 'QHSE']);

        $this->actingAs($manager)->get(route('incidents.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('incidents/form')
                ->has('sites', 1)
                ->has('departments', 1)
                ->where('visibility.incidentCosts', false)
                ->where('visibility.incidentsSurete', false));

        $this->actingAs($manager)->post(route('admin.processes.incidents.store'), [
            'nature' => 'surete',
            'survenu_le' => now()->subMinute()->format('Y-m-d H:i:s'),
            'description' => 'Incident déclaré depuis la page de création dédiée.',
            'cout_estime' => 725,
        ])->assertRedirect(route('admin.processes.index', ['tab' => 'incidents']));

        $this->assertDatabaseHas('incidents', [
            'description' => 'Incident déclaré depuis la page de création dédiée.',
            'nature' => 'surete',
            'cout_estime' => 725,
        ]);

        $closableIncident = Incident::query()->create([
            'reference' => 'IR-CLOSE-001',
            'nature' => 'securite',
            'survenu_le' => now()->subHour(),
            'description' => 'Incident sans action ouverte.',
            'statut' => 'signale',
        ]);

        $this->actingAs($manager)
            ->post(route('admin.processes.incidents.close', $closableIncident))
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors();
        $this->assertSame('cloture', $closableIncident->fresh()->statut);
    }
}
