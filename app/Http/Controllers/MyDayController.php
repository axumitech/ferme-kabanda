<?php

namespace App\Http\Controllers;

use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\MotifNonExecution;
use App\Models\Tache;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyDayController extends Controller
{
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

    public function justify(Request $request, Tache $tache, TacheService $service): RedirectResponse|JsonResponse
    {
        abort_unless($this->canUseTask($request, $tache), 403);

        $data = $request->validate([
            'motif_id' => ['required', 'integer', 'exists:motifs_non_execution,id'],
            'motif_precision' => ['nullable', 'string', 'max:180'],
        ]);

        $motif = MotifNonExecution::query()->whereKey((int) $data['motif_id'])->firstOrFail();
        $service->justifier($tache, $motif, $data['motif_precision'] ?? null);

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
}
