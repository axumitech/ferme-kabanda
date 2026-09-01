<?php

namespace Tests\Feature;

use App\Models\Patrouille;
use App\Models\PosteControle;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PatrouilleWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_patrol_can_be_opened_pointed_and_closed(): void
    {
        $agent = User::factory()->create(['actif' => true, 'is_admin' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'actif' => true]);
        $poste = PosteControle::query()->create([
            'code' => 'PC-01',
            'nom' => 'Portail principal',
            'site_id' => $site->id,
            'ordre' => 1,
            'actif' => true,
        ]);

        $this->actingAs($agent)->get(route('patrouilles.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('patrouilles/form')
                ->has('users', 1)
                ->has('sites', 1));

        $this->actingAs($agent)->post(route('patrouilles.store'), [
            'date' => today()->toDateString(),
            'tour' => 'jour',
            'agent_id' => $agent->id,
            'equipe' => 'Second agent et chien',
            'site_id' => $site->id,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $patrouille = Patrouille::query()->firstOrFail();
        $this->assertSame('en_cours', $patrouille->statut);
        $this->assertSame(1, $patrouille->points_prevus);

        $this->actingAs($agent)->get(route('patrouilles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('patrouilles/index')
                ->has('patrols', 1)
                ->where('fkn.patrolsOpen', 1));

        $this->actingAs($agent)->post(route('patrouilles.pointages.store', $patrouille), [
            'poste_controle_id' => $poste->id,
            'etat' => 'anomalie',
        ])->assertSessionHasErrors('constat');

        $this->actingAs($agent)->post(route('patrouilles.pointages.store', $patrouille), [
            'poste_controle_id' => $poste->id,
            'etat' => 'conforme',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertSame(1, $patrouille->fresh()->points_faits);
        $this->assertDatabaseHas('passages_patrouille', [
            'patrouille_id' => $patrouille->id,
            'poste_controle_id' => $poste->id,
            'etat' => 'conforme',
        ]);

        $this->actingAs($agent)->get(route('patrouilles.show', $patrouille))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('patrouilles/show')
                ->has('patrol.passages', 1)
                ->has('posts', 1));

        $this->actingAs($agent)->post(route('patrouilles.close', $patrouille), [
            'observations' => 'Tour terminé sans anomalie.',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertSame('terminee', $patrouille->fresh()->statut);
        $this->assertSame('Tour terminé sans anomalie.', $patrouille->fresh()->observations);
    }

    public function test_an_agent_cannot_open_two_patrols_at_once(): void
    {
        $agent = User::factory()->create(['actif' => true]);

        $payload = [
            'date' => today()->toDateString(),
            'tour' => 'nuit',
            'agent_id' => $agent->id,
        ];

        $this->actingAs($agent)->post(route('patrouilles.store'), $payload)
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors();

        $this->actingAs($agent)->post(route('patrouilles.store'), $payload)
            ->assertSessionHasErrors('agent_id');

        $this->assertDatabaseCount('patrouilles', 1);
    }
}
