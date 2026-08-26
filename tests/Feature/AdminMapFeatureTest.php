<?php

namespace Tests\Feature;

use App\Models\MapFeature;
use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMapFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_open_map_editor(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.map.index'))
            ->assertForbidden();
    }

    public function test_admin_can_draw_and_update_a_map_feature(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $payload = [
            'name' => 'Parc 9',
            'feature_type' => 'parc',
            'area_ha' => 1.25,
            'area_m2' => null,
            'points' => [[100, 100], [240, 100], [220, 260], [110, 240]],
            'sort_order' => 20,
            'active' => true,
        ];

        $this->actingAs($admin)
            ->post(route('admin.map.store'), $payload)
            ->assertRedirect();

        $feature = MapFeature::where('name', 'Parc 9')->firstOrFail();
        $this->assertDatabaseHas('reference_items', ['category' => 'parcelles', 'label' => 'Parc 9']);

        $payload['points'][0] = [90, 90];
        $this->actingAs($admin)
            ->put(route('admin.map.update', $feature), $payload)
            ->assertRedirect();

        $this->assertSame([90, 90], $feature->fresh()->points[0]);
    }

    public function test_map_feature_can_reference_existing_parcel(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $reference = ReferenceItem::create(['category' => 'parcelles', 'label' => 'Parc test', 'active' => true]);

        $this->actingAs($admin)->post(route('admin.map.store'), [
            'name' => 'Parc test',
            'feature_type' => 'parc',
            'points' => [[0, 0], [100, 0], [100, 100]],
            'sort_order' => 1,
            'active' => true,
        ]);

        $this->assertSame($reference->id, MapFeature::where('name', 'Parc test')->value('reference_item_id'));
    }
}
