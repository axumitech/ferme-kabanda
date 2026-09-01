<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\InspectionInfrastructure;
use App\Models\InterventionEquipement;
use App\Models\OrdreTravail;
use App\Models\ReferenceItem;
use App\Models\Site;
use App\Models\TravailEquipement;
use App\Models\Unite;
use App\Models\User;
use App\Services\EquipementService;
use App\Services\MaintenanceService;
use App\Services\OrdreTravailService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class MaintenanceController extends Controller
{
    public function index(Request $request, MaintenanceService $maintenance): Response
    {
        $canManage = $this->canManage($request);
        $orderStatus = (string) $request->query('statut', 'open');
        $orderNature = (string) $request->query('nature', 'all');
        $orderPriority = (string) $request->query('priorite', 'all');
        $orderSearch = trim((string) $request->query('q', ''));
        $requestedOrderId = max(0, (int) $request->query('order', 0));

        if ($orderStatus !== 'open' && $orderStatus !== 'all' && ! array_key_exists($orderStatus, OrdreTravail::STATUTS)) {
            $orderStatus = 'open';
        }
        if ($orderNature !== 'all' && ! array_key_exists($orderNature, OrdreTravail::TYPES)) {
            $orderNature = 'all';
        }
        if ($orderPriority !== 'all' && ! in_array($orderPriority, ['basse', 'normale', 'elevee', 'urgente'], true)) {
            $orderPriority = 'all';
        }

        $ordersPage = OrdreTravail::query()
            ->with([
                'cible',
                'site:id,code,nom',
                'demandeur:id,name',
                'responsable:id,name',
                'pieces.article:id,code,libelle',
                'pointages.utilisateur:id,name',
                'evenements',
            ])
            ->when($requestedOrderId > 0, fn ($query) => $query->whereKey($requestedOrderId))
            ->when(
                $orderStatus === 'open',
                fn ($query) => $query->whereNotIn('statut', ['clos', 'refuse', 'annule']),
            )
            ->when(
                array_key_exists($orderStatus, OrdreTravail::STATUTS),
                fn ($query) => $query->where('statut', $orderStatus),
            )
            ->when(
                array_key_exists($orderNature, OrdreTravail::TYPES),
                fn ($query) => $query->where('type_intervention', $orderNature),
            )
            ->when(
                $orderPriority !== 'all',
                fn ($query) => $query->where('priorite', $orderPriority),
            )
            ->when($orderSearch !== '', function ($query) use ($orderSearch): void {
                $needle = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $orderSearch).'%';

                $query->where(function ($query) use ($needle): void {
                    $query->where('reference', 'like', $needle)
                        ->orWhere('objet', 'like', $needle)
                        ->orWhere('cible_libelle', 'like', $needle)
                        ->orWhere('demandeur_nom', 'like', $needle);
                });
            })
            ->orderByRaw("case when statut in ('demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie') then 0 else 1 end")
            ->orderByDesc('demande_le')
            ->paginate(50)
            ->withQueryString();
        $orders = $ordersPage->getCollection()
            ->map(fn (OrdreTravail $order): array => $this->orderPayload($order, $canManage))
            ->values();

        $equipment = Equipement::query()
            ->with([
                'site:id,code,nom',
                'responsable:id,name',
                'entretiens',
                'travaux.parcelle:id,label',
                'interventions.entretien:id,libelle',
            ])
            ->withCount([
                'ordresTravail as open_orders_count' => fn ($query) => $query->whereNotIn('statut', ['clos', 'refuse', 'annule']),
            ])
            ->orderByDesc('actif')
            ->orderBy('code')
            ->get()
            ->map(function (Equipement $item) use ($canManage): array {
                $due = $item->entretiensDus();

                return [
                    ...$item->only([
                        'id', 'code', 'nom', 'categorie', 'marque', 'modele', 'immatriculation',
                        'numero_serie', 'annee', 'acquis_le', 'type_compteur',
                        'compteur_actuel', 'carburant', 'capacite_reservoir', 'consommation_ref',
                        'site_id', 'responsable_id', 'statut', 'motif_immobilisation', 'note', 'actif',
                        ...($canManage ? ['valeur_acquisition', 'tarif_horaire', 'tarif_hectare'] : []),
                    ]),
                    'site' => $item->site?->only(['id', 'code', 'nom']),
                    'responsable' => $item->responsable?->only(['id', 'name']),
                    'counter_label' => $item->type_compteur === 'aucun'
                        ? '—'
                        : number_format((float) $item->compteur_actuel, 1, ',', ' ').' '.$item->uniteCompteur(),
                    'maintenance_due' => $due->map(fn ($schedule): array => [
                        'id' => $schedule->id,
                        'label' => $schedule->libelle,
                    ])->values(),
                    'maintenance_plans' => $item->entretiens->map(fn (EntretienPlanifie $schedule): array => $this->planPayload($schedule, $item))->values(),
                    'work_logs' => $item->travaux->map(
                        fn (TravailEquipement $work): array => $this->equipmentWorkPayload($work, $item, $canManage)
                    )->values(),
                    'interventions' => $item->interventions->map(
                        fn (InterventionEquipement $intervention): array => $this->equipmentInterventionPayload($intervention, $canManage)
                    )->values(),
                    'open_orders_count' => (int) $item->getAttribute('open_orders_count'),
                ];
            })
            ->values();

        $infrastructures = Infrastructure::query()
            ->with([
                'site:id,code,nom',
                'parcelle:id,label',
                'responsable:id,name',
                'entretiens',
                'inspections' => fn ($query) => $query->limit(5),
            ])
            ->withCount([
                'ordresTravail as open_orders_count' => fn ($query) => $query->whereNotIn('statut', ['clos', 'refuse', 'annule']),
            ])
            ->orderByDesc('actif')
            ->orderBy('code')
            ->get()
            ->map(fn (Infrastructure $item): array => [
                ...$item->only([
                    'id', 'code', 'nom', 'categorie', 'description', 'site_id', 'parcelle_id',
                    'localisation', 'latitude', 'longitude', 'annee_mise_en_service',
                    'caracteristiques', 'etat', 'etat_constate_le',
                    'criticite', 'derniere_inspection', 'prochaine_inspection',
                    'periodicite_inspection_jours', 'responsable_id', 'note', 'actif',
                    ...($canManage ? ['valeur_remplacement'] : []),
                ]),
                'site' => $item->site?->only(['id', 'code', 'nom']),
                'parcelle' => $item->parcelle?->only(['id', 'label']),
                'responsable' => $item->responsable?->only(['id', 'name']),
                'inspection_late' => $item->inspectionEnRetard(),
                'intervention_needed' => $item->demandeIntervention(),
                'open_orders_count' => (int) $item->getAttribute('open_orders_count'),
                'maintenance_plans' => $item->entretiens->map(fn (EntretienPlanifie $schedule): array => $this->planPayload($schedule))->values(),
                'inspections' => $item->inspections->map(fn (InspectionInfrastructure $inspection): array => [
                    'id' => $inspection->id,
                    'reference' => $inspection->reference,
                    'date' => Carbon::parse($inspection->date)->toDateString(),
                    'etat_constate' => $inspection->etat_constate,
                    'constat' => $inspection->constat,
                    'inspecteur_nom' => $inspection->inspecteur_nom,
                    'photo_url' => $this->publicImageUrl($inspection->getAttribute('photo_chemin')),
                ])->values()->all(),
            ])
            ->values();

        $indicators = $maintenance->indicateurs(now()->subDays(90), now());
        $backlog = $maintenance->retardAccumule();
        if (! $canManage) {
            unset($indicators['cout_total']);
        }

        return Inertia::render('maintenance', [
            'orders' => $orders,
            'orderPagination' => [
                'currentPage' => $ordersPage->currentPage(),
                'lastPage' => $ordersPage->lastPage(),
                'perPage' => $ordersPage->perPage(),
                'total' => $ordersPage->total(),
                'from' => $ordersPage->firstItem(),
                'to' => $ordersPage->lastItem(),
                'previousUrl' => $ordersPage->previousPageUrl(),
                'nextUrl' => $ordersPage->nextPageUrl(),
            ],
            'orderFilters' => [
                'statut' => $orderStatus,
                'nature' => $orderNature,
                'priorite' => $orderPriority,
                'q' => $orderSearch,
            ],
            'equipment' => $equipment,
            'infrastructures' => $infrastructures,
            'stats' => [
                ...$indicators,
                'urgent' => (int) $backlog['urgents'],
                'stopped' => (int) $backlog['arrets'],
                'over_30_days' => (int) $backlog['plus_30j'],
                'maintenance_due' => $equipment->sum(fn (array $item): int => count($item['maintenance_due'])),
                'equipment_unavailable' => $equipment->whereIn('statut', ['maintenance', 'immobilise'])->count(),
                'inspections_late' => $infrastructures->where('inspection_late', true)->count(),
            ],
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'parcelles' => ReferenceItem::query()
                ->where('category', 'parcelles')
                ->where('active', true)
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get(['id', 'label']),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name']),
            'articles' => Article::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'libelle', 'unite_usage_id']),
            'fuelArticles' => Article::query()
                ->where('actif', true)
                ->where('categorie', 'CAR')
                ->orderBy('code')
                ->get(['id', 'code', 'libelle', 'unite_usage_id']),
            'units' => Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
            'options' => [
                'orderStatuses' => OrdreTravail::STATUTS,
                'orderTypes' => OrdreTravail::TYPES,
                'orderOrigins' => OrdreTravail::ORIGINES,
                'workPermits' => OrdreTravail::PERMIS,
                'equipmentCategories' => Equipement::CATEGORIES,
                'equipmentStatuses' => Equipement::STATUTS,
                'infrastructureCategories' => Infrastructure::CATEGORIES,
                'infrastructureStates' => Infrastructure::ETATS,
                'equipmentWorkNatures' => TravailEquipement::NATURES,
                'equipmentInterventionTypes' => InterventionEquipement::TYPES,
            ],
            'permissions' => [
                'canManage' => $canManage,
                'userId' => $request->user()?->id,
            ],
        ]);
    }

    public function storeOrder(Request $request, OrdreTravailService $service): RedirectResponse
    {
        $data = $request->validate([
            'target_type' => ['required', 'in:equipment,infrastructure,none'],
            'target_id' => ['nullable', 'integer', 'required_unless:target_type,none'],
            'objet' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:4000'],
            'type_intervention' => ['required', Rule::in(array_keys(OrdreTravail::TYPES))],
            'priorite' => ['required', 'in:basse,normale,elevee,urgente'],
            'arret_production' => ['nullable', 'boolean'],
            'consequence' => ['nullable', 'string', 'max:2000'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'echeance' => ['nullable', 'date'],
            'consignation_requise' => ['nullable', 'boolean'],
            'permis_travail' => ['nullable', Rule::in(array_keys(OrdreTravail::PERMIS))],
            'epi_requis' => ['nullable', 'string', 'max:255'],
            'photo_avant' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_avant'] = $this->storeImage($request, 'photo_avant', 'ot');
        $target = $this->resolveTarget($data['target_type'], $data['target_id'] ?? null);
        unset($data['target_type'], $data['target_id']);

        return $this->perform(
            fn () => $service->demander($data, $target),
            'Ordre de travail demandé — il attend une approbation.',
        );
    }

    public function approve(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        return $this->perform(fn () => $service->approuver($ordreTravail, $data['note'] ?? null), 'Ordre approuvé — il peut être planifié.');
    }

    public function refuse(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate(['motif' => ['required', 'string', 'max:2000']]);

        return $this->perform(fn () => $service->refuser($ordreTravail, $data['motif']), 'Ordre refusé avec son motif.');
    }

    public function plan(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate([
            'responsable_id' => ['nullable', 'integer', 'exists:users,id', 'required_without:prestataire'],
            'prestataire' => ['nullable', 'string', 'max:180', 'required_without:responsable_id'],
            'planifie_le' => ['required', 'date'],
            'echeance' => ['nullable', 'date', 'after_or_equal:planifie_le'],
        ]);

        return $this->perform(fn () => $service->planifier($ordreTravail, $data), 'Intervention planifiée et assignée.');
    }

    public function start(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureExecutor($request, $ordreTravail);
        $data = $request->validate(['consignation' => ['nullable', 'boolean']]);

        return $this->perform(fn () => $service->demarrer($ordreTravail, (bool) ($data['consignation'] ?? false)), 'Intervention démarrée.');
    }

    public function addPiece(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureExecutor($request, $ordreTravail);
        $data = $request->validate([
            'origine_piece' => ['required', 'in:magasin,achat_direct,prestataire'],
            'article_id' => ['nullable', 'integer', 'exists:articles,id', 'required_if:origine_piece,magasin'],
            'designation' => ['nullable', 'string', 'max:255', 'required_unless:origine_piece,magasin'],
            'quantite' => ['required', 'numeric', 'gt:0'],
            'unite_id' => ['nullable', 'integer', 'exists:unites,id'],
            'unite' => ['nullable', 'string', 'max:24', 'required_unless:origine_piece,magasin'],
            'cout' => ['nullable', 'numeric', 'min:0'],
            'cout_unitaire' => ['nullable', 'numeric', 'min:0'],
        ]);

        return $this->perform(fn () => $service->ajouterPiece($ordreTravail, $data), 'Pièce ajoutée et coût recalculé.');
    }

    public function addTime(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureExecutor($request, $ordreTravail);
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'intervenant_nom' => ['nullable', 'string', 'max:180'],
            'date' => ['required', 'date'],
            'heures' => ['required', 'numeric', 'gt:0', 'max:24'],
            'taux_horaire' => ['nullable', 'numeric', 'min:0'],
            'travail' => ['nullable', 'string', 'max:255'],
        ]);
        if (! $this->canManage($request)) {
            $data['user_id'] = $request->user()->id;
            $data['intervenant_nom'] = $request->user()->name;
        }

        return $this->perform(fn () => $service->pointer($ordreTravail, $data), 'Temps de travail ajouté.');
    }

    public function finish(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureExecutor($request, $ordreTravail);
        $data = $request->validate([
            'travaux_realises' => ['required', 'string', 'max:5000'],
            'cause_racine' => ['nullable', 'string', 'max:3000'],
            'cout_prestataire' => ['nullable', 'numeric', 'min:0'],
            'photo_apres' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_apres'] = $this->storeImage($request, 'photo_apres', 'ot');

        return $this->perform(fn () => $service->terminer($ordreTravail, $data), 'Travaux terminés — ils attendent une vérification indépendante.');
    }

    public function verify(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate([
            'conforme' => ['required', 'boolean'],
            'observation' => ['nullable', 'string', 'max:2000', 'required_if:conforme,0'],
        ]);

        return $this->perform(
            fn () => $service->verifier($ordreTravail, (bool) $data['conforme'], $data['observation'] ?? null),
            (bool) $data['conforme'] ? 'Travaux vérifiés conformes.' : 'Travaux renvoyés en exécution.',
        );
    }

    public function close(Request $request, OrdreTravail $ordreTravail, OrdreTravailService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate(['remettre_en_service' => ['nullable', 'boolean']]);

        return $this->perform(fn () => $service->clore($ordreTravail, (bool) ($data['remettre_en_service'] ?? true)), 'Ordre de travail clos.');
    }

    public function createEquipment(Request $request): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $this->equipmentData($request);
        Equipement::create($data);

        return back()->with('success', 'Équipement ajouté au parc.');
    }

    public function updateEquipment(Request $request, Equipement $equipement): RedirectResponse
    {
        $this->ensureManager($request);
        $equipement->update($this->equipmentData($request, $equipement));

        return back()->with('success', 'Fiche équipement mise à jour.');
    }

    public function storeEquipmentWork(Request $request, Equipement $equipement, EquipementService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate([
            'date' => ['required', 'date', 'before_or_equal:today'],
            'operateur_id' => ['nullable', 'integer', 'exists:users,id'],
            'operateur_nom' => ['nullable', 'string', 'max:180'],
            'heure_debut' => ['nullable', 'date_format:H:i', 'required_with:heure_fin'],
            'heure_fin' => ['nullable', 'date_format:H:i', 'required_with:heure_debut'],
            'duree_heures' => ['nullable', 'numeric', 'gt:0', 'max:24'],
            'compteur_debut' => ['nullable', 'numeric', 'min:0'],
            'compteur_fin' => ['nullable', 'numeric', 'min:0'],
            'nature' => ['required', Rule::in(array_keys(TravailEquipement::NATURES))],
            'travail' => ['required', 'string', 'max:255'],
            'parcelle_id' => [
                'nullable',
                'integer',
                Rule::exists('reference_items', 'id')->where(
                    fn ($query) => $query->where('category', 'parcelles')->where('active', true),
                ),
            ],
            'surface_travaillee' => ['nullable', 'numeric', 'gt:0'],
            'destination' => ['nullable', 'string', 'max:255'],
            'client_libre' => ['nullable', 'string', 'max:180', 'required_if:nature,tiers'],
            'article_carburant_id' => [
                'nullable',
                'integer',
                'required_with:carburant_litres',
                Rule::exists('articles', 'id')->where(
                    fn ($query) => $query->where('categorie', 'CAR')->where('actif', true),
                ),
            ],
            'carburant_litres' => ['nullable', 'numeric', 'gt:0', 'required_with:article_carburant_id'],
            'cout_carburant' => ['nullable', 'numeric', 'min:0'],
            'montant_facture' => ['nullable', 'numeric', 'min:0'],
            'devise' => ['required', 'in:USD,CDF'],
            'observation' => ['nullable', 'string', 'max:3000'],
            'anomalie' => ['nullable', 'string', 'max:3000'],
            'photo_chemin' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($equipement->type_compteur !== 'aucun' && ($data['compteur_fin'] ?? null) === null) {
            throw ValidationException::withMessages([
                'compteur_fin' => 'Le relevé de fin est obligatoire pour cet équipement.',
            ]);
        }

        $data['photo_chemin'] = $this->storeImage($request, 'photo_chemin', 'equipements');

        return $this->perform(
            fn () => $service->enregistrerTravail($equipement, $data),
            'Fiche de travail enregistrée - compteur et échéances actualisés.',
        );
    }

    public function storeEquipmentIntervention(Request $request, Equipement $equipement, EquipementService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate([
            'date' => ['required', 'date', 'before_or_equal:today'],
            'type' => ['required', Rule::in(array_keys(InterventionEquipement::TYPES))],
            'entretien_planifie_id' => [
                'nullable',
                'integer',
                Rule::exists('entretiens_planifies', 'id')->where('equipement_id', $equipement->id),
            ],
            'compteur' => ['nullable', 'numeric', 'min:0'],
            'description' => ['required', 'string', 'max:5000'],
            'pieces_utilisees' => ['nullable', 'string', 'max:3000'],
            'cout_pieces' => ['nullable', 'numeric', 'min:0'],
            'cout_main_oeuvre' => ['nullable', 'numeric', 'min:0'],
            'prestataire' => ['nullable', 'string', 'max:180'],
            'immobilisation_heures' => ['nullable', 'numeric', 'min:0'],
            'remettre_en_service' => ['nullable', 'boolean'],
            'photo_chemin' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_chemin'] = $this->storeImage($request, 'photo_chemin', 'maintenance');

        return $this->perform(
            fn () => $service->enregistrerIntervention($equipement, $data),
            'Intervention enregistrée - la prochaine échéance est recalculée.',
        );
    }

    public function createInfrastructure(Request $request): RedirectResponse
    {
        $this->ensureManager($request);
        Infrastructure::create($this->infrastructureData($request));

        return back()->with('success', 'Infrastructure ajoutée au registre.');
    }

    public function updateInfrastructure(Request $request, Infrastructure $infrastructure): RedirectResponse
    {
        $this->ensureManager($request);
        $infrastructure->update($this->infrastructureData($request, $infrastructure));

        return back()->with('success', 'Infrastructure mise à jour.');
    }

    public function inspect(Request $request, Infrastructure $infrastructure, MaintenanceService $service): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $request->validate([
            'date' => ['required', 'date', 'before_or_equal:today'],
            'etat_constate' => ['required', Rule::in(array_keys(Infrastructure::ETATS))],
            'constat' => ['required', 'string', 'max:5000'],
            'actions_immediates' => ['nullable', 'string', 'max:3000'],
            'intervention_requise' => ['nullable', 'boolean'],
            'photo_chemin' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_chemin'] = $this->storeImage($request, 'photo_chemin', 'inspections');

        return $this->perform(fn () => $service->inspecter($infrastructure, $data), 'Inspection consignée — la prochaine échéance est recalculée.');
    }

    public function storePlan(Request $request): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $this->planData($request);
        $target = $this->resolvePlanTarget($data['target_type'], (int) $data['target_id']);
        EntretienPlanifie::query()->create($this->planAttributes($data, $target));

        return back()->with('success', "Opération ajoutée au plan d'entretien.");
    }

    public function updatePlan(Request $request, EntretienPlanifie $entretienPlanifie): RedirectResponse
    {
        $this->ensureManager($request);
        $data = $this->planData($request, $entretienPlanifie);
        $target = $this->resolvePlanTarget($data['target_type'], (int) $data['target_id']);
        $entretienPlanifie->update($this->planAttributes($data, $target, $entretienPlanifie));

        return back()->with('success', "Opération d'entretien mise à jour.");
    }

    public function destroyPlan(Request $request, EntretienPlanifie $entretienPlanifie): RedirectResponse
    {
        $this->ensureManager($request);

        if (OrdreTravail::query()->where('entretien_planifie_id', $entretienPlanifie->id)->exists()) {
            $entretienPlanifie->update(['actif' => false]);

            return back()->with('success', "Plan désactivé ; son historique d'ordres est conservé.");
        }

        $entretienPlanifie->delete();

        return back()->with('success', "Opération retirée du plan d'entretien.");
    }

    /** @return array<string, mixed> */
    private function equipmentData(Request $request, ?Equipement $equipment = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('equipements', 'code')->ignore($equipment)],
            'nom' => ['required', 'string', 'max:180'],
            'categorie' => ['required', Rule::in(array_keys(Equipement::CATEGORIES))],
            'marque' => ['nullable', 'string', 'max:120'],
            'modele' => ['nullable', 'string', 'max:120'],
            'immatriculation' => ['nullable', 'string', 'max:32'],
            'numero_serie' => ['nullable', 'string', 'max:64'],
            'annee' => ['nullable', 'integer', 'min:1950', 'max:'.(now()->year + 1)],
            'acquis_le' => ['nullable', 'date'],
            'valeur_acquisition' => ['nullable', 'numeric', 'min:0'],
            'type_compteur' => ['required', 'in:heures,km,aucun'],
            'compteur_actuel' => ['nullable', 'numeric', 'min:0'],
            'carburant' => ['nullable', 'in:diesel,essence,electrique,solaire'],
            'capacite_reservoir' => ['nullable', 'numeric', 'min:0'],
            'consommation_ref' => ['nullable', 'numeric', 'min:0'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'responsable_id' => ['nullable', 'integer', 'exists:users,id'],
            'statut' => ['required', Rule::in(array_keys(Equipement::STATUTS))],
            'motif_immobilisation' => ['nullable', 'string', 'max:255'],
            'tarif_horaire' => ['nullable', 'numeric', 'min:0'],
            'tarif_hectare' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:3000'],
            'actif' => ['required', 'boolean'],
        ]);
    }

    /** @return array<string, mixed> */
    private function infrastructureData(Request $request, ?Infrastructure $infrastructure = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:24', Rule::unique('infrastructures', 'code')->ignore($infrastructure)],
            'nom' => ['required', 'string', 'max:180'],
            'categorie' => ['required', Rule::in(array_keys(Infrastructure::CATEGORIES))],
            'description' => ['nullable', 'string', 'max:3000'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'parcelle_id' => [
                'nullable',
                'integer',
                Rule::exists('reference_items', 'id')->where(
                    fn ($query) => $query->where('category', 'parcelles')->where('active', true),
                ),
            ],
            'localisation' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'annee_mise_en_service' => ['nullable', 'integer', 'min:1900', 'max:'.(now()->year + 1)],
            'valeur_remplacement' => ['nullable', 'numeric', 'min:0'],
            'caracteristiques' => ['nullable', 'string', 'max:255'],
            'etat' => ['required', Rule::in(array_keys(Infrastructure::ETATS))],
            'criticite' => ['required', 'integer', 'between:1,5'],
            'periodicite_inspection_jours' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'prochaine_inspection' => ['nullable', 'date'],
            'responsable_id' => ['nullable', 'integer', 'exists:users,id'],
            'note' => ['nullable', 'string', 'max:3000'],
            'actif' => ['required', 'boolean'],
        ]);
    }

    /** @return array<string, mixed> */
    private function planData(Request $request, ?EntretienPlanifie $plan = null): array
    {
        $required = $plan instanceof EntretienPlanifie ? 'sometimes' : 'required';
        $data = $request->validate([
            'target_type' => [$required, 'in:equipment,infrastructure'],
            'target_id' => [$required, 'integer'],
            'libelle' => [$required, 'string', 'max:255'],
            'type' => [$required, 'in:preventif,reglementaire'],
            'periodicite_compteur' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'periodicite_jours' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'alerte_avant_compteur' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
            'dernier_compteur' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'dernier_le' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'operations' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'pieces' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'actif' => [$required, 'boolean'],
        ]);

        if ($plan instanceof EntretienPlanifie) {
            $hasTargetType = array_key_exists('target_type', $data);
            $hasTargetId = array_key_exists('target_id', $data);
            if ($hasTargetType !== $hasTargetId) {
                throw ValidationException::withMessages([
                    'target_id' => 'Le type et la cible doivent être modifiés ensemble.',
                ]);
            }

            $data['target_type'] ??= $plan->equipement_id !== null ? 'equipment' : 'infrastructure';
            $data['target_id'] ??= $plan->equipement_id ?? $plan->infrastructure_id;
        }

        $periodiciteJours = array_key_exists('periodicite_jours', $data)
            ? $data['periodicite_jours']
            : $plan?->periodicite_jours;
        $periodiciteCompteur = array_key_exists('periodicite_compteur', $data)
            ? $data['periodicite_compteur']
            : $plan?->periodicite_compteur;

        if ($data['target_type'] === 'infrastructure' && empty($periodiciteJours)) {
            throw ValidationException::withMessages([
                'periodicite_jours' => 'Une infrastructure exige une périodicité en jours.',
            ]);
        }

        if ($data['target_type'] === 'equipment'
            && empty($periodiciteJours)
            && empty($periodiciteCompteur)) {
            throw ValidationException::withMessages([
                'periodicite_compteur' => 'Renseignez une périodicité au compteur ou en jours.',
            ]);
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function planAttributes(array $data, Model $target, ?EntretienPlanifie $plan = null): array
    {
        $targetChanged = ! $plan instanceof EntretienPlanifie
            || ($target instanceof Equipement && (int) $plan->equipement_id !== (int) $target->id)
            || ($target instanceof Infrastructure && (int) $plan->infrastructure_id !== (int) $target->id);
        unset($data['target_type'], $data['target_id']);

        if ($target instanceof Equipement) {
            $data['equipement_id'] = $target->id;
            $data['infrastructure_id'] = null;
            if ($targetChanged
                || array_key_exists('periodicite_compteur', $data)
                || array_key_exists('dernier_compteur', $data)) {
                $periodicite = array_key_exists('periodicite_compteur', $data)
                    ? $data['periodicite_compteur']
                    : $plan?->periodicite_compteur;
                $dernier = array_key_exists('dernier_compteur', $data)
                    ? $data['dernier_compteur']
                    : $plan?->dernier_compteur;
                $data['prochain_compteur'] = $periodicite !== null
                    ? (float) ($dernier ?? $target->compteur_actuel) + (float) $periodicite
                    : null;
            }
        } elseif ($target instanceof Infrastructure) {
            $data['equipement_id'] = null;
            $data['infrastructure_id'] = $target->id;
            $data['periodicite_compteur'] = null;
            $data['dernier_compteur'] = null;
            $data['prochain_compteur'] = null;
            $data['alerte_avant_compteur'] = null;
        }

        if ($targetChanged
            || array_key_exists('periodicite_jours', $data)
            || array_key_exists('dernier_le', $data)) {
            $periodicite = array_key_exists('periodicite_jours', $data)
                ? $data['periodicite_jours']
                : $plan?->periodicite_jours;
            $dernier = array_key_exists('dernier_le', $data)
                ? $data['dernier_le']
                : $plan?->dernier_le;
            $data['prochain_le'] = $periodicite !== null
                ? Carbon::parse($dernier ?? today())->addDays((int) $periodicite)->toDateString()
                : null;
        }

        return $data;
    }

    private function resolvePlanTarget(string $type, int $id): Model
    {
        $target = $this->resolveTarget($type, $id);

        if (! $target instanceof Equipement && ! $target instanceof Infrastructure) {
            throw new RuntimeException('La cible du plan est invalide.');
        }

        return $target;
    }

    private function resolveTarget(string $type, ?int $id): ?Model
    {
        return match ($type) {
            'equipment' => Equipement::query()->where('actif', true)->findOrFail($id),
            'infrastructure' => Infrastructure::query()->where('actif', true)->findOrFail($id),
            default => null,
        };
    }

    /** @return array<string, mixed> */
    private function planPayload(EntretienPlanifie $plan, ?Equipement $equipment = null): array
    {
        return [
            ...$plan->only([
                'id', 'libelle', 'type', 'periodicite_compteur', 'periodicite_jours',
                'dernier_compteur', 'dernier_le', 'prochain_compteur', 'prochain_le',
                'alerte_avant_compteur', 'operations', 'pieces', 'actif',
            ]),
            'due' => $equipment ? $plan->estDu($equipment) : $plan->estDu(),
            'warning' => $equipment ? $plan->approche($equipment) : $plan->approche(),
            'remaining' => $equipment ? $plan->resteAvant($equipment) : $plan->resteAvant(),
        ];
    }

    /** @return array<string, mixed> */
    private function equipmentWorkPayload(TravailEquipement $work, Equipement $equipment, bool $canSeeCosts): array
    {
        $consumption = null;
        if ((float) $work->carburant_litres > 0) {
            $consumption = $equipment->type_compteur === 'km' && (float) $work->compteur_parcouru > 0
                ? round((float) $work->carburant_litres / (float) $work->compteur_parcouru * 100, 2)
                : ((float) $work->duree_heures > 0
                    ? round((float) $work->carburant_litres / (float) $work->duree_heures, 2)
                    : null);
        }
        $reference = (float) ($equipment->consommation_ref ?? 0);

        return [
            ...$work->only([
                'id', 'reference', 'date', 'operateur_id', 'operateur_nom', 'heure_debut', 'heure_fin',
                'duree_heures', 'compteur_debut', 'compteur_fin', 'compteur_parcouru', 'nature',
                'travail', 'parcelle_id', 'surface_travaillee', 'destination', 'client_libre',
                'carburant_litres', 'observation', 'anomalie', 'statut',
                ...($canSeeCosts ? ['cout_carburant', 'montant_facture', 'devise'] : []),
            ]),
            'parcelle' => $work->parcelle?->only(['id', 'label']),
            'consumption' => $consumption,
            'consumption_variance' => $reference > 0 && $consumption !== null
                ? round(($consumption - $reference) / $reference * 100, 1)
                : null,
            'photo_url' => $this->publicImageUrl($work->photo_chemin),
        ];
    }

    /** @return array<string, mixed> */
    private function equipmentInterventionPayload(InterventionEquipement $intervention, bool $canSeeCosts): array
    {
        return [
            ...$intervention->only([
                'id', 'reference', 'entretien_planifie_id', 'date', 'type', 'compteur', 'description',
                'pieces_utilisees', 'prestataire', 'immobilisation_heures', 'realise_par_nom',
                ...($canSeeCosts ? ['cout_pieces', 'cout_main_oeuvre'] : []),
            ]),
            'entretien' => $intervention->entretien?->only(['id', 'libelle']),
            'cost_total' => $canSeeCosts ? $intervention->coutTotal() : null,
            'photo_url' => $this->publicImageUrl($intervention->photo_chemin),
        ];
    }

    /** @return array<string, mixed> */
    private function orderPayload(OrdreTravail $order, bool $canSeeCosts): array
    {
        return [
            ...$order->only([
                'id', 'reference', 'origine', 'type_intervention', 'cible_libelle', 'objet',
                'description', 'diagnostic', 'priorite', 'arret_production', 'consequence',
                'statut', 'site_id', 'demandeur_id', 'demandeur_nom', 'demande_le',
                'approuve_le', 'responsable_id', 'prestataire', 'echeance', 'planifie_le',
                'debut_reel', 'fin_reelle', 'consignation_requise', 'consignation_faite',
                'permis_travail', 'epi_requis', 'travaux_realises', 'cause_racine',
                'recurrent', 'immobilisation_heures', 'verifie_le', 'observation_verification',
                'clos_le', 'motif_refus',
            ]),
            'site' => $order->site?->only(['id', 'code', 'nom']),
            'demandeur' => $order->demandeur?->only(['id', 'name']),
            'responsable' => $order->responsable?->only(['id', 'name']),
            'target' => $order->cible ? [
                'id' => $order->cible->getKey(),
                'type' => $order->cible instanceof Equipement ? 'equipment' : 'infrastructure',
                'code' => $order->cible->code ?? null,
                'name' => $order->cible->nom ?? null,
            ] : null,
            'late' => $order->enRetard(),
            'open_days' => $order->joursOuvert(),
            'current_step' => $order->etapeCourante(),
            'executed_by_current_user' => (int) $order->responsable_id === (int) auth()->id()
                || $order->pointages->contains(fn ($entry): bool => (int) $entry->user_id === (int) auth()->id())
                || $order->evenements->contains(fn ($event): bool => (int) $event->user_id === (int) auth()->id()
                    && in_array($event->type, ['demarrage', 'piece', 'realisation'], true)),
            'photo_before_url' => $this->publicImageUrl($order->photo_avant),
            'photo_after_url' => $this->publicImageUrl($order->photo_apres),
            'costs' => $canSeeCosts ? [
                'pieces' => $order->cout_pieces,
                'labor' => $order->cout_main_oeuvre,
                'provider' => $order->cout_prestataire,
                'total' => $order->cout_total,
            ] : null,
            'pieces' => $order->pieces->map(fn ($piece): array => [
                ...$piece->only([
                    'id', 'designation', 'quantite', 'unite', 'origine_piece',
                    ...($canSeeCosts ? ['cout'] : []),
                ]),
                'article' => $piece->article?->only(['id', 'code', 'libelle']),
            ])->values(),
            'time_entries' => $order->pointages->map(fn ($entry): array => [
                ...$entry->only([
                    'id', 'user_id', 'intervenant_nom', 'date', 'heures', 'travail',
                    ...($canSeeCosts ? ['cout'] : []),
                ]),
                'user' => $entry->utilisateur?->only(['id', 'name']),
            ])->values(),
            'events' => $order->evenements->take(20)->map(fn ($event): array => $event->only([
                'id', 'type', 'resume', 'detail', 'user_nom', 'created_at',
            ]))->values(),
        ];
    }

    private function canManage(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->is_admin || (int) ($user->niveau_hierarchie ?? 4) <= 3);
    }

    private function ensureManager(Request $request): void
    {
        abort_unless($this->canManage($request), 403);
    }

    private function ensureExecutor(Request $request, OrdreTravail $order): void
    {
        if ($this->canManage($request)) {
            return;
        }

        abort_unless(
            $request->user() !== null
                && ((int) $order->responsable_id === (int) $request->user()->id
                    || ($order->responsable_id === null && (int) $order->demandeur_id === (int) $request->user()->id)),
            403,
        );
    }

    private function storeImage(Request $request, string $field, string $directory): ?string
    {
        $file = $request->file($field);

        if (! $file instanceof UploadedFile) {
            return null;
        }

        $path = $file->store($directory, 'public');

        if (! is_string($path)) {
            throw new RuntimeException("La photo n'a pas pu être enregistrée.");
        }

        return $path;
    }

    private function publicImageUrl(mixed $path): ?string
    {
        return is_string($path) && $path !== ''
            ? Storage::disk('public')->url($path)
            : null;
    }

    private function perform(callable $action, string $success): RedirectResponse
    {
        try {
            $action();

            return back()->with('success', $success);
        } catch (RuntimeException $exception) {
            return back()->withErrors(['maintenance' => $exception->getMessage()]);
        }
    }
}
