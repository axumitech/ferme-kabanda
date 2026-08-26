<?php

namespace Tests\Feature;

use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminReferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_open_admin_dashboard(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.index'))
            ->assertForbidden();
    }

    public function test_admin_can_create_and_update_reference(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.references.store'), [
            'category' => 'parcelles',
            'label' => 'Parc 9',
            'description' => 'Nouvelle zone',
            'sort_order' => 20,
            'active' => true,
        ])->assertRedirect();

        $item = ReferenceItem::where('label', 'Parc 9')->firstOrFail();

        $this->actingAs($admin)->put(route('admin.references.update', $item), [
            'category' => 'parcelles',
            'label' => 'Parc 9 Nord',
            'description' => null,
            'sort_order' => 21,
            'active' => false,
        ])->assertRedirect();

        $this->assertDatabaseHas('reference_items', [
            'id' => $item->id,
            'label' => 'Parc 9 Nord',
            'active' => false,
        ]);
    }

    public function test_duplicate_reference_returns_a_validation_error_instead_of_a_database_error(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        ReferenceItem::where('category', 'unites')->where('label', 'kg')->firstOrFail();

        $this->actingAs($admin)->post(route('admin.references.store'), [
            'category' => 'unites',
            'label' => '  kg  ',
            'description' => '',
            'sort_order' => 2,
            'active' => true,
        ])->assertSessionHasErrors('label');

        $this->assertSame(1, ReferenceItem::where('category', 'unites')->where('label', 'kg')->count());
    }
}
