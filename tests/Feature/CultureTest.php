<?php

namespace Tests\Feature;

use App\Models\Culture;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CultureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_culture_reference_lists_cultures_and_opens_the_create_form(): void
    {
        $user = User::factory()->create();
        Culture::query()->create([
            'code' => 'MAIS', 'nom' => 'Maïs', 'famille' => 'Graminées',
            'unite_recolte' => 'kg', 'unite_travail' => 'lignes', 'actif' => true,
        ]);

        $this->actingAs($user)->get('/cultures')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('cultures/index')
                ->has('cultures', 1)->where('cultures.0.code', 'MAIS'));
        $this->actingAs($user)->get('/cultures/create')->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('cultures/form')->where('mode', 'create'));
    }

    public function test_user_can_create_and_update_a_culture(): void
    {
        $user = User::factory()->create();
        $data = [
            'code' => 'HARICOT', 'nom' => 'Haricot', 'famille' => 'Fabacées',
            'delai_rotation' => 2, 'unite_recolte' => 'kg', 'unite_travail' => 'lignes',
            'jours_maturite' => 75, 'actif' => true, 'note' => 'Culture test.',
        ];

        $this->actingAs($user)->post('/cultures', $data)->assertRedirect();
        $culture = Culture::query()->where('code', 'HARICOT')->firstOrFail();
        $this->actingAs($user)->put("/cultures/{$culture->id}", array_merge($data, ['nom' => 'Haricot commun']))
            ->assertRedirect(route('cultures.index'));

        $this->assertDatabaseHas('cultures', ['id' => $culture->id, 'nom' => 'Haricot commun']);
    }
}
