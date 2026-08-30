<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CategorieIncident;
use App\Models\Culture;
use App\Models\Incident;
use App\Models\Plan;
use App\Models\Plantation;
use App\Models\Requisition;
use App\Models\Site;
use App\Models\Unite;
use App\Models\User;
use App\Services\IncidentService;
use App\Services\PlantationService;
use App\Services\RequisitionService;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
            ->with(['categorie:id,code,libelle', 'actions.tache:id,reference,statut'])
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
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name', 'niveau_hierarchie']),
            'unites' => Unite::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'incidentCategories' => CategorieIncident::query()->orderBy('gravite')->get(['id', 'code', 'libelle', 'nature']),
            'visibility' => [
                'requisitionAmounts' => $voitMontantsRequisitions,
                'incidentCosts' => $voitCoutsIncidents,
                'incidentsSurete' => $voitIncidentsSurete,
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

    public function declareIncident(Request $request, IncidentService $service, VisibiliteService $visibilite): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['nature' => ['required', 'in:securite,surete,environnement'], 'survenu_le' => ['required', 'date'], 'description' => ['required', 'string', 'max:5000'], 'site_id' => ['nullable', 'exists:sites,id'], 'lieu' => ['nullable', 'string', 'max:180'], 'departement_id' => ['nullable', 'exists:departements,id'], 'cout_estime' => ['nullable', 'numeric', 'min:0'], 'actions_immediates' => ['nullable', 'string', 'max:2000']]);
        if (! $visibilite->peutVoir($request->user(), 'couts_incidents')) {
            unset($data['cout_estime']);
        }
        if ($data['nature'] === 'surete') {
            $this->ensureSurete($request, $visibilite);
        }
        $service->declarer($data);

        return back()->with('success', 'Incident déclaré avec ses échéances de procédure.');
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
}
