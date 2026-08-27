<?php

namespace App\Http\Controllers;

use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\MotifNonExecution;
use App\Models\Tache;
use App\Services\TacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyDayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tasks = Tache::query()
            ->with(['site:id,code,nom', 'departement:id,code,nom', 'motif:id,code,libelle,recevable', 'evenements'])
            ->where('est_modele', false)
            ->where(function ($query) use ($user): void {
                $query->where('responsable_id', $user?->id)
                    ->orWhereNull('responsable_id');
            })
            ->whereDate('date_due', '<=', today())
            ->orderByRaw("case when statut = 'a_faire' and date_due < ? then 0 when statut = 'a_faire' then 1 else 2 end", [today()->toDateString()])
            ->orderBy('date_due')
            ->latest('updated_at')
            ->limit(80)
            ->get();

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

        return $user !== null && ($user->is_admin || $tache->responsable_id === $user->id || $tache->responsable_id === null);
    }
}
