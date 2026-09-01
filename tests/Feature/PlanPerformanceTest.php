<?php

namespace Tests\Feature;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\Plan;
use App\Models\Tache;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlanPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_plan_performance_is_calculated_line_by_line(): void
    {
        $user = User::factory()->create();
        $plan = Plan::query()->create([
            'code' => 'BTAGRI',
            'libelle' => 'Plan maraîchage',
            'type' => 'agricole',
            'version' => 2,
            'statut' => 'en_vigueur',
            'date_effet' => '2026-09-01',
        ]);
        $ligne = $plan->lignes()->create([
            'cle' => 'CHOU|J7|FERTILISER',
            'cible' => 'Chou',
            'jour_offset' => 7,
            'tache' => 'Fertiliser',
            'categorie' => 'fertilisation',
            'priorite' => 'normale',
            'point_controle' => false,
            'empreinte' => str_repeat('a', 64),
        ]);

        $this->task($ligne->id, 'TSK-001', StatutTache::Faite, '2026-09-01 10:00:00');
        $this->task($ligne->id, 'TSK-002', StatutTache::Faite, '2026-09-02 10:00:00');
        $this->task($ligne->id, 'TSK-003', StatutTache::NonFaiteNonJustifiee);
        $this->task($ligne->id, 'TSK-004', StatutTache::AFaire);

        $this->actingAs($user)->get(route('plans.performance'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('plans/performance')
                ->where('plan.code', 'BTAGRI')
                ->where('summary.dues', 4)
                ->where('summary.faites', 2)
                ->where('summary.a_temps', 1)
                ->where('summary.non_justifiees', 1)
                ->where('summary.ouvertes', 1)
                ->where('summary.taux', 50)
                ->has('lines', 1)
                ->where('lines.0.taux', 50));
    }

    public function test_page_has_a_clear_empty_state_without_active_plan(): void
    {
        $user = User::factory()->create();
        Plan::query()->create([
            'code' => 'BTAGRI',
            'libelle' => 'Brouillon',
            'type' => 'agricole',
            'version' => 1,
            'statut' => 'brouillon',
        ]);

        $this->actingAs($user)->get(route('plans.performance'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('plans/performance')
                ->has('plans', 0)
                ->where('plan', null)
                ->where('summary.dues', 0));
    }

    private function task(int $lineId, string $reference, StatutTache $status, ?string $doneAt = null): void
    {
        Tache::query()->create([
            'reference' => $reference,
            'source' => SourceTache::CalendrierCultural,
            'titre' => 'Fertiliser le chou',
            'date_due' => '2026-09-01',
            'priorite' => Priorite::Normale,
            'statut' => $status,
            'plan_ligne_id' => $lineId,
            'est_modele' => false,
            'fait_le' => $doneAt,
        ]);
    }
}
