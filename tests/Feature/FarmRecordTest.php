<?php

namespace Tests\Feature;

use App\Models\FarmRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FarmRecordTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_farm_data(): void
    {
        $this->getJson(route('farm-data.index'))->assertUnauthorized();
    }

    public function test_user_can_store_list_and_read_a_record(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson(route('farm-data.store', ['recordKey' => 'rap:AGRI:2026-08-25']), [
                'value' => '{"meteo":"Sec"}',
            ])
            ->assertOk()
            ->assertJsonPath('value', '{"meteo":"Sec"}');

        $this->actingAs($user)
            ->getJson(route('farm-data.index', ['prefix' => 'rap:AGRI:']))
            ->assertOk()
            ->assertJsonPath('keys.0', 'rap:AGRI:2026-08-25');

        $this->actingAs($user)
            ->getJson(route('farm-data.show', ['recordKey' => 'rap:AGRI:2026-08-25']))
            ->assertOk()
            ->assertJsonPath('value', '{"meteo":"Sec"}');
    }

    public function test_records_are_isolated_between_users(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)->putJson(route('farm-data.store', ['recordKey' => 'compteurs']), [
            'value' => '{"Tracteur":20}',
        ]);

        $this->actingAs($other)
            ->getJson(route('farm-data.show', ['recordKey' => 'compteurs']))
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_a_recognized_legacy_report_is_not_shared_with_another_user(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $key = 'rap:AGRI:2026-08-25';

        $this->actingAs($owner)->putJson(route('farm-data.store', ['recordKey' => $key]), [
            'value' => '{"meteo":"Sec","secret":"propre a l auteur"}',
        ])->assertOk();

        $this->actingAs($other)
            ->getJson(route('farm-data.show', ['recordKey' => $key]))
            ->assertOk()
            ->assertExactJson([]);

        $this->actingAs($other)
            ->getJson(route('farm-data.index', ['prefix' => 'rap:AGRI:']))
            ->assertOk()
            ->assertExactJson(['keys' => []]);
    }

    public function test_record_updates_are_atomic_and_do_not_create_duplicates(): void
    {
        $user = User::factory()->create();
        $route = route('farm-data.store', ['recordKey' => 'compteurs']);

        $this->actingAs($user)->putJson($route, ['value' => '{"Tracteur":20}'])->assertOk();
        $this->actingAs($user)->putJson($route, ['value' => '{"Tracteur":15}'])
            ->assertOk()
            ->assertJsonPath('value', '{"Tracteur":15}')
            ->assertJsonStructure(['value', 'updated_at']);

        $this->assertSame(1, FarmRecord::whereBelongsTo($user)->where('record_key', 'compteurs')->count());
    }

    public function test_invalid_json_and_oversized_keys_are_rejected_cleanly(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson(route('farm-data.store', ['recordKey' => 'compteurs']), ['value' => 'not-json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('value');

        $this->actingAs($user)
            ->putJson(route('farm-data.store', ['recordKey' => str_repeat('a', 191)]), ['value' => '{}'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('record_key');

        $this->actingAs($user)
            ->getJson(route('farm-data.index', ['prefix' => str_repeat('a', 191)]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('prefix');
    }
}
