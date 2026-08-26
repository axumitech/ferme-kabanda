<?php

namespace Tests\Feature;

use App\Models\FarmRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_see_global_reports(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('admin.reports.index'))
            ->assertForbidden();
    }

    public function test_admin_can_see_reports_created_by_other_users(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $agent = User::factory()->create(['name' => 'Agent Agricole']);
        FarmRecord::create([
            'user_id' => $agent->id,
            'record_key' => 'rap:AGRI:2026-08-25',
            'value' => json_encode([
                'bureau' => 'AGRI',
                'meteo' => 'Sec',
                'travaux' => [['lieu' => 'Parc 1', 'tache' => 'Arrosage']],
                'recoltes' => [['lieu' => 'Parc 1', 'kg' => 12.5]],
                'problemes' => [],
            ], JSON_THROW_ON_ERROR),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/reports')
                ->has('reports', 1)
                ->where('reports.0.office', 'AGRI')
                ->where('reports.0.user.name', 'Agent Agricole')
                ->where('reports.0.harvest_total', 12.5));
    }

    public function test_malformed_legacy_report_data_does_not_break_the_admin_dashboard(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $agent = User::factory()->create();
        FarmRecord::create([
            'user_id' => $agent->id,
            'record_key' => 'rap:ANI:2026-08-26',
            'value' => json_encode([
                'travaux' => 'ancienne valeur invalide',
                'recoltes' => [null, 'invalide', ['kg' => '4.5']],
                'problemes' => null,
            ], JSON_THROW_ON_ERROR),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reports.0.entry_count', 3)
                ->where('reports.0.problem_count', 0)
                ->where('reports.0.harvest_total', 4.5));
    }
}
