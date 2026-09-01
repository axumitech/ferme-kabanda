<?php

namespace App\Http\Controllers;

use App\Models\PlanImport;
use App\Models\PlanImportLigne;
use App\Services\PlanImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlanImportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('plans/imports/index', [
            'imports' => PlanImport::query()->latest()->get()->map(fn (PlanImport $import): array => $this->summary($import)),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('plans/imports/form');
    }

    public function store(Request $request, PlanImportService $service): RedirectResponse
    {
        $data = $request->validate([
            'code_plan' => ['required', 'string', 'max:32'],
            'fichier' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);
        $file = $request->file('fichier');
        $path = $file->store('imports-plans', 'local');
        if ($path === false) {
            throw ValidationException::withMessages([
                'fichier' => "Impossible d'enregistrer le fichier importé.",
            ]);
        }

        try {
            $import = $service->analyser(Storage::disk('local')->path($path), $file->getClientOriginalName(), $data['code_plan']);
        } catch (RuntimeException $exception) {
            Storage::disk('local')->delete($path);
            throw ValidationException::withMessages(['fichier' => $exception->getMessage()]);
        }

        return redirect()->route('plan-imports.show', $import)->with('success', 'Fichier analysé. Arbitrez maintenant chaque écart.');
    }

    public function show(PlanImport $planImport): Response
    {
        $planImport->load(['lignes' => fn ($query) => $query->orderBy('numero_ligne')]);

        return Inertia::render('plans/imports/show', [
            'import' => array_merge($this->summary($planImport), [
                'pending_count' => $planImport->enAttenteDeDecision(),
                'lines' => $planImport->lignes->map(fn (PlanImportLigne $line): array => [
                    'id' => $line->id,
                    'numero_ligne' => $line->numero_ligne,
                    'cle' => $line->cle,
                    'difference' => $line->difference,
                    'current_values' => $line->valeurs_actuelles,
                    'imported_values' => $line->valeurs_importees,
                    'changed_fields' => $line->champs_modifies,
                    'error' => $line->erreur,
                    'accepted' => $line->acceptee,
                    'comment' => $line->commentaire,
                ]),
            ]),
            'canApply' => (int) request()->user()->niveau_hierarchie <= 2,
        ]);
    }

    public function decide(Request $request, PlanImport $planImport, PlanImportLigne $line, PlanImportService $service): RedirectResponse
    {
        abort_unless($line->plan_import_id === $planImport->id, 404);
        $data = $request->validate([
            'accepted' => ['required', 'boolean'],
            'comment' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $service->decider($line, $data['accepted'], $data['comment'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['line' => $exception->getMessage()]);
        }

        return back()->with('success', $data['accepted'] ? 'Écart accepté.' : "Écart refusé — l'existant sera conservé.");
    }

    public function apply(Request $request, PlanImport $planImport, PlanImportService $service): RedirectResponse
    {
        abort_unless((int) $request->user()->niveau_hierarchie <= 2, 403);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        try {
            $plan = $service->appliquer($planImport, $data['note'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['import' => $exception->getMessage()]);
        }

        return back()->with('success', "Plan {$plan->code} v{$plan->version} appliqué et mis en vigueur.");
    }

    public function template(PlanImportService $service): StreamedResponse
    {
        return response()->streamDownload(
            fn () => print $service->modeleCsv(),
            'FKN_modele_import_plan.csv',
            ['Content-Type' => 'text/csv; charset=UTF-8'],
        );
    }

    /** @return array<string, mixed> */
    private function summary(PlanImport $import): array
    {
        return [
            'id' => $import->id,
            'created_at' => $import->created_at?->toIso8601String(),
            'code_plan' => $import->code_plan,
            'fichier' => $import->fichier,
            'statut' => $import->statut,
            'lignes_lues' => $import->lignes_lues,
            'lignes_ajout' => $import->lignes_ajout,
            'lignes_modif' => $import->lignes_modif,
            'lignes_suppr' => $import->lignes_suppr,
            'lignes_identiques' => $import->lignes_identiques,
            'lignes_erreur' => $import->lignes_erreur,
        ];
    }
}
