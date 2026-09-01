<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PlanImport;
use App\Models\PlanImportLigne;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlanImportWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_csv_plan_is_analysed_arbitrated_and_applied(): void
    {
        $manager = User::factory()->create(['niveau_hierarchie' => 1]);
        $csv = implode("\n", [
            'code_plan;type_plan;cible;code_cible;jour_offset;recurrence;tache;description;instruction;categorie;quantite;unite;priorite;role_responsable;point_controle;preuve',
            'BTAGRI;agricole;Chou;CHOU;7;;Fertilisation 1;Premier apport;Urée puis arroser;fertilisation;120;g/planche;normale;agent;0;photo',
        ])."\n";

        $this->actingAs($manager)->get(route('plan-imports.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('plans/imports/form'));

        $this->actingAs($manager)->post(route('plan-imports.store'), [
            'code_plan' => 'BTAGRI',
            'fichier' => UploadedFile::fake()->createWithContent('plan.csv', $csv),
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $import = PlanImport::query()->firstOrFail();
        $line = PlanImportLigne::query()->firstOrFail();
        $this->assertSame('analyse', $import->statut);
        $this->assertSame(1, $import->lignes_ajout);
        $this->assertSame('ajout', $line->difference);

        $this->actingAs($manager)->get(route('plan-imports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('plans/imports/index')
                ->has('imports', 1)
                ->where('fkn.planImportsPending', 1));

        $this->actingAs($manager)->post(route('plan-imports.lines.decide', [$import, $line]), [
            'accepted' => true,
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->actingAs($manager)->post(route('plan-imports.apply', $import), [
            'note' => 'Première version importée.',
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $plan = Plan::query()->firstOrFail();
        $this->assertSame('en_vigueur', $plan->statut);
        $this->assertSame(1, $plan->version);
        $this->assertSame('applique', $import->fresh()->statut);
        $this->assertDatabaseHas('plan_lignes', [
            'plan_id' => $plan->id,
            'tache' => 'Fertilisation 1',
        ]);
    }

    public function test_import_cannot_be_applied_before_every_difference_is_decided(): void
    {
        $manager = User::factory()->create(['niveau_hierarchie' => 1]);
        $import = PlanImport::query()->create([
            'code_plan' => 'BTAGRI',
            'fichier' => 'plan.csv',
            'statut' => 'analyse',
            'lignes_lues' => 1,
        ]);
        PlanImportLigne::query()->create([
            'plan_import_id' => $import->id,
            'numero_ligne' => 2,
            'cle' => 'CHOU|J7|FERTILISATION',
            'difference' => 'ajout',
            'valeurs_importees' => ['tache' => 'Fertilisation'],
        ]);

        $this->actingAs($manager)->post(route('plan-imports.apply', $import))
            ->assertSessionHasErrors('import');
        $this->assertDatabaseCount('plans', 0);
    }

    public function test_csv_template_can_be_downloaded(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('plan-imports.template'))
            ->assertOk()
            ->assertDownload('FKN_modele_import_plan.csv');
    }
}
