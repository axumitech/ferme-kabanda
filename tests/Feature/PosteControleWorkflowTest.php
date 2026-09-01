<?php

namespace Tests\Feature;

use App\Models\PosteControle;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PosteControleWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_control_post_can_be_created_and_edited(): void
    {
        $user = User::factory()->create();
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'actif' => true]);

        $this->actingAs($user)->get(route('postes-controle.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('postes-controle/form')
                ->where('post', null)
                ->has('sites', 1));

        $this->actingAs($user)->post(route('postes-controle.store'), [
            'code' => 'PC-07',
            'nom' => 'Périmètre nord',
            'site_id' => $site->id,
            'ordre' => 7,
            'latitude' => -4.59,
            'longitude' => 15.18,
            'actif' => true,
        ])->assertRedirect(route('postes-controle.index'))->assertSessionDoesntHaveErrors();

        $poste = PosteControle::query()->firstOrFail();

        $this->actingAs($user)->get(route('postes-controle.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('postes-controle/index')
                ->has('posts', 1)
                ->where('posts.0.passages_count', 0)
                ->where('fkn.controlPostsActive', 1));

        $this->actingAs($user)->put(route('postes-controle.update', $poste), [
            'code' => 'PC-07',
            'nom' => 'Périmètre nord sécurisé',
            'site_id' => $site->id,
            'ordre' => 8,
            'latitude' => -4.59,
            'longitude' => 15.18,
            'actif' => false,
        ])->assertRedirect(route('postes-controle.index'))->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('postes_controle', [
            'id' => $poste->id,
            'nom' => 'Périmètre nord sécurisé',
            'ordre' => 8,
            'actif' => false,
        ]);
    }

    public function test_control_post_code_is_unique_and_coordinates_are_validated(): void
    {
        $user = User::factory()->create();
        PosteControle::query()->create(['code' => 'PC-01', 'nom' => 'Portail', 'actif' => true]);

        $this->actingAs($user)->post(route('postes-controle.store'), [
            'code' => 'PC-01',
            'nom' => 'Doublon',
            'ordre' => 1,
            'latitude' => 100,
            'longitude' => 200,
            'actif' => true,
        ])->assertSessionHasErrors(['code', 'latitude', 'longitude']);
    }
}
