<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategorieIncident;
use App\Models\Culture;
use App\Models\Departement;
use App\Models\Incident;
use App\Models\Plan;
use App\Models\Plantation;
use App\Models\Requisition;
use App\Models\Site;
use App\Models\Unite;
use App\Models\User;
use App\Services\IncidentService;
use App\Services\OrdreTravailService;
use App\Services\PlantationService;
use App\Services\RequisitionService;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ProcessController extends Controller
{
    public function index(Request $request, VisibiliteService $visibilite): Response
    {
        $this->admin($request);
        $user = $request->user();
        $voitMontantsRequisitions = $user !== null && $visibilite->peutVoir($user, 'requisitions_autres');
        $voitIncidentsSurete = $user !== null && $visibilite->peutVoir($user, 'incidents_surete');
        $voitCoutsIncidents = $user !== null && $visibilite->peutVoir($user, 'couts_incidents');

        $requisitions = Requisition::query()
            ->with(['article:id,code,libelle', 'tacheService:id,reference,statut'])
            ->latest()
            ->limit(50)
            ->get();
        if (! $voitMontantsRequisitions) {
            $requisitions->each(fn (Requisition $requisition) => $requisition->makeHidden([
                'montant',
                'valeur',
                'niveau_requis',
            ]));
        }

        $incidents = Incident::query()
            ->with([
                'categorie:id,code,libelle',
                'categorieFinale:id,code,libelle',
                'site:id,code,nom',
                'departement:id,code,nom',
                'actions.responsable:id,name',
                'actions.tache:id,reference,statut',
                'ordresTravail:id,reference,statut,incident_id',
            ])
            ->when(! $voitIncidentsSurete, fn ($query) => $query->where('nature', '!=', 'surete'))
            ->latest('survenu_le')
            ->limit(50)
            ->get();
        if (! $voitCoutsIncidents) {
            $incidents->each(fn (Incident $incident) => $incident->makeHidden('cout_estime'));
        }

        return Inertia::render('admin/processes', [
            'cultures' => Culture::query()->where('actif', true)->orderBy('nom')->get(),
            'plantations' => Plantation::query()->with('culture:id,nom')->latest('j0')->limit(50)->get(),
            'requisitions' => $requisitions,
            'incidents' => $incidents,
            'plans' => Plan::query()->withCount('lignes')->latest('date_effet')->limit(20)->get(),
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'departments' => Departement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name', 'niveau_hierarchie']),
            'unites' => Unite::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'incidentCategories' => CategorieIncident::query()->orderBy('gravite')->get(['id', 'code', 'libelle', 'nature']),
            'visibility' => [
                'requisitionAmounts' => $voitMontantsRequisitions,
                'incidentCosts' => $voitCoutsIncidents,
                'incidentsSurete' => $voitIncidentsSurete,
                'canCloseIncidents' => (int) ($user->niveau_hierarchie ?? 4) <= 2,
            ],
        ]);
    }

    public function plant(Request $request, PlantationService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['culture_id' => ['required', 'exists:cultures,id'], 'site_id' => ['nullable', 'exists:sites,id'], 'lieu' => ['required', 'string', 'max:180'], 'j0' => ['required', 'date'], 'quantite' => ['nullable', 'numeric', 'min:0'], 'unite' => ['nullable', 'string', 'max:24'], 'forcer_rotation' => ['nullable', 'boolean'], 'note' => ['nullable', 'string', 'max:1000']]);
        $service->planter($data);

        return back()->with('success', 'Plantation créée et tracée.');
    }

    public function harvest(Request $request, Plantation $plantation, PlantationService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['date' => ['required', 'date'], 'quantite' => ['required', 'numeric', 'gt:0'], 'unite' => ['nullable', 'string', 'max:24'], 'qualite' => ['nullable', 'string', 'max:24'], 'canal_commercial' => ['required', 'string', 'max:48'], 'pertes' => ['nullable', 'numeric', 'min:0'], 'valeur' => ['nullable', 'numeric', 'min:0']]);
        if (! $visibilite->peutVoir($request->user(), 'montants_ventes')) {
            unset($data['valeur']);
        }
        $service->recolter($plantation, $data);

        return back()->with('success', 'Récolte enregistrée avec sa destination.');
    }

    public function requestStock(Request $request, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['type' => ['required', 'in:STK,CSH,NEW'], 'objet' => ['required', 'string', 'max:180'], 'montant' => ['nullable', 'numeric', 'min:0'], 'site_id' => ['nullable', 'exists:sites,id'], 'departement_id' => ['nullable', 'exists:departements,id']]);
        $service->creer($data);

        return back()->with('success', 'Réquisition soumise au circuit de validation.');
    }

    public function createIncident(Request $request, VisibiliteService $visibilite): Response
    {
        $this->admin($request);
        $user = $request->user();

        return Inertia::render('incidents/form', [
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'departments' => Departement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'currentDateTime' => now()->format('Y-m-d\TH:i'),
            'visibility' => [
                'incidentCosts' => $user !== null && $visibilite->peutVoir($user, 'couts_incidents'),
                'incidentsSurete' => $user !== null && $visibilite->peutVoir($user, 'incidents_surete'),
            ],
        ]);
    }

    public function verify(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $service->verifier($requisition);

        return back()->with('success', 'Réquisition vérifiée.');
    }

    public function approve(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $service->approuver($requisition);

        return back()->with('success', 'Réquisition approuvée : tâche magasin créée.');
    }

    public function serve(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $service->servir($requisition);

        return back()->with('success', 'Réquisition servie et mouvement de stock enregistré.');
    }

    public function declareIncident(Request $request, IncidentService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['nature' => ['required', 'in:securite,surete,environnement'], 'survenu_le' => ['required', 'date'], 'description' => ['required', 'string', 'max:5000'], 'site_id' => ['nullable', 'exists:sites,id'], 'lieu' => ['nullable', 'string', 'max:180'], 'departement_id' => ['nullable', 'exists:departements,id'], 'cout_estime' => ['nullable', 'numeric', 'min:0'], 'actions_immediates' => ['nullable', 'string', 'max:2000'], 'temoins' => ['nullable', 'string', 'max:2000'], 'personnes_impliquees' => ['nullable', 'string', 'max:255'], 'tiers_implique' => ['nullable', 'boolean']]);
        $service->declarer($data);

        return redirect()
            ->route($request->boolean('_create_another') ? 'incidents.create' : 'admin.processes.index', $request->boolean('_create_another') ? [] : ['tab' => 'incidents'])
            ->with('success', 'Incident déclaré avec ses échéances de procédure.');
    }

    public function classifyIncident(Request $request, Incident $incident, IncidentService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->authorizeIncident($request, $incident, $visibilite);
        $data = $request->validate([
            'codes' => ['required', 'array', 'min:1'],
            'codes.*' => ['required', 'string', 'exists:categories_incident,code'],
            'finale' => ['nullable', 'boolean'],
        ]);
        $service->classifier($incident, $data['codes'], (bool) ($data['finale'] ?? false));

        return back()->with('success', "Classification enregistrée — l'issue réelle la plus grave est retenue.");
    }

    public function recordIncidentRootCauses(Request $request, Incident $incident, IncidentService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->authorizeIncident($request, $incident, $visibilite);
        $data = $request->validate([
            'p1' => ['required', 'string', 'max:500'],
            'p2' => ['required', 'string', 'max:500'],
            'p3' => ['required', 'string', 'max:500'],
            'p4' => ['required', 'string', 'max:500'],
            'p5' => ['required', 'string', 'max:500'],
            'cause_racine' => ['required', 'string', 'max:2000'],
            'facteurs' => ['nullable', 'string', 'max:2000'],
        ]);
        $service->enregistrerCausesRacines(
            $incident,
            [$data['p1'], $data['p2'], $data['p3'], $data['p4'], $data['p5']],
            $data['cause_racine'],
            $data['facteurs'] ?? null,
        );

        return back()->with('success', 'Les cinq pourquoi et la cause racine sont enregistrés.');
    }

    public function addIncidentAction(Request $request, Incident $incident, IncidentService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->admin($request);
        if ($incident->nature === 'surete') {
            $this->ensureSurete($request, $visibilite);
        }
        $data = $request->validate(['action' => ['required', 'string', 'max:2000'], 'responsable_id' => ['required', 'exists:users,id'], 'echeance' => ['required', 'date'], 'type' => ['required', 'in:corrective,preventive']]);
        $service->ajouterAction($incident, $data, app(TacheService::class));

        return back()->with('success', 'Action CAPA créée comme tâche opérationnelle.');
    }

    public function openIncidentWorkOrder(
        Request $request,
        Incident $incident,
        OrdreTravailService $service,
        VisibiliteService $visibilite,
    ): RedirectResponse {
        $this->admin($request);
        if ($incident->nature === 'surete') {
            $this->ensureSurete($request, $visibilite);
        }
        if ($incident->statut === 'cloture') {
            throw ValidationException::withMessages([
                'incident' => 'Un incident clôturé ne peut plus ouvrir un ordre de travail.',
            ]);
        }

        $data = $request->validate([
            'objet' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'max:5000'],
            'priorite' => ['required', 'in:normale,elevee,urgente'],
            'echeance' => ['nullable', 'date'],
        ]);

        $service->demander(array_merge($data, [
            'origine' => 'incident',
            'type_intervention' => 'correctif',
            'incident_id' => $incident->id,
            'site_id' => $incident->site_id,
        ]));

        return back()->with('success', "Ordre de travail ouvert et rattaché à {$incident->reference}.");
    }

    public function closeIncident(Request $request, Incident $incident, IncidentService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->authorizeIncident($request, $incident, $visibilite);

        try {
            $service->cloturer($incident);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['incident' => $exception->getMessage()]);
        }

        return back()->with('success', "{$incident->reference} est clôturé.");
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }

    private function ensureSurete(Request $request, VisibiliteService $visibilite): void
    {
        abort_unless(
            $request->user() !== null && $visibilite->peutVoir($request->user(), 'incidents_surete'),
            403,
        );
    }

    private function authorizeIncident(Request $request, Incident $incident, VisibiliteService $visibilite): void
    {
        $this->admin($request);
        abort_if($incident->statut === 'cloture', 422, 'Cet incident est déjà clôturé.');

        if ($incident->nature === 'surete') {
            $this->ensureSurete($request, $visibilite);
        }
    }
}
