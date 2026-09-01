<?php

namespace Tests\Feature;

use App\Models\OrdreTravail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrdreTravailPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_authenticated_user_can_open_the_work_order_pages(): void
    {
        $user = User::factory()->create(['actif' => true]);

        $this->actingAs($user)->get('/ordres-travail/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('ordres-travail/form')
            ->where('types.correctif', 'Correctif — après la panne')
            ->where('permits.aucun', 'Aucun permis requis'));

        $this->actingAs($user)->get('/ordres-travail')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('ordres-travail/index')
            ->where('stats.open', 0));
    }

    public function test_production_stop_forces_urgent_priority_and_create_another_redirects_to_form(): void
    {
        $user = User::factory()->create(['actif' => true]);

        $this->actingAs($user)->post('/ordres-travail', [
            'target_type' => 'none',
            'objet' => 'Sécuriser le moteur du convoyeur',
            'description' => 'Le moteur chauffe et bloque la ligne.',
            'type_intervention' => 'correctif',
            'priorite' => 'normale',
            'arret_production' => true,
            'permis_travail' => 'electrique',
            'consignation_requise' => true,
            '_create_another' => true,
        ])->assertRedirect('/ordres-travail/create')->assertSessionDoesntHaveErrors();

        $order = OrdreTravail::query()->firstOrFail();
        $this->assertSame('urgente', $order->priorite);
        $this->assertTrue($order->arret_production);
        $this->assertTrue($order->consignation_requise);
        $this->assertSame('electrique', $order->permis_travail);

        $this->actingAs($user)->get('/ordres-travail')->assertInertia(fn (Assert $page) => $page
            ->where('stats.open', 1)
            ->where('stats.urgent', 1)
            ->where('stats.stopped', 1)
            ->where('orders.0.reference', $order->reference));
    }

    public function test_creation_opens_the_detail_and_another_manager_can_approve_it(): void
    {
        $requester = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 4]);
        $manager = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 2]);

        $response = $this->actingAs($requester)->post('/ordres-travail', [
            'target_type' => 'none',
            'objet' => 'Réparer la conduite principale',
            'type_intervention' => 'correctif',
            'priorite' => 'elevee',
            'permis_travail' => 'aucun',
        ]);

        $order = OrdreTravail::query()->firstOrFail();
        $response->assertRedirect(route('ordres-travail.show', $order));

        $this->actingAs($manager)->get(route('ordres-travail.show', $order))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('ordres-travail/show')
            ->where('order.reference', $order->reference)
            ->where('permissions.canManage', true)
            ->where('eligibleApprovers.0.id', $manager->id));

        $this->actingAs($manager)->post(route('maintenance.orders.approve', $order), [
            'note' => 'Intervention validée par la maintenance.',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('ordres_travail', [
            'id' => $order->id,
            'statut' => 'approuve',
            'approuve_par_id' => $manager->id,
        ]);
    }

    public function test_authorized_order_skips_approval_and_follows_the_complete_workflow(): void
    {
        $manager = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 2]);
        $worker = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 4]);
        $verifier = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 2]);

        $this->actingAs($manager)->post('/ordres-travail', [
            'target_type' => 'none',
            'objet' => 'Entretien déjà autorisé du groupe',
            'type_intervention' => 'preventif',
            'priorite' => 'normale',
            'permis_travail' => 'aucun',
            'approbation_requise' => false,
        ])->assertRedirect();

        $order = OrdreTravail::query()->firstOrFail();
        $this->assertSame('approuve', $order->statut);
        $this->assertFalse($order->approbation_requise);

        $this->actingAs($manager)->post(route('maintenance.orders.plan', $order), [
            'responsable_id' => $worker->id,
            'planifie_le' => today()->toDateString(),
            'echeance' => today()->addDay()->toDateString(),
        ])->assertSessionDoesntHaveErrors();
        $this->assertSame('planifie', $order->refresh()->statut);

        $this->actingAs($worker)->post(route('maintenance.orders.start', $order), [
            'consignation' => false,
        ])->assertSessionDoesntHaveErrors();
        $this->assertSame('en_cours', $order->refresh()->statut);

        $this->actingAs($worker)->post(route('maintenance.orders.finish', $order), [
            'travaux_realises' => 'Vidange, filtre et essai de charge réalisés.',
        ])->assertSessionDoesntHaveErrors();
        $this->assertSame('realise', $order->refresh()->statut);

        $this->actingAs($verifier)->post(route('maintenance.orders.verify', $order), [
            'conforme' => true,
            'observation' => 'Essai conforme.',
        ])->assertSessionDoesntHaveErrors();
        $this->assertSame('verifie', $order->refresh()->statut);

        $this->actingAs($manager)->post(route('maintenance.orders.close', $order), [
            'remettre' => true,
        ])->assertSessionDoesntHaveErrors();
        $this->assertSame('clos', $order->refresh()->statut);
    }

    public function test_regular_user_cannot_skip_work_order_approval(): void
    {
        $user = User::factory()->create(['actif' => true, 'niveau_hierarchie' => 4]);

        $this->actingAs($user)->post('/ordres-travail', [
            'target_type' => 'none',
            'objet' => 'Demande terrain sans visa préalable',
            'type_intervention' => 'correctif',
            'priorite' => 'normale',
            'permis_travail' => 'aucun',
            'approbation_requise' => false,
        ])->assertRedirect();

        $order = OrdreTravail::query()->firstOrFail();
        $this->assertSame('demande', $order->statut);
        $this->assertTrue($order->approbation_requise);
    }
}
