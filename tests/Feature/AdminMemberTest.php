<?php

namespace Tests\Feature;

use App\Models\FarmRecord;
use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_open_members_management(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.members.index'))
            ->assertForbidden();
    }

    public function test_admin_can_create_a_member_with_a_phone_number(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.members.store'), [
            'name' => 'Jean Kabeya',
            'phone' => '+243 812 345 678',
            'email' => '',
            'password' => 'motdepasse123',
            'password_confirmation' => 'motdepasse123',
            'is_admin' => false,
        ])->assertSessionHasNoErrors();

        $member = User::where('phone', '243812345678')->firstOrFail();

        $this->assertNull($member->email);
        $this->assertFalse($member->is_admin);
        $this->assertTrue(Hash::check('motdepasse123', $member->password));
    }

    public function test_admin_can_link_a_member_to_an_agricultural_team_person(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $agent = ReferenceItem::create([
            'category' => 'agents_agri',
            'label' => 'Jean Kabeya — chef d’équipe',
            'sort_order' => 1,
            'active' => true,
        ]);

        $this->actingAs($admin)->post(route('admin.members.store'), [
            'name' => 'Jean Kabeya',
            'phone' => '+243 812 345 678',
            'email' => '',
            'reference_item_id' => $agent->id,
            'password' => 'motdepasse123',
            'password_confirmation' => 'motdepasse123',
            'is_admin' => false,
        ])->assertSessionHasNoErrors();

        $member = User::where('phone', '243812345678')->firstOrFail();

        $this->assertTrue($member->teamMember->is($agent));
        $this->assertTrue($agent->memberAccount->is($member));
    }

    public function test_same_team_person_cannot_be_linked_to_two_accounts(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $agent = ReferenceItem::create([
            'category' => 'agents_ani',
            'label' => 'Responsable porcherie',
            'sort_order' => 1,
            'active' => true,
        ]);
        User::factory()->create([
            'phone' => '243811111111',
            'reference_item_id' => $agent->id,
        ]);

        $this->actingAs($admin)->post(route('admin.members.store'), [
            'name' => 'Second compte',
            'phone' => '243822222222',
            'email' => '',
            'reference_item_id' => $agent->id,
            'password' => 'motdepasse123',
            'password_confirmation' => 'motdepasse123',
            'is_admin' => false,
        ])->assertSessionHasErrors('reference_item_id');
    }

    public function test_admin_can_update_a_member_and_reset_their_password(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $member = User::factory()->create(['phone' => '243811111111']);

        $this->actingAs($admin)->put(route('admin.members.update', $member), [
            'name' => 'Responsable élevage',
            'phone' => '+243 822 222 222',
            'email' => $member->email,
            'password' => 'nouveaupass123',
            'password_confirmation' => 'nouveaupass123',
            'is_admin' => true,
        ])->assertSessionHasNoErrors();

        $member->refresh();
        $this->assertSame('243822222222', $member->phone);
        $this->assertTrue($member->is_admin);
        $this->assertTrue(Hash::check('nouveaupass123', $member->password));
    }

    public function test_admin_cannot_delete_their_own_account(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.members.destroy', $admin))
            ->assertSessionHasErrors('member');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_deleting_a_member_preserves_their_historical_farm_data(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $member = User::factory()->create(['phone' => '243899999998']);
        $record = FarmRecord::create([
            'user_id' => $member->id,
            'record_key' => 'rap:AGRI:2026-08-26',
            'value' => '{}',
        ]);

        $this->actingAs($admin)
            ->delete(route('admin.members.destroy', $member))
            ->assertSessionHasNoErrors();

        $this->assertSoftDeleted($member);
        $this->assertDatabaseHas('farm_records', ['id' => $record->id]);
        $this->assertSame($member->id, $record->fresh()->user->id);
        $this->assertNull($member->fresh()->email);
        $this->assertNull($member->fresh()->phone);
    }

    public function test_member_identifiers_are_normalized_before_uniqueness_validation(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        User::factory()->create([
            'email' => 'membre@ferme.cd',
            'phone' => '243812345678',
        ]);

        $this->actingAs($admin)->post(route('admin.members.store'), [
            'name' => 'Doublon',
            'phone' => '00 243 812 345 678',
            'email' => ' MEMBRE@FERME.CD ',
            'password' => 'motdepasse123',
            'password_confirmation' => 'motdepasse123',
            'is_admin' => false,
        ])->assertSessionHasErrors(['phone', 'email']);
    }

    public function test_members_page_contains_created_members(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $member = User::factory()->create(['phone' => '243899999999']);

        $this->actingAs($admin)
            ->get(route('admin.members.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/members')
                ->where('members.1.id', $member->id));
    }
}
