<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Http\Controllers\Controller;
use App\Models\Departement;
use App\Models\JournalAudit;
use App\Models\MotifNonExecution;
use App\Models\Site;
use App\Models\Tache;
use App\Models\User;
use App\Services\TacheService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OperationController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        $tasks = Tache::query()
            ->with([
                'responsable:id,name',
                'createur:id,name',
                'site:id,code,nom',
                'departement:id,code,nom',
                'motif:id,code,libelle,recevable',
                'evenements' => fn ($query) => $query->latest('created_at')->limit(3),
            ])
            ->where('est_modele', false)
            ->orderByRaw(
                'case when statut = ? and date_due < ? then 0 when statut = ? then 1 else 2 end',
                [StatutTache::AFaire->value, today()->toDateString(), StatutTache::AFaire->value]
            )
            ->orderBy('date_due')
            ->latest('updated_at')
            ->limit(120)
            ->get();
        $taskStats = Tache::query()
            ->where('est_modele', false)
            ->toBase()
            ->selectRaw('sum(case when date(date_due) = ? then 1 else 0 end) as today_count', [today()->toDateString()])
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as open_count', [StatutTache::AFaire->value])
            ->selectRaw('sum(case when statut = ? and date(date_due) < ? then 1 else 0 end) as late_count', [StatutTache::AFaire->value, today()->toDateString()])
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as done_count', [StatutTache::Faite->value])
            ->selectRaw('sum(case when dde_reference is not null then 1 else 0 end) as disciplinary_count')
            ->first();

        return Inertia::render('admin/operations', [
            'tasks' => $tasks,
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'departements' => Departement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'motifs' => MotifNonExecution::query()->where('actif', true)->orderBy('ordre')->orderBy('libelle')->get(),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name']),
            'audit' => JournalAudit::query()
                ->with('auteur:id,name')
                ->latest('created_at')
                ->limit(40)
                ->get(),
            'stats' => [
                'today' => (int) $taskStats->today_count,
                'open' => (int) $taskStats->open_count,
                'late' => (int) $taskStats->late_count,
                'done' => (int) $taskStats->done_count,
                'disciplinary' => (int) $taskStats->disciplinary_count,
            ],
            'options' => [
                'sources' => collect(SourceTache::cases())->map(fn (SourceTache $source): array => [
                    'value' => $source->value,
                    'label' => str($source->value)->replace('_', ' ')->headline()->toString(),
                ])->values(),
                'priorities' => collect(Priorite::cases())->map(fn (Priorite $priorite): array => [
                    'value' => $priorite->value,
                    'label' => $priorite->libelle(),
                ])->values(),
                'statuses' => collect(StatutTache::cases())->map(fn (StatutTache $statut): array => [
                    'value' => $statut->value,
                    'label' => str($statut->value)->replace('_', ' ')->headline()->toString(),
                ])->values(),
            ],
        ]);
    }

    public function store(Request $request, TacheService $service): RedirectResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'source' => ['required', Rule::enum(SourceTache::class)],
            'titre' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:2000'],
            'instruction' => ['nullable', 'string', 'max:2000'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'departement_id' => ['nullable', 'integer', 'exists:departements,id'],
            'lieu' => ['nullable', 'string', 'max:180'],
            'responsable_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_due' => ['required', 'date_format:Y-m-d'],
            'heure_due' => ['nullable', 'date_format:H:i'],
            'priorite' => ['required', Rule::enum(Priorite::class)],
        ]);

        $service->creer($data);

        return back()->with('success', 'Tâche opérationnelle créée.');
    }

    public function complete(Request $request, Tache $tache, TacheService $service): RedirectResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:40'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->marquerFaite($tache, $data);

        return back()->with('success', 'Tâche marquée comme faite.');
    }

    public function justify(Request $request, Tache $tache, TacheService $service): RedirectResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'motif_id' => ['required', 'integer', 'exists:motifs_non_execution,id'],
            'motif_precision' => ['nullable', 'string', 'max:180'],
        ]);

        $motif = MotifNonExecution::query()->whereKey((int) $data['motif_id'])->firstOrFail();
        $service->justifier($tache, $motif, $data['motif_precision'] ?? null);

        return back()->with('success', 'Non-exécution justifiée.');
    }

    public function close(Request $request, TacheService $service): RedirectResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'site_id' => ['required', 'integer', 'exists:sites,id'],
            'departement_id' => ['required', 'integer', 'exists:departements,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'observation' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->cloturer(
            siteId: (int) $data['site_id'],
            departementId: (int) $data['departement_id'],
            date: Carbon::parse($data['date']),
            observation: $data['observation'] ?? null,
        );

        return back()->with('success', 'Journée clôturée et verrouillée.');
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
