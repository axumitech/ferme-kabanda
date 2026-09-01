<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClientTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_can_create_and_edit_a_client_used_by_sales(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->get('/clients/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('clients/form')->where('mode', 'create')->has('canaux', 5));

        $this->actingAs($admin)->post('/clients', [
            'code' => 'GOMA-PREM', 'nom' => 'Client Premium Goma', 'canal' => 'premium',
            'devise_preferee' => 'USD', 'prix_reference' => 7, 'unite_reference' => 'kg carcasse',
            'contact' => 'Direction achats', 'telephone' => '+243000000000',
            'delai_paiement_jours' => 14, 'actif' => true, 'note' => 'Compte test.',
        ])->assertRedirect();

        $client = Client::query()->where('code', 'GOMA-PREM')->firstOrFail();
        $this->actingAs($admin)->get('/ventes/create')->assertInertia(fn (Assert $page) => $page
            ->where('clients.0.prix_reference', '7.00'));

        $this->actingAs($admin)->put("/clients/{$client->id}", [
            'code' => 'GOMA-PREM', 'nom' => 'Client Premium Goma SARL', 'canal' => 'export',
            'devise_preferee' => 'CDF', 'actif' => false,
        ])->assertRedirect('/clients');
        $this->assertDatabaseHas('clients', ['id' => $client->id, 'nom' => 'Client Premium Goma SARL', 'canal' => 'export', 'actif' => false]);
    }

    public function test_index_counts_sales_and_non_admin_is_forbidden(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($admin)->get('/clients')->assertOk()->assertInertia(fn (Assert $page) => $page->component('clients/index')->has('clients')->has('canaux'));
        $this->actingAs($user)->get('/clients')->assertForbidden();
    }
}
