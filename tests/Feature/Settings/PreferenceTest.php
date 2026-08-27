<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_preferences_page_is_displayed(): void
    {
        $user = User::factory()->create(['locale' => 'fr']);

        $this->actingAs($user)
            ->get(route('preferences.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('settings/preferences')
                ->where('locale', 'fr')
                ->has('locales', 2));
    }

    public function test_user_can_update_language(): void
    {
        $user = User::factory()->create(['locale' => 'fr']);

        $this->actingAs($user)
            ->put(route('preferences.update'), ['locale' => 'en'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('preferences.edit'));

        $this->assertSame('en', $user->fresh()->locale);
        $this->assertSame('en', session('locale'));
    }
}
