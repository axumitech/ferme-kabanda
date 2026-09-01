<?php

namespace Tests\Feature;

use App\Models\DocumentReference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DocumentReferenceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_reference_document_can_be_created_with_its_pdf(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('documents-reference.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('documents-reference/form')
                ->where('types.politique', 'Politique')
                ->where('types.procedure', 'Procédure')
                ->where('types.fiche_technique', 'Fiche technique')
                ->where('types.manuel', 'Manuel'));

        $response = $this->actingAs($user)->post(route('documents-reference.store'), [
            'code' => 'pol-bta-001',
            'titre' => 'Politique de production agricole',
            'type' => 'politique',
            'version' => '2.1',
            'date_version' => '2026-09-01',
            'fichier' => UploadedFile::fake()->create('politique.pdf', 50, 'application/pdf'),
            'actif' => true,
        ]);

        $document = DocumentReference::query()->firstOrFail();
        $response->assertRedirect(route('documents-reference.show', $document));
        $this->assertSame('POL-BTA-001', $document->code);
        $this->assertTrue($document->actif);
        $this->assertNotNull($document->fichier);
        Storage::disk('public')->assertExists($document->fichier);

        $this->actingAs($user)->get(route('documents-reference.download', $document))
            ->assertOk()
            ->assertDownload('POL-BTA-001.pdf');
    }

    public function test_reference_document_registry_and_details_are_available(): void
    {
        $user = User::factory()->create();
        $document = DocumentReference::query()->create([
            'code' => 'PRO-AGR-004',
            'titre' => "Procédure d'irrigation",
            'type' => 'procedure',
            'actif' => true,
        ]);
        $document->sections()->create([
            'ancre' => '4.1',
            'titre' => 'Contrôle préalable',
            'texte' => "Vérifier la pression avant l'ouverture.",
            'page' => 7,
            'ordre' => 1,
        ]);

        $this->actingAs($user)->get(route('documents-reference.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('documents-reference/index')
                ->has('documents', 1)
                ->where('documents.0.sections_count', 1));

        $this->actingAs($user)->get(route('documents-reference.show', $document))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('documents-reference/show')
                ->where('document.code', 'PRO-AGR-004')
                ->where('document.sections.0.ancre', '4.1'));
    }
}
