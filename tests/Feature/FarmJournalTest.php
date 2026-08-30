<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Models\Requisition;
use App\Models\Tache;
use App\Models\TacheEvenement;
use App\Models\User;
use App\Services\FluxActiviteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FarmJournalTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_authenticated_user_can_read_the_shared_farm_journal(): void
    {
        $user = User::factory()->create(['niveau_hierarchie' => 4]);
        $task = Tache::query()->create([
            'reference' => 'TSK-2026-08-4001', 'source' => SourceTache::Manuelle,
            'titre' => 'Arrosage parcelle A', 'date_due' => today(),
        ]);
        TacheEvenement::query()->create([
            'tache_id' => $task->id, 'type' => 'faite', 'user_nom' => 'Une collègue',
            'resume' => 'Tâche déclarée faite.',
        ]);

        $this->actingAs($user)->get(route('farm-journal'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('farm-journal')->has('entries', 1));
    }

    public function test_my_day_shows_team_tasks_but_marks_other_users_tasks_as_read_only(): void
    {
        $viewer = User::factory()->create(['niveau_hierarchie' => 4]);
        $owner = User::factory()->create();
        Tache::query()->create([
            'reference' => 'TSK-2026-08-4002', 'source' => SourceTache::Manuelle,
            'titre' => 'Contrôle irrigation', 'responsable_id' => $owner->id, 'date_due' => today(),
        ]);

        $this->actingAs($viewer)->get(route('my-day.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('my-day')
                ->has('tasks', 1)
                ->where('tasks.0.can_act', false));
    }

    public function test_journal_links_shared_records_to_the_read_only_registry_without_exposing_a_requisition_amount(): void
    {
        $user = User::factory()->create(['niveau_hierarchie' => 4]);
        Requisition::query()->create([
            'reference' => 'REQ-2026-08-4003',
            'type' => 'CSH',
            'objet' => 'Réparation de la pompe',
            'montant' => 250,
        ]);

        $this->actingAs($user);
        $entry = app(FluxActiviteService::class)->journee(today())->firstWhere('type', 'requisition');

        $this->assertNotNull($entry);
        $this->assertSame('/registre-ferme?onglet=demandes', $entry['lien']);
        $this->assertStringNotContainsString('250', (string) $entry['detail']);
    }
}
