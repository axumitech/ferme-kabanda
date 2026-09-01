<?php

namespace Tests\Feature;

use App\Models\Departement;
use App\Models\Site;
use App\Models\Tache;
use App\Models\Unite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_registry_exposes_create_show_and_edit_pages(): void
    {
        $user = User::factory()->create(['niveau_hierarchie' => 4, 'actif' => true]);
        $appui = User::factory()->create(['actif' => true]);
        $departement = Departement::query()->create(['code' => 'AGR', 'nom' => 'Agriculture', 'actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu', 'actif' => true]);

        $this->actingAs($user)->get(route('task-registry.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tasks/form')
                ->where('mode', 'create')
                ->has('options.departments', 1)
                ->has('options.sites', 1)
                ->has('options.users', 2));

        $this->actingAs($user)->post(route('task-registry.store'), [
            'titre' => 'Contrôle clôture nord',
            'description' => 'Vérifier les poteaux.',
            'instruction' => 'Porter des gants.',
            'departement_id' => $departement->id,
            'site_id' => $site->id,
            'lieu' => 'Parc nord',
            'date_due' => today()->addDay()->toDateString(),
            'heure_due' => '08:30',
            'priorite' => 'normale',
            'source' => 'manuelle',
            'responsable_id' => $user->id,
            'appui_ids' => [$appui->id],
            'informe_ids' => [],
            'justification_demande' => 'Prévenir une sortie du bétail.',
            'cout_estime' => 45,
        ])->assertRedirect();

        $task = Tache::query()->where('titre', 'Contrôle clôture nord')->firstOrFail();
        $this->assertSame('soumise', $task->statut_approbation);
        $this->assertDatabaseHas('tache_intervenants', ['tache_id' => $task->id, 'user_id' => $appui->id, 'role' => 'appui']);

        $this->actingAs($user)->get(route('task-registry.show', $task))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tasks/show')
                ->where('task.reference', $task->reference)
                ->where('task.titre', 'Contrôle clôture nord'));

        $this->actingAs($user)->get(route('task-registry.edit', $task))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('tasks/form')
                ->where('mode', 'edit')
                ->where('task.appui_ids.0', $appui->id));
    }

    public function test_execution_forms_receive_only_active_units(): void
    {
        $user = User::factory()->create(['actif' => true]);
        Unite::query()->where('code', 'kg')->update(['actif' => true]);
        Unite::query()->create([
            'code' => 'inactive_test', 'nom' => 'ancienne unité', 'dimension' => 'unitaire',
            'vers_base' => 1, 'conditionnement' => false, 'actif' => false,
        ]);
        $task = Tache::query()->create([
            'reference' => 'TSK-UNIT-001',
            'source' => 'manuelle',
            'titre' => 'Peser la récolte',
            'responsable_id' => $user->id,
            'date_due' => today(),
        ]);

        $this->actingAs($user)->get(route('my-day.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('units', fn ($units): bool => collect($units)->contains('code', 'kg')
                    && ! collect($units)->contains('code', 'inactive_test')));

        $this->actingAs($user)->get(route('shared-registry'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('units', fn ($units): bool => collect($units)->contains('code', 'kg')
                    && ! collect($units)->contains('code', 'inactive_test')));

        $this->actingAs($user)->get(route('task-registry.show', $task))
            ->assertInertia(fn (Assert $page) => $page
                ->where('units', fn ($units): bool => collect($units)->contains('code', 'kg')
                    && ! collect($units)->contains('code', 'inactive_test')));
    }
}
