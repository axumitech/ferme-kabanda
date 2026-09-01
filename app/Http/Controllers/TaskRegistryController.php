<?php

namespace App\Http\Controllers;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Models\Departement;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Plantation;
use App\Models\Site;
use App\Models\Tache;
use App\Models\Unite;
use App\Models\User;
use App\Services\ApprobationTacheService;
use App\Services\TacheService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TaskRegistryController extends Controller
{
    /** @var list<string> */
    private const STATUTS_OT_OUVERTS = ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'];

    public function create(): Response
    {
        return Inertia::render('tasks/form', [
            'mode' => 'create',
            'task' => null,
            'options' => $this->formOptions(),
        ]);
    }

    public function store(Request $request, TacheService $taches, ApprobationTacheService $approbation): RedirectResponse
    {
        $data = $this->validatedForm($request, true);
        $appuis = Arr::pull($data, 'appui_ids', []);
        $informes = Arr::pull($data, 'informe_ids', []);
        $justification = Arr::pull($data, 'justification_demande');
        $cout = Arr::pull($data, 'cout_estime');
        $niveau = (int) ($request->user()->niveau_hierarchie ?? 4);

        $tache = DB::transaction(function () use ($data, $appuis, $informes, $justification, $cout, $niveau, $taches, $approbation): Tache {
            if ($niveau <= 2) {
                $tache = $taches->creer(array_merge($data, [
                    'statut_approbation' => ApprobationTacheService::APPROUVEE,
                    'approuve_par_id' => auth()->id(),
                    'approuve_le' => now(),
                ]));
            } else {
                $tache = $approbation->proposer($data, $taches);
                $approbation->soumettre($tache, (string) $justification, $cout !== null ? (float) $cout : null);
            }

            $taches->definirIntervenants($tache, (int) $data['responsable_id'], $appuis, $informes);

            return $tache;
        });

        if ($request->boolean('_create_another')) {
            return redirect()->route('task-registry.create')->with('success', 'Tâche créée. Vous pouvez en créer une autre.');
        }

        return redirect()->route('task-registry.show', $tache)->with('success', 'Tâche créée.');
    }

    public function show(Request $request, Tache $tache): Response
    {
        $tache->load([
            'responsable:id,name',
            'departement:id,code,nom',
            'site:id,code,nom',
            'plantation.culture:id,nom',
            'motif:id,code,libelle,recevable',
            'intervenants.user:id,name',
            'evenements',
        ]);

        return Inertia::render('tasks/show', [
            'task' => $tache,
            'canAct' => $this->canUseTask($request, $tache),
            'motifs' => $this->motifs(),
            'openWorkOrders' => $this->openWorkOrders(),
            'units' => $this->units(),
        ]);
    }

    public function edit(Tache $tache): Response
    {
        $tache->load('intervenants');

        return Inertia::render('tasks/form', [
            'mode' => 'edit',
            'task' => array_merge($tache->toArray(), [
                'appui_ids' => $tache->intervenants->where('role', 'appui')->pluck('user_id')->values(),
                'informe_ids' => $tache->intervenants->where('role', 'informe')->pluck('user_id')->values(),
            ]),
            'options' => $this->formOptions(),
        ]);
    }

    public function update(Request $request, Tache $tache, TacheService $taches): RedirectResponse
    {
        $data = $this->validatedForm($request, false);
        $appuis = Arr::pull($data, 'appui_ids', []);
        $informes = Arr::pull($data, 'informe_ids', []);
        unset($data['source']);
        unset($data['justification_demande'], $data['cout_estime']);

        DB::transaction(function () use ($tache, $data, $appuis, $informes, $taches): void {
            $tache->update($data);
            $taches->definirIntervenants($tache, (int) $data['responsable_id'], $appuis, $informes);
            $tache->journaliserEvenement('modifiee', 'Tâche modifiée');
        });

        return redirect()->route('task-registry.show', $tache)->with('success', 'Tâche modifiée.');
    }

    public function complete(Request $request, Tache $tache, TacheService $service): RedirectResponse
    {
        abort_unless($this->canUseTask($request, $tache), 403);
        $data = $request->validate([
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:40'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('photo')) {
            $data['photo_chemin'] = $request->file('photo')->store('preuves', 'public');
        }
        unset($data['photo']);
        $service->marquerFaite($tache, array_filter($data, fn ($value): bool => $value !== null && $value !== ''));

        return back()->with('success', "Tâche {$tache->reference} exécutée.");
    }

    public function justify(Request $request, Tache $tache, TacheService $service): RedirectResponse
    {
        abort_unless($this->canUseTask($request, $tache), 403);
        $data = $request->validate([
            'motif_id' => ['required', 'integer', Rule::exists('motifs_non_execution', 'id')->where('actif', true)],
            'ordre_travail_id' => ['nullable', 'integer', Rule::exists('ordres_travail', 'id')->where(fn ($query) => $query->whereIn('statut', self::STATUTS_OT_OUVERTS))],
            'precision' => ['nullable', 'string', 'max:180'],
        ]);
        $motif = MotifNonExecution::query()->whereKey((int) $data['motif_id'])->where('actif', true)->firstOrFail();
        $ordre = isset($data['ordre_travail_id'])
            ? OrdreTravail::query()->whereKey((int) $data['ordre_travail_id'])->first()
            : null;
        $precision = trim(($ordre?->reference ? $ordre->reference.' ' : '').($data['precision'] ?? ''));

        DB::transaction(function () use ($tache, $ordre, $service, $motif, $precision): void {
            if ($ordre) {
                $tache->forceFill(['ordre_travail_id' => $ordre->id])->saveQuietly();
            }
            $service->justifier($tache, $motif, $precision !== '' ? $precision : null);
        });

        return back()->with('success', 'Justification enregistrée.');
    }

    /** @return array<string, mixed> */
    private function validatedForm(Request $request, bool $creating): array
    {
        $niveau = (int) ($request->user()->niveau_hierarchie ?? 4);

        return $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'instruction' => ['nullable', 'string', 'max:2000'],
            'departement_id' => ['required', 'integer', Rule::exists('departements', 'id')->where('actif', true)],
            'site_id' => ['nullable', 'integer', Rule::exists('sites', 'id')->where('actif', true)],
            'lieu' => ['nullable', 'string', 'max:180'],
            'plantation_id' => ['nullable', 'integer', 'exists:plantations,id'],
            'date_due' => ['required', 'date_format:Y-m-d'],
            'heure_due' => ['nullable', 'date_format:H:i'],
            'priorite' => ['required', Rule::enum(Priorite::class)],
            'source' => [$creating ? 'required' : 'nullable', Rule::enum(SourceTache::class)],
            'responsable_id' => ['required', 'integer', Rule::exists('users', 'id')->where('actif', true)],
            'appui_ids' => ['array'],
            'appui_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'informe_ids' => ['array'],
            'informe_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'justification_demande' => [$creating && $niveau >= 3 ? 'required' : 'nullable', 'string', 'max:2000'],
            'cout_estime' => ['nullable', 'numeric', 'min:0'],
        ]);
    }

    /** @return array<string, mixed> */
    private function formOptions(): array
    {
        return [
            'departments' => Departement::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
            'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
            'plantations' => Plantation::query()->with('culture:id,nom')->where('statut', 'active')->orderBy('reference')->get(['id', 'reference', 'culture_id', 'lieu']),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name']),
            'priorities' => collect(Priorite::cases())->map(fn (Priorite $priority): array => [
                'value' => $priority->value,
                'label' => match ($priority) {
                    Priorite::Urgente => 'URGENT — arrêt de production',
                    Priorite::Elevee => 'Élevé — sous 48 h',
                    Priorite::Normale => 'Normal — sous 7 jours',
                    Priorite::Planifiee => 'Planifié',
                },
            ]),
            'sources' => collect(SourceTache::cases())->map(fn (SourceTache $source): array => ['value' => $source->value, 'label' => $this->sourceLabel($source)]),
        ];
    }

    /** @return Collection<int, MotifNonExecution> */
    private function motifs(): Collection
    {
        return MotifNonExecution::query()->where('actif', true)->orderBy('ordre')->orderBy('libelle')->get();
    }

    /** @return Collection<int, OrdreTravail> */
    private function openWorkOrders(): Collection
    {
        return OrdreTravail::query()->whereIn('statut', self::STATUTS_OT_OUVERTS)->orderByDesc('demande_le')->limit(50)->get(['id', 'reference', 'objet']);
    }

    /** @return Collection<int, Unite> */
    private function units(): Collection
    {
        return Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']);
    }

    private function canUseTask(Request $request, Tache $tache): bool
    {
        $user = $request->user();

        return $user !== null && ($user->is_admin || $tache->responsable_id === $user->id || $tache->intervenants()->where('user_id', $user->id)->exists() || $tache->responsable_id === null);
    }

    private function sourceLabel(SourceTache $source): string
    {
        return match ($source) {
            SourceTache::CalendrierCultural => 'Calendrier cultural',
            SourceTache::Entretien => 'Plan d’entretien',
            SourceTache::Epi => 'Renouvellement EPI',
            SourceTache::Inventaire => 'Seuil de magasin',
            SourceTache::Requisition => 'Réquisition',
            SourceTache::Maternite => 'Maternité',
            SourceTache::Dar => 'Délai avant récolte',
            SourceTache::Smp => 'Plan de sécurité',
            SourceTache::Incident => 'Incident',
            SourceTache::Enquete => 'Enquête',
            SourceTache::Manuelle => 'Créée à la main',
        };
    }
}
