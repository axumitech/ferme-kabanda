<?php

namespace App\Http\Controllers;

use App\Models\DocumentReference;
use App\Models\SectionReference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentReferenceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('documents-reference/index', [
            'documents' => DocumentReference::query()
                ->withCount('sections')
                ->orderBy('code')
                ->get()
                ->map(fn (DocumentReference $document): array => $this->payload($document)),
            'types' => DocumentReference::TYPES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('documents-reference/form', [
            'types' => DocumentReference::TYPES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/', 'unique:documents_reference,code'],
            'titre' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(array_keys(DocumentReference::TYPES))],
            'version' => ['nullable', 'string', 'max:16'],
            'date_version' => ['nullable', 'date'],
            'fichier' => ['nullable', 'file', 'mimetypes:application/pdf', 'max:20480'],
            'actif' => ['required', 'boolean'],
            'create_another' => ['nullable', 'boolean'],
        ]);
        $fichier = $request->file('fichier');
        $chemin = $fichier?->store('politiques', 'public');

        $document = DocumentReference::query()->create([
            'code' => mb_strtoupper(trim($data['code'])),
            'titre' => trim($data['titre']),
            'type' => $data['type'],
            'version' => filled($data['version'] ?? null) ? trim($data['version']) : null,
            'date_version' => $data['date_version'] ?? null,
            'fichier' => $chemin ?: null,
            'actif' => $data['actif'],
        ]);

        if ($request->boolean('create_another')) {
            return redirect()->route('documents-reference.create')->with('success', "Document {$document->code} créé. Vous pouvez en ajouter un autre.");
        }

        return redirect()->route('documents-reference.show', $document)->with('success', "Document {$document->code} créé.");
    }

    public function show(DocumentReference $documentReference): Response
    {
        $documentReference->load('sections');

        return Inertia::render('documents-reference/show', [
            'document' => array_merge($this->payload($documentReference), [
                'sections' => $documentReference->sections->map(fn (SectionReference $section): array => [
                    'id' => $section->id,
                    'ancre' => $section->ancre,
                    'titre' => $section->titre,
                    'texte' => $section->texte,
                    'page' => $section->page,
                ])->values(),
            ]),
            'types' => DocumentReference::TYPES,
        ]);
    }

    public function download(DocumentReference $documentReference): StreamedResponse
    {
        abort_unless($documentReference->fichier && Storage::disk('public')->exists($documentReference->fichier), 404);

        return Storage::disk('public')->download(
            $documentReference->fichier,
            "{$documentReference->code}.pdf",
            ['Content-Type' => 'application/pdf'],
        );
    }

    /** @return array<string, mixed> */
    private function payload(DocumentReference $document): array
    {
        return [
            'id' => $document->id,
            'code' => $document->code,
            'titre' => $document->titre,
            'type' => $document->type,
            'version' => $document->version,
            'date_version' => $document->date_version?->toDateString(),
            'fichier' => $document->fichier,
            'actif' => $document->actif,
            'sections_count' => $document->sections_count ?? $document->sections()->count(),
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }
}
