<?php

namespace Tests\Feature;

use App\Models\Incident;
use App\Models\OrdreTravail;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncidentWorkOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_open_a_work_order_linked_to_an_hse_incident(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'actif' => true]);
        $site = Site::query()->create(['code' => 'K1', 'nom' => 'Kasangulu 1']);

        $this->actingAs($admin);
        $incident = Incident::query()->create([
            'reference' => 'IR-2026-08-001',
            'nature' => 'securite',
            'survenu_le' => now()->subHour(),
            'signale_le' => now(),
            'site_id' => $site->id,
            'description' => 'Le carter de protection de la pompe est endommagé.',
            'statut' => 'signale',
            'declare_par_id' => $admin->id,
        ]);

        $this->post(route('admin.processes.incidents.work-orders.store', $incident), [
            'objet' => 'Remplacer le carter de la pompe',
            'description' => 'Consigner la pompe puis poser un carter conforme.',
            'priorite' => 'elevee',
            'echeance' => today()->addDays(3)->toDateString(),
        ])->assertRedirect();

        $ordre = OrdreTravail::query()->sole();

        $this->assertSame('incident', $ordre->origine);
        $this->assertSame('correctif', $ordre->type_intervention);
        $this->assertSame($incident->id, $ordre->incident_id);
        $this->assertSame($site->id, $ordre->site_id);
        $this->assertSame('elevee', $ordre->priorite);
        $this->assertSame($ordre->id, $incident->ordresTravail()->sole()->id);
        $this->assertDatabaseHas('ot_evenements', [
            'ordre_travail_id' => $ordre->id,
            'type' => 'demande',
        ]);
    }
}
