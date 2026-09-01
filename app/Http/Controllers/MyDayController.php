<?php

namespace App\Http\Controllers;

use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Tache;
use App\Models\Unite;
use App\Services\ApprobationTacheService;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyDayController extends Controller
{
    /** @var list<string> */
    private const STATUTS_OT_OUVERTS = ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'];

    public function index(Request $request, VisibiliteService $visibilite): Response
    {
        $user = $request->user();

        $tasks = Tache::query()
            ->with(['responsable:id,name', 'site:id,code,nom', 'departement:id,code,nom', 'motif:id,code,libelle,recevable', 'intervenants.user:id,name', 'evenements'])
            ->where('est_modele', false)
            ->whereDate('date_due', '<=', today())
            ->orderByRaw("case when statut = 'a_faire' and date_due < ? then 0 when statut = 'a_faire' then 1 else 2 end", [today()->toDateString()])
            ->orderBy('date_due')
            ->latest('updated_at')
            ->limit(80)
            ->get();

        $voitDossiersDisciplinaires = $user !== null
            && $visibilite->peutVoir($user, 'dossiers_disciplinaires');

        $tasks->each(function (Tache $task) use ($user, $visibilite, $voitDossiersDisciplinaires): void {
            $estIntervenant = $task->intervenants->contains('user_id', $user?->id);
            $task->setAttribute('can_act', $user !== null && $visibilite->peutAgirSurTache(
                $user,
                (int) $task->responsable_id,
                $estIntervenant,
                $task->responsable_id === null,
            ));
            $task->setAttribute('responsable_nom', $task->responsable?->name);
            $task->setAttribute('mon_departement', $user?->departement_id !== null
                && $task->departement_id === $user->departement_id);

            if (! $voitDossiersDisciplinaires) {
                // Le registre opérationnel reste lisible, mais une DDE et son
                // historique RH ne doivent pas suivre la tâche sur les écrans
                // de toute l'équipe.
                $task->makeHidden([
                    'dde_reference',
                    'dde_statut',
                    'dde_valide_par_id',
                    'dde_valide_le',
                    'dde_observation',
                ]);
                $task->setRelation(
                    'evenements',
                    $task->evenements->reject(fn ($event): bool => str_starts_with($event->type, 'dde'))->values(),
                );
            }
        });

        return Inertia::render('my-day', [
            'tasks' => $tasks,
            'motifs' => MotifNonExecution::query()->where('actif', true)->orderBy('ordre')->orderBy('libelle')->get(),
            'openWorkOrders' => $this->openWorkOrders(),
            'units' => Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
            'closures' => ClotureJournaliere::query()
                ->with(['site:id,code,nom', 'departement:id,code,nom'])
                ->whereDate('date', today())
                ->latest('updated_at')
                ->limit(10)
                ->get(),
            'stats' => [
                'assigned' => $tasks->where('responsable_id', $user?->id)->count(),
                'open' => $tasks->where('statut', StatutTache::AFaire)->count(),
                'late' => $tasks->where('statut', StatutTache::AFaire)->where('date_due', '<', today()->toDateString())->count(),
                'doneToday' => Tache::query()
                    ->where('responsable_id', $user?->id)
                    ->where('statut', StatutTache::Faite)
                    ->whereDate('fait_le', today())
                    ->count(),
            ],
            'vueParDefaut' => config('fkn.vue_par_defaut'),
            'canViewDisciplinaryFiles' => $voitDossiersDisciplinaires,
        ]);
    }

    public function complete(Request $request, Tache $tache, TacheService $service): RedirectResponse|JsonResponse
    {
        abort_unless($this->canUseTask($request, $tache), 403);

        $data = $request->validate([
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:40'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->marquerFaite($tache, $data);

        if ($request->expectsJson() || $request->header('X-Offline-Replay')) {
            return response()->json(['ok' => true, 'message' => 'Tâche enregistrée.']);
        }

        return back()->with('success', 'Tâche enregistrée.');
    }

    public function propose(
        Request $request,
        ApprobationTacheService $approbation,
        TacheService $taches,
    ): RedirectResponse {
        $data = $request->validate([
            'titre' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'date_due' => ['required', 'date_format:Y-m-d'],
            'justification' => ['required', 'string', 'max:2000'],
            'cout_estime' => ['nullable', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $data, $approbation, $taches): void {
            $tache = $approbation->proposer([
                'source' => SourceTache::Manuelle,
                'titre' => $data['titre'],
                'description' => $data['description'] ?? null,
                'date_due' => $data['date_due'],
                'responsable_id' => $request->user()?->id,
                'departement_id' => $request->user()?->departement_id,
            ], $taches);

            $approbation->soumettre(
                $tache,
                $data['justification'],
                isset($data['cout_estime']) ? (float) $data['cout_estime'] : null,
            );
        });

        return back()->with('success', 'Proposition soumise — elle sera exécutable après approbation.');
    }

    public function justify(Request $request, Tache $tache, TacheService $service): RedirectResponse|JsonResponse
    {
        abort_unless($this->canUseTask($request, $tache), 403);

        $motifData = $request->validate([
            'motif_id' => [
                'required',
                'integer',
                Rule::exists('motifs_non_execution', 'id')->where('actif', true),
            ],
        ]);
        $motif = MotifNonExecution::query()
            ->whereKey((int) $motifData['motif_id'])
            ->where('actif', true)
            ->firstOrFail();
        $estPanne = mb_strtoupper(trim($motif->code)) === 'PANNE';

        $data = $request->validate([
            'motif_id' => [
                'required',
                'integer',
                Rule::exists('motifs_non_execution', 'id')->where('actif', true),
            ],
            'motif_precision' => ['nullable', 'string', $estPanne ? 'max:150' : 'max:180'],
            'ordre_travail_id' => [
                Rule::requiredIf($estPanne),
                Rule::prohibitedIf(! $estPanne),
                'nullable',
                'integer',
                Rule::exists('ordres_travail', 'id')
                    ->where(fn ($query) => $query->whereIn('statut', self::STATUTS_OT_OUVERTS)),
            ],
        ], [
            'ordre_travail_id.required' => 'Le motif PANNE exige un ordre de travail ouvert.',
            'ordre_travail_id.prohibited' => 'Un ordre de travail ne peut être lié qu’au motif PANNE.',
            'ordre_travail_id.exists' => 'L’ordre de travail sélectionné est introuvable ou n’est plus ouvert.',
        ]);

        $ordre = $estPanne
            ? OrdreTravail::query()
                ->whereKey((int) $data['ordre_travail_id'])
                ->whereIn('statut', self::STATUTS_OT_OUVERTS)
                ->firstOrFail()
            : null;
        $precision = trim(implode(' ', array_filter([
            $ordre?->reference,
            $data['motif_precision'] ?? null,
        ], fn ($value): bool => filled($value))));

        DB::transaction(function () use ($tache, $ordre, $service, $motif, $precision): void {
            if ($ordre) {
                $tache->forceFill(['ordre_travail_id' => $ordre->id])->saveQuietly();
            }

            $service->justifier($tache, $motif, $precision !== '' ? $precision : null);
        });

        if ($request->expectsJson() || $request->header('X-Offline-Replay')) {
            return response()->json(['ok' => true, 'message' => 'Justification enregistrée.']);
        }

        return back()->with('success', 'Justification enregistrée.');
    }

    private function canUseTask(Request $request, Tache $tache): bool
    {
        $user = $request->user();

        return $user !== null && ($user->is_admin || $tache->responsable_id === $user->id || $tache->intervenants()->where('user_id', $user->id)->exists() || $tache->responsable_id === null);
    }

    /** @return Collection<int, OrdreTravail> */
    private function openWorkOrders(): Collection
    {
        return OrdreTravail::query()
            ->whereIn('statut', self::STATUTS_OT_OUVERTS)
            ->orderByDesc('demande_le')
            ->limit(50)
            ->get(['id', 'reference', 'objet', 'cible_libelle', 'statut']);
    }
}
