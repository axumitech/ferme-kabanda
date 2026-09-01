<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GlobalToastFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_feedback_levels_are_shared_with_the_frontend(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession([
                'success' => 'Création réussie.',
                'error' => 'Action refusée.',
                'warning' => 'Contrôle recommandé.',
                'info' => 'Traitement en cours.',
            ])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('flash.success', 'Création réussie.')
                ->where('flash.error', 'Action refusée.')
                ->where('flash.warning', 'Contrôle recommandé.')
                ->where('flash.info', 'Traitement en cours.'));
    }
}
