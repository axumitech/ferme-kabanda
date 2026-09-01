<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Http\Controllers\Controller;
use App\Models\Departement;
use App\Models\JournalAudit;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Site;
use App\Models\Tache;
use App\Models\User;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OperationController extends Controller
{
    /** @var list<string> */
    private const STATUTS_OT_OUVERTS = ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'];

    public function index(Request $request, VisibiliteService $visibilite): Response
    {
        $this->ensureAdmin($request);
        $user = $request->user();
        $voitDossiersDisciplinaires = $user !== null && $visibilite->peutVoir($user, 'dossiers_disciplinaires');
        $voitAudit = $user !== null && $visibilite->peutVoir($user, 'journal_audit');

        $tasks = Tache::query()
            ->with([
                'responsable:id,name',
                'createur:id,name',
                'site:id,code,nom',
                'departement:id,code,nom',
                'motif:id,code,libelle,recevable',
                'intervenants.user:id,name',
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
        if (! $voitDossiersDisciplinaires) {
            $tasks->each(function (Tache $task): void {
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
            });
        }
        $taskStats = Tache::query()
            ->where('est_modele', false)
            ->toBase()
            ->selectRaw('sum(case when date(date_due) = ? then 1 else 0 end) as today_count', [today()->toDateString()])
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as open_count', [StatutTache::AFaire->value])
            ->selectRaw('sum(case when statut = ? and date(date_due) < ? then 1 else 0 end) as late_count', [StatutTache::AFaire->value, today()->toDateString()])
            ->selectRaw('sum(case when statut = ? then 1 else 0 end) as done_count', [StatutTache::Faite->value])
            ->when(
                $voitDossiersDisciplinaires,
                fn ($query) => $query->selectRaw('sum(case when dde_reference is not null then 1 else 0 end) as disciplinary_count'),
            )
            ->first();

        return Inertia::render('admin/operations', [
            'tasks' => $tasks,
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'departements' => Departement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'motifs' => MotifNonExecution::query()->where('actif', true)->orderBy('ordre')->orderBy('libelle')->get(),
            'openWorkOrders' => $this->openWorkOrders(),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name', 'niveau_hierarchie']),
            'audit' => $voitAudit
                ? JournalAudit::query()
                    ->select(['id', 'action', 'user_nom', 'resume', 'created_at'])
                    ->latest('created_at')
                    ->limit(40)
                    ->get()
                : [],
            'stats' => [
                'today' => (int) $taskStats->today_count,
                'open' => (int) $taskStats->open_count,
                'late' => (int) $taskStats->late_count,
                'done' => (int) $taskStats->done_count,
                'disciplinary' => $voitDossiersDisciplinaires ? (int) $taskStats->disciplinary_count : null,
            ],
            'visibility' => [
                'dossiersDisciplinaires' => $voitDossiersDisciplinaires,
                'journalAudit' => $voitAudit,
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
            'appui_ids' => ['array'],
            'appui_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'informe_ids' => ['array'],
            'informe_ids.*' => ['integer', 'distinct', 'exists:users,id'],
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

        return back()->with('success', 'Non-exécution justifiée.');
    }

    public function validateDde(Request $request, Tache $tache, TacheService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->ensureAdmin($request);
        $this->ensureDossierDisciplinaire($request, $visibilite);
        $data = $request->validate(['observation' => ['nullable', 'string', 'max:180']]);
        $service->validerDossierDisciplinaire($tache, $request->user(), $data['observation'] ?? null);

        return back()->with('success', 'Dossier disciplinaire confirmé et référencé.');
    }

    public function requalifyDde(Request $request, Tache $tache, TacheService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->ensureAdmin($request);
        $this->ensureDossierDisciplinaire($request, $visibilite);
        $data = $request->validate(['observation' => ['required', 'string', 'max:180']]);
        $service->requalifierDossierDisciplinaire($tache, $request->user(), $data['observation']);

        return back()->with('success', 'Dossier requalifié en justification recevable.');
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

    private function ensureDossierDisciplinaire(Request $request, VisibiliteService $visibilite): void
    {
        abort_unless(
            $request->user() !== null && $visibilite->peutVoir($request->user(), 'dossiers_disciplinaires'),
            403,
        );
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
