<?php

namespace Tests\Feature;

use App\Models\Culture;
use App\Models\Plan;
use App\Models\Plantation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlanWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_plan_pages_and_creation_workflow_are_available(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('plans.index'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('plans/index')->has('plans', 0));
        $this->actingAs($user)->get(route('plans.create'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('plans/form'));

        $response = $this->actingAs($user)->post(route('plans.store'), [
            'code' => 'btagri',
            'libelle' => "Plan d'exploitation maraîchage K1 — campagne 2026-2027",
            'note' => 'Version initiale.',
        ]);

        $plan = Plan::query()->firstOrFail();
        $response->assertRedirect(route('plans.show', $plan));
        $this->assertSame('BTAGRI', $plan->code);
        $this->assertSame(1, $plan->version);
        $this->assertSame('brouillon', $plan->statut);
        $this->actingAs($user)->get(route('plans.show', $plan))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('plans/show')->where('plan.code', 'BTAGRI'));
    }

    public function test_each_code_has_its_own_version_lineage_and_a_plan_can_be_duplicated(): void
    {
        $user = User::factory()->create();
        $v1 = Plan::query()->create(['code' => 'BTAGRI', 'libelle' => 'Maraîchage', 'type' => 'agricole', 'version' => 1, 'statut' => 'en_vigueur']);
        $v1->lignes()->create(['cle' => 'CHOU|J7|FERTILISER', 'cible' => 'Chou', 'jour_offset' => 7, 'tache' => 'Fertiliser', 'priorite' => 'normale', 'point_controle' => false, 'empreinte' => str_repeat('a', 64)]);

        $this->actingAs($user)->post(route('plans.duplicate', $v1))->assertRedirect();

        $v2 = Plan::query()->where('code', 'BTAGRI')->where('version', 2)->firstOrFail();
        $this->assertSame('brouillon', $v2->statut);
        $this->assertCount(1, $v2->lignes);

        $this->actingAs($user)->post(route('plans.store'), ['code' => 'BTA-PORC', 'libelle' => 'Porcherie']);
        $this->assertDatabaseHas('plans', ['code' => 'BTA-PORC', 'version' => 1]);
    }

    public function test_dates_can_be_regenerated_from_the_active_plan_without_duplicates(): void
    {
        $user = User::factory()->create();
        $culture = Culture::query()->create([
            'code' => 'CHOU',
            'nom' => 'Chou',
            'unite_recolte' => 'kg',
            'unite_travail' => 'planches',
            'actif' => true,
        ]);
        $plan = Plan::query()->create([
            'code' => 'BTAGRI',
            'libelle' => 'Maraîchage',
            'type' => 'agricole',
            'version' => 1,
            'statut' => 'en_vigueur',
        ]);
        $ligne = $plan->lignes()->create([
            'cle' => 'CHOU|J7|FERTILISER',
            'cible' => 'Chou',
            'code_cible' => 'CHOU',
            'jour_offset' => 7,
            'tache' => 'Fertiliser',
            'priorite' => 'normale',
            'point_controle' => false,
            'empreinte' => str_repeat('a', 64),
        ]);
        $plantation = Plantation::query()->create([
            'reference' => 'PLT-TEST',
            'culture_id' => $culture->id,
            'lieu' => 'Parcelle B1',
            'j0' => '2026-09-01',
            'statut' => 'active',
            'plan_id' => $plan->id,
        ]);

        $this->actingAs($user)->post(route('plans.regenerate', $plan))
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertDatabaseHas('taches', [
            'plantation_id' => $plantation->id,
            'plan_ligne_id' => $ligne->id,
            'date_due' => '2026-09-08 00:00:00',
        ]);

        $this->actingAs($user)->post(route('plans.regenerate', $plan))
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertDatabaseCount('taches', 1);
    }
}
