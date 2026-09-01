<?php

namespace Tests\Feature;

use App\Models\TauxChange;
use App\Models\User;
use App\Services\TauxChangeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TauxChangeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_admin_can_register_a_dated_exchange_rate(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->get('/taux-change/create')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('taux-change/form')->where('today', today()->toDateString()));

        $this->actingAs($admin)->post('/taux-change', [
            'devise' => 'CDF', 'taux' => 2350.50, 'effet_le' => today()->toDateString(),
            'source' => 'Décision Direction',
        ])->assertRedirect('/taux-change');

        $rate = TauxChange::query()->whereDate('effet_le', today())->firstOrFail();
        $this->assertEquals(2350.5, (float) $rate->taux);
        $this->assertSame($admin->name, $rate->saisi_par_nom);
        $this->assertEquals(2350.5, app(TauxChangeService::class)->taux());

        $this->actingAs($admin)->get('/taux-change')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('taux-change/index')->where('taux.0.statut', 'actuel'));
    }

    public function test_future_rate_does_not_change_the_current_rate_and_non_admin_is_forbidden(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);
        $current = app(TauxChangeService::class)->taux();

        $this->actingAs($admin)->post('/taux-change', [
            'devise' => 'CDF', 'taux' => 2500, 'effet_le' => today()->addDay()->toDateString(),
        ])->assertRedirect();

        $this->assertEquals($current, app(TauxChangeService::class)->taux());
        $this->actingAs($admin)->get('/taux-change')->assertInertia(fn (Assert $page) => $page->where('taux.0.statut', 'avenir'));
        $this->actingAs($user)->get('/taux-change')->assertForbidden();
        $this->actingAs($user)->get('/taux-change/create')->assertForbidden();
    }
}
