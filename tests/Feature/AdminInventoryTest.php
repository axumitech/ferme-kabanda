<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\MaterialAssignment;
use App\Models\MouvementStock;
use App\Models\ProductStock;
use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminInventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_administrators_can_manage_the_complete_inventory(): void
    {
        $member = User::factory()->create(['is_admin' => false]);

        $this->actingAs($member)->get(route('admin.inventory.index'))->assertForbidden();
        $this->actingAs($member)->post(route('admin.inventory.items.store'), [])->assertForbidden();
    }

    public function test_admin_can_create_adjust_and_archive_an_inventory_item_with_audit_history(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.inventory.items.store'), [
            'user_id' => $owner->id,
            'category_code' => 'OUT',
            'category_name' => 'Outillage',
            'code' => 'OUT-901',
            'name' => 'Bêche renforcée',
            'unit' => 'pièce',
            'quantity' => 5,
            'unit_price' => 25,
            'minimum_quantity' => 1,
            'cost_center' => 'EXA',
        ])->assertRedirect();

        $item = Article::query()->where('code', 'OUT-901')->firstOrFail();
        $this->assertSame('5.000000', $item->quantite_base);
        $this->assertDatabaseHas('mouvements_stock', [
            'article_id' => $item->id,
            'user_id' => $admin->id,
            'type' => 'entree',
        ]);

        $this->actingAs($admin)->post(route('admin.inventory.items.adjust', $item), [
            'quantity_change' => -2,
            'reason' => 'Remise à l’équipe terrain',
        ])->assertRedirect();
        $this->assertSame('3.000000', $item->fresh()->quantite_base);

        $this->actingAs($admin)->delete(route('admin.inventory.items.archive', $item))
            ->assertSessionHasErrors('archive');

        $this->actingAs($admin)->post(route('admin.inventory.items.adjust', $item), [
            'quantity_change' => -3,
            'reason' => 'Sortie finale',
        ])->assertRedirect();
        $this->actingAs($admin)->delete(route('admin.inventory.items.archive', $item))->assertRedirect();

        $this->assertFalse($item->fresh()->actif);
        $this->assertSame(3, MouvementStock::query()->where('article_id', $item->id)->count());
    }

    public function test_admin_can_manage_product_stock_and_material_assignments(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $person = ReferenceItem::query()->create(['category' => 'agents_agri', 'label' => 'Jean Kabeya', 'active' => true]);
        $material = ReferenceItem::query()->create(['category' => 'epi_types', 'label' => 'Bottes de sécurité', 'active' => true]);

        $this->actingAs($admin)->post(route('admin.inventory.products.store'), [
            'user_id' => $owner->id,
            'product_name' => 'Produit test',
            'unit' => 'litre',
            'quantity' => 12,
            'minimum_quantity' => 3,
        ])->assertRedirect();
        $stock = ProductStock::query()->where('product_name', 'Produit test')->firstOrFail();
        $this->actingAs($admin)->post(route('admin.inventory.products.adjust', $stock), [
            'quantity_change' => -4,
            'reason' => 'Application parcelle A1',
        ])->assertRedirect();
        $this->assertSame('8.000', $stock->fresh()->quantity_on_hand);

        $this->actingAs($admin)->post(route('admin.inventory.assignments.store'), [
            'user_id' => $owner->id,
            'assignee_reference_item_id' => $person->id,
            'material_reference_item_id' => $material->id,
            'size' => '42',
            'assigned_on' => '2026-08-26',
            'expires_on' => '2027-08-26',
            'reason' => 'Dotation annuelle',
        ])->assertRedirect();

        $assignment = MaterialAssignment::query()->firstOrFail();
        $this->assertSame('Jean Kabeya', $assignment->assignee_name);
        $this->assertSame($admin->id, $assignment->actor_user_id);

        $this->actingAs($admin)->post(route('admin.inventory.assignments.end', $assignment), [
            'reason' => 'Matériel usé remplacé',
        ])->assertRedirect();
        $this->assertTrue($assignment->fresh()->is_replaced);
        $this->actingAs($admin)->get(route('admin.inventory.index'))->assertOk();
    }

    public function test_material_assignments_api_replaces_the_legacy_json_key(): void
    {
        $user = User::factory()->create();
        $payload = ['assignments' => [[
            'id' => 'epi-001',
            'agent' => 'Agent terrain',
            'type' => 'Gants',
            'taille' => 'L',
            'remise' => '2026-08-26',
            'expire' => '2027-08-26',
            'motif' => '',
            'remisPar' => 'Chef équipe',
            'remplace' => false,
            'finMotif' => null,
        ]]];

        $this->actingAs($user)->putJson(route('material-assignments.sync'), $payload)
            ->assertOk()->assertJsonPath('assignments.0.id', 'epi-001');
        $this->assertDatabaseHas('material_assignments', ['user_id' => $user->id, 'legacy_key' => 'epi-001']);

        $this->actingAs($user)->putJson(route('farm-data.store', ['recordKey' => 'epi_dotations']), ['value' => '[]'])
            ->assertUnprocessable()->assertJsonValidationErrors('record_key');
    }
}
