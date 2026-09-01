<?php

namespace Tests\Feature;

use App\Models\MainCourante;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class MainCouranteWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_entry_can_be_created_with_all_requested_fields(): void
    {
        Storage::fake('public');
        $agent = User::factory()->create(['actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Ferme Kasangulu 1', 'actif' => true]);

        $this->actingAs($agent)->get(route('main-courante.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('main-courante/form')
                ->has('types', 7)
                ->has('sites', 1));

        $this->actingAs($agent)->post(route('main-courante.store'), [
            'survenu_le' => now()->subMinute()->format('Y-m-d H:i:s'),
            'type' => 'entree',
            'site_id' => $site->id,
            'lieu' => 'Portail principal',
            'objet' => 'Entrée du véhicule de livraison au portail principal.',
            'personne' => 'Jean Visiteur',
            'vehicule' => 'ABC-1234',
            'piece_identite' => 'CNI-45872',
            'photo' => UploadedFile::fake()->image('portail.jpg'),
        ])->assertRedirect(route('main-courante.index'))->assertSessionDoesntHaveErrors();

        $entry = MainCourante::query()->firstOrFail();
        $this->assertSame('MC-', substr($entry->reference, 0, 3));
        $this->assertSame($agent->name, $entry->agent_nom);
        $this->assertNotNull($entry->photo_chemin);
        Storage::disk('public')->assertExists($entry->photo_chemin);

        $this->actingAs($agent)->get(route('main-courante.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('main-courante/index')
                ->has('entries', 1)
                ->where('fkn.dailyLogCount', 1));
    }

    public function test_a_daily_log_entry_is_immutable(): void
    {
        $entry = MainCourante::query()->create([
            'reference' => 'MC-2026-09-001',
            'survenu_le' => now(),
            'type' => 'consigne',
            'objet' => 'Maintenir le portail fermé après vingt-deux heures.',
            'agent_nom' => 'Administrateur FKN',
        ]);

        $this->expectException(RuntimeException::class);
        $entry->update(['objet' => 'Tentative de modification']);
    }
}
