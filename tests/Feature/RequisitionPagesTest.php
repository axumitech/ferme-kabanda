<?php

namespace Tests\Feature;

use App\Models\Requisition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RequisitionPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_sees_the_dedicated_registry_create_form_and_total_sidebar_badge(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        Requisition::query()->create([
            'reference' => 'RQ-TEST-001', 'type' => 'CSH', 'objet' => 'Fonds terrain',
            'montant' => 100, 'valeur' => 100, 'niveau_requis' => 2,
            'statut' => 'servie', 'demandeur_id' => $admin->id,
        ]);
        Requisition::query()->create([
            'reference' => 'RQ-TEST-002', 'type' => 'NEW', 'objet' => 'Nouvel achat',
            'nouvel_article' => 'Brouette', 'valeur' => 50, 'niveau_requis' => 2,
            'statut' => 'demandee', 'demandeur_id' => $admin->id,
        ]);

        $this->actingAs($admin)->get('/requisitions')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('requisitions/index')
            ->has('requisitions', 2)
            ->where('fkn.requisitionCount', 2));

        $this->actingAs($admin)->get('/requisitions/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('requisitions/form')
            ->has('articles')
            ->has('unites')
            ->has('categories'));
    }

    public function test_admin_can_create_a_complete_new_article_requisition(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post('/requisitions', [
            'type' => 'NEW',
            'objet' => 'Acheter une pompe',
            'nouvel_article' => 'Pompe immergée',
            'nouvelle_categorie' => 'IRR',
            'montant' => 850,
            'justification' => 'Remplacer la pompe défaillante.',
            'centre_cout' => 'IRR-K1',
        ])->assertRedirect(route('requisitions.index'));

        $this->assertDatabaseHas('requisitions', [
            'type' => 'NEW',
            'objet' => 'Acheter une pompe',
            'nouvel_article' => 'Pompe immergée',
            'nouvelle_categorie' => 'IRR',
            'statut' => 'demandee',
            'demandeur_id' => $admin->id,
        ]);
    }

    public function test_requisition_actions_enforce_separation_and_allow_verification_and_refusal(): void
    {
        $requester = User::factory()->create(['is_admin' => true]);
        $reviewer = User::factory()->create(['is_admin' => true]);
        $requisition = Requisition::query()->create([
            'reference' => 'RQ-TEST-003', 'type' => 'CSH', 'objet' => 'Petite caisse',
            'montant' => 25, 'valeur' => 25, 'niveau_requis' => 3,
            'statut' => 'demandee', 'demandeur_id' => $requester->id,
        ]);

        $this->actingAs($requester)->post("/requisitions/{$requisition->id}/verify")
            ->assertSessionHasErrors('action');
        $this->actingAs($reviewer)->post("/requisitions/{$requisition->id}/verify", ['note' => 'Pièces vérifiées'])
            ->assertRedirect();
        $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'statut' => 'verifiee']);

        $this->actingAs($requester)->post("/requisitions/{$requisition->id}/refuse", ['motif' => 'Non autorisé'])
            ->assertSessionHasErrors('action');
        $thirdAdmin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($thirdAdmin)->post("/requisitions/{$requisition->id}/refuse", ['motif' => 'Budget indisponible'])
            ->assertRedirect();
        $this->assertDatabaseHas('requisitions', ['id' => $requisition->id, 'statut' => 'refusee', 'motif_refus' => 'Budget indisponible']);
    }

    public function test_non_admin_cannot_open_requisition_management(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->get('/requisitions')->assertForbidden();
        $this->actingAs($user)->get('/requisitions/create')->assertForbidden();
    }
}
