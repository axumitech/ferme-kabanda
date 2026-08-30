<?php

namespace Tests\Feature;

use App\Models\Incident;
use App\Models\Requisition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SharedRegistryTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_registry_is_available_to_an_agent_but_masks_restricted_and_confidential_data(): void
    {
        $agent = User::factory()->create(['niveau_hierarchie' => 4]);
        Requisition::query()->create([
            'reference' => 'REQ-2026-08-0001', 'type' => 'CSH', 'objet' => 'Réparer la pompe', 'montant' => 150,
        ]);
        Incident::query()->create([
            'reference' => 'INC-2026-08-0001', 'nature' => 'securite', 'survenu_le' => now(), 'description' => 'Sol glissant',
        ]);
        Incident::query()->create([
            'reference' => 'INC-2026-08-0002', 'nature' => 'surete', 'survenu_le' => now(), 'description' => 'Enquête en cours',
        ]);

        $this->actingAs($agent)->get(route('shared-registry'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('shared-registry')
                ->has('requisitions', 1)
                ->where('requisitions.0.montant', null)
                ->has('incidents', 1)
                ->where('incidents.0.reference', 'INC-2026-08-0001'));
    }
}
