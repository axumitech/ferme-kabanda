<?php

namespace Tests\Feature;

use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Tache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TaskBreakdownWorkOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_screens_only_expose_open_work_orders_as_breakdown_options(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $this->taskFor($admin);
        $this->breakdownReason();
        $open = $this->workOrder('demande', 'OT-OPEN-001');
        $this->workOrder('clos', 'OT-CLOSED-001');
        $this->workOrder('refuse', 'OT-REFUSED-001');
        $this->workOrder('annule', 'OT-CANCELLED-001');

        $this->actingAs($admin)->get(route('my-day.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('my-day')
                ->has('openWorkOrders', 1)
                ->where('openWorkOrders.0.id', $open->id)
                ->where('openWorkOrders.0.reference', 'OT-OPEN-001'));

        $this->actingAs($admin)->get(route('admin.operations.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/operations')
                ->has('openWorkOrders', 1)
                ->where('openWorkOrders.0.id', $open->id)
                ->where('openWorkOrders.0.reference', 'OT-OPEN-001'));
    }

    public function test_my_day_requires_an_open_work_order_for_the_breakdown_reason(): void
    {
        $user = User::factory()->create(['actif' => true]);
        $task = $this->taskFor($user);
        $breakdown = $this->breakdownReason();
        $closed = $this->workOrder('clos', 'OT-CLOSED-002');

        $this->actingAs($user)->post(route('my-day.tasks.justify', $task), [
            'motif_id' => $breakdown->id,
        ])->assertSessionHasErrors('ordre_travail_id');

        $this->actingAs($user)->post(route('my-day.tasks.justify', $task), [
            'motif_id' => $breakdown->id,
            'ordre_travail_id' => $closed->id,
        ])->assertSessionHasErrors('ordre_travail_id');

        $task->refresh();
        $this->assertSame(StatutTache::AFaire, $task->statut);
        $this->assertNull($task->ordre_travail_id);
    }

    public function test_my_day_links_the_selected_open_work_order_and_uses_its_reference_as_proof(): void
    {
        $user = User::factory()->create(['actif' => true]);
        $task = $this->taskFor($user);
        $breakdown = $this->breakdownReason();
        $order = $this->workOrder('en_cours', 'OT-OPEN-002');

        $this->actingAs($user)
            ->post(route('my-day.tasks.justify', $task), [
                'motif_id' => $breakdown->id,
                'ordre_travail_id' => $order->id,
                'motif_precision' => 'Pompe déposée à l’atelier.',
            ])
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors();

        $task->refresh();
        $this->assertSame(StatutTache::NonFaiteJustifiee, $task->statut);
        $this->assertSame($order->id, $task->ordre_travail_id);
        $this->assertSame('OT-OPEN-002 Pompe déposée à l’atelier.', $task->motif_precision);
        $this->assertDatabaseHas('tache_evenements', [
            'tache_id' => $task->id,
            'type' => 'justifiee',
        ]);
    }

    public function test_admin_operations_enforces_the_same_exact_breakdown_contract(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $task = $this->taskFor($admin);
        $breakdown = $this->breakdownReason();
        $rain = MotifNonExecution::query()->create([
            'code' => 'PLUIE',
            'libelle' => 'Pluie',
            'recevable' => true,
            'preuve_requise' => MotifNonExecution::PREUVE_AUCUNE,
            'actif' => true,
        ]);
        $order = $this->workOrder('approuve', 'OT-OPEN-003');

        $this->actingAs($admin)->post(route('admin.operations.tasks.justify', $task), [
            'motif_id' => $rain->id,
            'ordre_travail_id' => $order->id,
        ])->assertSessionHasErrors('ordre_travail_id');

        $this->actingAs($admin)
            ->post(route('admin.operations.tasks.justify', $task), [
                'motif_id' => $breakdown->id,
                'ordre_travail_id' => $order->id,
            ])
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors();

        $task->refresh();
        $this->assertSame(StatutTache::NonFaiteJustifiee, $task->statut);
        $this->assertSame($order->id, $task->ordre_travail_id);
        $this->assertSame('OT-OPEN-003', $task->motif_precision);
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

    private function taskFor(User $user): Tache
    {
        return Tache::query()->create([
            'reference' => 'TSK-'.str()->random(12),
            'source' => SourceTache::Manuelle,
            'titre' => 'Irriguer le bloc A',
            'responsable_id' => $user->id,
            'date_due' => today()->toDateString(),
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
