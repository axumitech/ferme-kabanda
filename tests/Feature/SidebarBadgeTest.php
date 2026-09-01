<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Models\Incident;
use App\Models\Infrastructure;
use App\Models\Tache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SidebarBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_sidebar_counts_registry_tasks_and_only_due_personal_tasks_for_my_day(): void
    {
        $user = User::factory()->create();
        Tache::query()->create([
            'reference' => 'TSK-BADGE-001',
            'source' => SourceTache::Manuelle,
            'titre' => 'Tâche due',
            'responsable_id' => $user->id,
            'date_due' => today(),
        ]);
        Tache::query()->create([
            'reference' => 'TSK-BADGE-002',
            'source' => SourceTache::Manuelle,
            'titre' => 'Tâche future',
            'responsable_id' => $user->id,
            'date_due' => today()->addWeek(),
        ]);

        $this->actingAs($user)->get(route('shared-registry'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('fkn.actionsPending', 1)
                ->where('fkn.registryTasks', 2));
    }

    public function test_sidebar_counts_only_infrastructures_in_bad_condition(): void
    {
        $user = User::factory()->create();

        foreach (['bon', 'mauvais', 'mauvais', 'critique'] as $index => $state) {
            Infrastructure::query()->create([
                'code' => 'INF-BADGE-'.($index + 1),
                'nom' => 'Infrastructure '.($index + 1),
                'categorie' => 'irrigation',
                'etat' => $state,
                'actif' => true,
            ]);
        }

        $this->actingAs($user)->get(route('maintenance.index', ['resource' => 'infrastructures']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('fkn.infrastructuresBad', 2));
    }

    public function test_sidebar_counts_open_visible_hse_incidents(): void
    {
        $user = User::factory()->create(['niveau_hierarchie' => 4]);

        foreach ([
            ['securite', 'signale'],
            ['environnement', 'en_investigation'],
            ['securite', 'cloture'],
            ['surete', 'signale'],
        ] as $index => [$nature, $status]) {
            Incident::query()->create([
                'reference' => 'IR-BADGE-'.($index + 1),
                'nature' => $nature,
                'survenu_le' => now()->subHour(),
                'description' => 'Incident de contrôle du badge.',
                'statut' => $status,
            ]);
        }

        $this->actingAs($user)->get(route('shared-registry'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('fkn.incidentsOpen', 2));
    }
}
