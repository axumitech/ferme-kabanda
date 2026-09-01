import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    Camera,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    Clock3,
    Gauge,
    History,
    Eye,
    ListFilter,
    LoaderCircle,
    PackagePlus,
    Pencil,
    Play,
    Plus,
    Search,
    ShieldCheck,
    Tractor,
    TriangleAlert,
    Wrench,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type NamedOption = { id: number; name: string };
type Site = { id: number; code: string; nom: string };
type Parcelle = { id: number; label: string };
type Article = {
    id: number;
    code: string;
    libelle: string;
    unite_usage_id?: number | null;
};
type Unit = { id: number; code: string; nom: string };

type WorkOrder = {
    id: number;
    reference: string;
    origine: string;
    type_intervention: string;
    cible_libelle?: string | null;
    objet: string;
    description?: string | null;
    diagnostic?: string | null;
    priorite: string;
    arret_production: boolean;
    consequence?: string | null;
    statut: string;
    demandeur_id?: number | null;
    demandeur_nom: string;
    demande_le: string;
    approuve_le?: string | null;
    responsable_id?: number | null;
    prestataire?: string | null;
    echeance?: string | null;
    planifie_le?: string | null;
    debut_reel?: string | null;
    fin_reelle?: string | null;
    consignation_requise: boolean;
    consignation_faite: boolean;
    permis_travail?: string | null;
    epi_requis?: string | null;
    travaux_realises?: string | null;
    cause_racine?: string | null;
    recurrent: boolean;
    immobilisation_heures?: string | number | null;
    verifie_le?: string | null;
    observation_verification?: string | null;
    clos_le?: string | null;
    motif_refus?: string | null;
    site?: Site | null;
    demandeur?: NamedOption | null;
    responsable?: NamedOption | null;
    target?: {
        id: number;
        type: 'equipment' | 'infrastructure';
        code?: string | null;
        name?: string | null;
    } | null;
    late: boolean;
    open_days: number;
    current_step: number;
    executed_by_current_user: boolean;
    photo_before_url?: string | null;
    photo_after_url?: string | null;
    costs?: {
        pieces: string | number;
        labor: string | number;
        provider: string | number;
        total: string | number;
    } | null;
    pieces: Array<{
        id: number;
        designation: string;
        quantite: string | number;
        unite?: string | null;
        cout?: string | number;
        origine_piece: string;
        article?: Article | null;
    }>;
    time_entries: Array<{
        id: number;
        user_id?: number | null;
        intervenant_nom: string;
        date: string;
        heures: string | number;
        cout?: string | number;
        travail?: string | null;
        user?: NamedOption | null;
    }>;
    events: Array<{
        id: number;
        type: string;
        resume: string;
        detail?: string | null;
        user_nom: string;
        created_at: string;
    }>;
};

type MaintenancePlan = {
    id: number;
    libelle: string;
    type: string;
    periodicite_compteur?: string | number | null;
    periodicite_jours?: number | null;
    dernier_compteur?: string | number | null;
    dernier_le?: string | null;
    prochain_compteur?: string | number | null;
    prochain_le?: string | null;
    alerte_avant_compteur?: number | null;
    operations?: string | null;
    pieces?: string | null;
    actif: boolean;
    due: boolean;
    warning: boolean;
    remaining?: string | null;
};

type EquipmentWorkLog = {
    id: number;
    reference: string;
    date: string;
    operateur_nom: string;
    heure_debut?: string | null;
    heure_fin?: string | null;
    duree_heures?: string | number | null;
    compteur_debut?: string | number | null;
    compteur_fin?: string | number | null;
    compteur_parcouru?: string | number | null;
    nature: string;
    travail: string;
    parcelle?: Parcelle | null;
    surface_travaillee?: string | number | null;
    destination?: string | null;
    client_libre?: string | null;
    carburant_litres?: string | number | null;
    cout_carburant?: string | number | null;
    montant_facture?: string | number | null;
    devise?: string | null;
    observation?: string | null;
    anomalie?: string | null;
    consumption?: number | null;
    consumption_variance?: number | null;
    photo_url?: string | null;
};

type EquipmentIntervention = {
    id: number;
    reference: string;
    date: string;
    type: string;
    compteur?: string | number | null;
    description: string;
    pieces_utilisees?: string | null;
    cout_pieces?: string | number | null;
    cout_main_oeuvre?: string | number | null;
    cost_total?: string | number | null;
    prestataire?: string | null;
    immobilisation_heures?: string | number | null;
    realise_par_nom?: string | null;
    entretien?: { id: number; libelle: string } | null;
    photo_url?: string | null;
};

type Equipment = {
    id: number;
    code: string;
    nom: string;
    categorie: string;
    marque?: string | null;
    modele?: string | null;
    immatriculation?: string | null;
    numero_serie?: string | null;
    annee?: number | null;
    acquis_le?: string | null;
    valeur_acquisition?: string | null;
    type_compteur: string;
    compteur_actuel: string | number;
    carburant?: string | null;
    capacite_reservoir?: string | null;
    consommation_ref?: string | null;
    site_id?: number | null;
    responsable_id?: number | null;
    statut: string;
    motif_immobilisation?: string | null;
    tarif_horaire?: string | null;
    tarif_hectare?: string | null;
    note?: string | null;
    actif: boolean;
    site?: Site | null;
    responsable?: NamedOption | null;
    counter_label: string;
    maintenance_due: Array<{ id: number; label: string }>;
    maintenance_plans: MaintenancePlan[];
    work_logs: EquipmentWorkLog[];
    interventions: EquipmentIntervention[];
    open_orders_count: number;
};

type Infrastructure = {
    id: number;
    code: string;
    nom: string;
    categorie: string;
    description?: string | null;
    site_id?: number | null;
    parcelle_id?: number | null;
    localisation?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    annee_mise_en_service?: number | null;
    valeur_remplacement?: string | null;
    caracteristiques?: string | null;
    etat: string;
    etat_constate_le?: string | null;
    criticite: number;
    derniere_inspection?: string | null;
    prochaine_inspection?: string | null;
    periodicite_inspection_jours?: number | null;
    responsable_id?: number | null;
    note?: string | null;
    actif: boolean;
    site?: Site | null;
    parcelle?: Parcelle | null;
    responsable?: NamedOption | null;
    inspection_late: boolean;
    intervention_needed: boolean;
    open_orders_count: number;
    maintenance_plans: MaintenancePlan[];
    inspections: Array<{
        id: number;
        reference: string;
        date: string;
        etat_constate: string;
        constat: string;
        inspecteur_nom: string;
        photo_url?: string | null;
    }>;
};

type Props = {
    orders: WorkOrder[];
    orderPagination: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
        from?: number | null;
        to?: number | null;
        previousUrl?: string | null;
        nextUrl?: string | null;
    };
    orderFilters: {
        statut: string;
        nature: string;
        priorite: string;
        q: string;
    };
    equipment: Equipment[];
    infrastructures: Infrastructure[];
    stats: {
        ouverts: number;
        en_retard: number;
        urgent: number;
        stopped: number;
        over_30_days: number;
        part_preventif: number | null;
        temps_reparation: number | null;
        immobilisation: number;
        recurrents: number;
        cout_total?: number;
        maintenance_due: number;
        equipment_unavailable: number;
        inspections_late: number;
    };
    sites: Site[];
    parcelles: Parcelle[];
    users: NamedOption[];
    articles: Article[];
    fuelArticles: Article[];
    units: Unit[];
    options: {
        orderStatuses: Record<string, string>;
        orderTypes: Record<string, string>;
        orderOrigins: Record<string, string>;
        workPermits: Record<string, string>;
        equipmentCategories: Record<string, string>;
        equipmentStatuses: Record<string, string>;
        infrastructureCategories: Record<string, string>;
        infrastructureStates: Record<string, string>;
        equipmentWorkNatures: Record<string, string>;
        equipmentInterventionTypes: Record<string, string>;
    };
    permissions: { canManage: boolean; userId?: number | null };
};

type Tab = 'orders' | 'equipment' | 'infrastructures';
type OrderAction =
    | 'approve'
    | 'refuse'
    | 'plan'
    | 'start'
    | 'piece'
    | 'time'
    | 'finish'
    | 'verify'
    | 'close';
type DialogState =
    | {
          kind: 'order-create';
          targetType?: 'equipment' | 'infrastructure';
          targetId?: number;
      }
    | { kind: 'equipment'; item?: Equipment }
    | { kind: 'infrastructure'; item?: Infrastructure }
    | {
          kind: 'plan';
          targetType: 'equipment' | 'infrastructure';
          item: Equipment | Infrastructure;
          plan?: MaintenancePlan;
      }
    | { kind: 'inspection'; item: Infrastructure }
    | { kind: 'equipment-work'; item: Equipment }
    | { kind: 'equipment-intervention'; item: Equipment }
    | { kind: 'order-action'; action: OrderAction; item: WorkOrder }
    | null;

const steps = [
    'Demande',
    'Approbation',
    'Planification',
    'Exécution',
    'Vérification',
    'Clôture',
];

const priorityLabels: Record<string, string> = {
    basse: 'Basse',
    normale: 'Normale',
    elevee: 'Élevée',
    urgente: 'Urgente',
};

const equipmentInterventionLabels: Record<string, string> = {
    preventif: 'Entretien préventif',
    correctif: 'Réparation corrective',
    reparation: 'Réparation lourde',
    controle: 'Contrôle / visite',
};

const priorityTone: Record<string, string> = {
    basse: 'bg-slate-100 text-slate-600 ring-slate-200',
    normale: 'bg-sky-50 text-sky-700 ring-sky-200',
    elevee: 'bg-amber-50 text-amber-800 ring-amber-200',
    urgente: 'bg-red-50 text-red-700 ring-red-200',
};

const statusTone: Record<string, string> = {
    demande: 'bg-amber-50 text-amber-800 ring-amber-200',
    approuve: 'bg-sky-50 text-sky-700 ring-sky-200',
    planifie: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    en_cours: 'bg-violet-50 text-violet-700 ring-violet-200',
    realise: 'bg-orange-50 text-orange-800 ring-orange-200',
    verifie: 'bg-teal-50 text-teal-700 ring-teal-200',
    clos: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    refuse: 'bg-slate-100 text-slate-600 ring-slate-200',
    annule: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const infrastructureTone: Record<string, string> = {
    bon: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    moyen: 'bg-amber-50 text-amber-800 ring-amber-200',
    mauvais: 'bg-orange-50 text-orange-800 ring-orange-200',
    critique: 'bg-red-50 text-red-700 ring-red-200',
    hors_service: 'bg-slate-900 text-white ring-slate-900',
};

const formatDate = (value?: string | null): string => {
    if (!value) {
        return '—';
    }

    const date = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
    );

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const money = (
    value: string | number | null | undefined,
    currency = 'USD',
): string =>
    new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value ?? 0));

const today = new Date().toISOString().slice(0, 10);

export default function Maintenance({
    orders,
    orderPagination,
    orderFilters,
    equipment,
    infrastructures,
    stats,
    sites,
    parcelles,
    users,
    articles,
    fuelArticles,
    units,
    options,
    permissions,
}: Props) {
    const page = usePage<{
        flash?: { success?: string };
        errors?: Record<string, string>;
    }>();
    const errors = page.props.errors ?? {};
    const requestedResource = new URLSearchParams(
        page.url.split('?')[1] ?? '',
    ).get('resource');
    const initialTab: Tab = ['orders', 'equipment', 'infrastructures'].includes(
        requestedResource ?? '',
    )
        ? (requestedResource as Tab)
        : 'orders';
    const tab = initialTab;
    const [query, setQuery] = useState(orderFilters.q);
    const requestedOrder = Number(
        new URLSearchParams(page.url.split('?')[1] ?? '').get('order'),
    );
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(
        Number.isFinite(requestedOrder) && requestedOrder > 0
            ? requestedOrder
            : null,
    );
    const [selectedEquipmentId, setSelectedEquipmentId] = useState<
        number | null
    >(null);
    const [selectedInfrastructureId, setSelectedInfrastructureId] = useState<
        number | null
    >(null);
    const [dialog, setDialog] = useState<DialogState>(null);
    const [submitting, setSubmitting] = useState(false);

    const selectedOrder =
        orders.find((order) => order.id === selectedOrderId) ?? null;
    const selectedEquipment =
        equipment.find((item) => item.id === selectedEquipmentId) ?? null;
    const selectedInfrastructure =
        infrastructures.find((item) => item.id === selectedInfrastructureId) ??
        null;

    const filteredOrders = orders;

    const filteredEquipment = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return equipment.filter((item) =>
            `${item.code} ${item.nom} ${item.marque ?? ''} ${item.modele ?? ''}`
                .toLocaleLowerCase('fr')
                .includes(needle),
        );
    }, [equipment, query]);

    const filteredInfrastructures = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return infrastructures.filter((item) =>
            `${item.code} ${item.nom} ${item.parcelle?.label ?? ''} ${item.localisation ?? ''} ${item.caracteristiques ?? ''}`
                .toLocaleLowerCase('fr')
                .includes(needle),
        );
    }, [infrastructures, query]);

    const updateOrderFilters = (
        filters: Partial<Props['orderFilters']> = {},
    ) => {
        router.get(
            '/maintenance',
            {
                resource: 'orders',
                statut: orderFilters.statut,
                nature: orderFilters.nature,
                priorite: orderFilters.priorite,
                q: query.trim(),
                ...filters,
            },
            {
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const submit = (
        event: React.FormEvent<HTMLFormElement>,
        path: string,
        method: 'post' | 'put' = 'post',
    ) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const createAnother =
            submitter instanceof HTMLButtonElement &&
            submitter.name === '_create_another';
        form.querySelectorAll<HTMLInputElement>(
            'input[type="checkbox"][name]',
        ).forEach((input) => data.set(input.name, input.checked ? '1' : '0'));
        setSubmitting(true);
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (createAnother) {
                    form.reset();
                } else {
                    setDialog(null);
                }
            },
            onFinish: () => setSubmitting(false),
        };

        if (method === 'put') {
            router.put(path, data, options);
        } else {
            router.post(path, data, options);
        }
    };

    const activeOrders = orders.filter(
        (order) => !['clos', 'refuse', 'annule'].includes(order.statut),
    );
    const underSevenDays = activeOrders.filter(
        (order) => order.open_days < 7,
    ).length;
    const sevenToThirtyDays = activeOrders.filter(
        (order) => order.open_days >= 7 && order.open_days <= 30,
    ).length;

    const resourceMeta: Record<
        Tab,
        { breadcrumb: string; title: string; description?: string }
    > = {
        orders: {
            breadcrumb: 'Ordres De Travail',
            title: 'Ordres de travail',
            description: `${stats.ouverts} ordre(s) ouvert(s) — ${stats.urgent} urgent(s), ${stats.stopped} à l’arrêt · ancienneté : ${underSevenDays} de moins de 7 j, ${sevenToThirtyDays} de 7 à 30 j, ${stats.over_30_days} de plus de 30 j.`,
        },
        equipment: {
            breadcrumb: 'Équipements',
            title: 'Équipements',
        },
        infrastructures: {
            breadcrumb: 'Infrastructures',
            title: 'Infrastructures',
            description:
                'Une infrastructure ne se suit pas au compteur mais par inspection d’état. Un état mauvais ou critique ouvre automatiquement un ordre de travail.',
        },
    };
    const meta = resourceMeta[tab];
    const showingOrder = tab === 'orders' && selectedOrder !== null;
    const showingEquipment = tab === 'equipment' && selectedEquipment !== null;
    const showingInfrastructure =
        tab === 'infrastructures' && selectedInfrastructure !== null;
    const showingDetail =
        showingOrder || showingEquipment || showingInfrastructure;
    const embeddedDialog =
        dialog?.kind === 'order-create' ||
        dialog?.kind === 'equipment' ||
        dialog?.kind === 'infrastructure';
    const embeddedTitle =
        dialog?.kind === 'order-create'
            ? 'Create Ordre De Travail'
            : dialog?.kind === 'equipment'
              ? dialog.item
                  ? `Edit ${dialog.item.code}`
                  : 'Create Équipement'
              : dialog?.kind === 'infrastructure'
                ? dialog.item
                    ? `Edit ${dialog.item.code}`
                    : 'Create Infrastructure'
                : null;
    const currentHeading =
        embeddedTitle ??
        (showingOrder
            ? selectedOrder.reference
            : showingEquipment
              ? selectedEquipment.nom
              : showingInfrastructure
                ? selectedInfrastructure.nom
                : meta.title);

    return (
        <>
            <Head title={currentHeading} />
            <main className="maintenance-filament min-h-[calc(100vh-4rem)] bg-[#f9fafb] px-4 py-6 text-[#111827] sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <nav
                        className="flex items-center gap-2 text-sm text-[#6b7280]"
                        aria-label="Fil d’Ariane"
                    >
                        <span>{meta.breadcrumb}</span>
                        <ChevronRight size={14} />
                        <span>
                            {embeddedDialog
                                ? dialog?.kind === 'equipment' && dialog.item
                                    ? 'Edit'
                                    : dialog?.kind === 'infrastructure' &&
                                        dialog.item
                                      ? 'Edit'
                                      : 'Create'
                                : showingDetail
                                  ? 'View'
                                  : 'List'}
                        </span>
                    </nav>

                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">
                                {currentHeading}
                            </h1>
                            {embeddedDialog ? null : showingOrder ? (
                                <p className="mt-1.5 text-sm text-[#6b7280]">
                                    {selectedOrder.objet} ·{' '}
                                    {selectedOrder.cible_libelle ||
                                        'Travaux généraux'}
                                </p>
                            ) : showingEquipment ? (
                                <p className="mt-1.5 text-sm text-[#6b7280]">
                                    {selectedEquipment.code} ·{' '}
                                    {options.equipmentCategories[
                                        selectedEquipment.categorie
                                    ] ?? selectedEquipment.categorie}
                                </p>
                            ) : showingInfrastructure ? (
                                <p className="mt-1.5 text-sm text-[#6b7280]">
                                    {selectedInfrastructure.code} ·{' '}
                                    {options.infrastructureCategories[
                                        selectedInfrastructure.categorie
                                    ] ?? selectedInfrastructure.categorie}
                                </p>
                            ) : (
                                meta.description && (
                                    <p className="mt-1.5 max-w-4xl text-sm leading-6 text-[#6b7280]">
                                        {meta.description}
                                    </p>
                                )
                            )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            {embeddedDialog ? (
                                <button
                                    type="button"
                                    onClick={() => setDialog(null)}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] shadow-sm transition hover:bg-[#f9fafb]"
                                >
                                    <ArrowLeft size={16} /> Cancel
                                </button>
                            ) : showingDetail ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedOrderId(null);
                                        setSelectedEquipmentId(null);
                                        setSelectedInfrastructureId(null);
                                    }}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] shadow-sm transition hover:bg-[#f9fafb]"
                                >
                                    <ArrowLeft size={16} /> Retour à la liste
                                </button>
                            ) : (
                                <>
                                    {tab === 'orders' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDialog({
                                                    kind: 'order-create',
                                                })
                                            }
                                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a5632] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#154629]"
                                        >
                                            <Plus size={16} /> Nouvel ordre de
                                            travail
                                        </button>
                                    )}
                                    {permissions.canManage &&
                                        tab === 'equipment' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDialog({
                                                        kind: 'equipment',
                                                    })
                                                }
                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a5632] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#154629]"
                                            >
                                                <Plus size={16} /> Nouvel
                                                équipement
                                            </button>
                                        )}
                                    {permissions.canManage &&
                                        tab === 'infrastructures' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDialog({
                                                        kind: 'infrastructure',
                                                    })
                                                }
                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a5632] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#154629]"
                                            >
                                                <Plus size={16} /> Nouvelle
                                                infrastructure
                                            </button>
                                        )}
                                </>
                            )}
                        </div>
                    </header>

                    {(page.props.flash?.success ||
                        Object.keys(errors).length > 0) && (
                        <section
                            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${Object.keys(errors).length > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}
                        >
                            {Object.keys(errors).length > 0 ? (
                                <AlertCircle
                                    className="mt-0.5 shrink-0"
                                    size={18}
                                />
                            ) : (
                                <CheckCircle2
                                    className="mt-0.5 shrink-0"
                                    size={18}
                                />
                            )}
                            <div>
                                {page.props.flash?.success && (
                                    <p className="font-semibold">
                                        {page.props.flash.success}
                                    </p>
                                )}
                                {Object.entries(errors).map(
                                    ([key, message]) => (
                                        <p key={key}>{message}</p>
                                    ),
                                )}
                            </div>
                        </section>
                    )}

                    {embeddedDialog && dialog && (
                        <MaintenanceDialog
                            dialog={dialog}
                            options={options}
                            equipment={equipment}
                            infrastructures={infrastructures}
                            sites={sites}
                            parcelles={parcelles}
                            users={users}
                            articles={articles}
                            fuelArticles={fuelArticles}
                            units={units}
                            submitting={submitting}
                            embedded
                            onClose={() => setDialog(null)}
                            onSubmit={submit}
                        />
                    )}

                    <section
                        className={`${embeddedDialog ? 'hidden' : ''} overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm`}
                    >
                        {!showingDetail && (
                            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-[#6b7280]">
                                    {tab === 'orders' &&
                                        `${orderPagination.total} ordre(s)`}
                                    {tab === 'equipment' &&
                                        `${filteredEquipment.length} équipement(s)`}
                                    {tab === 'infrastructures' &&
                                        `${filteredInfrastructures.length} infrastructure(s)`}
                                </p>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {tab === 'orders' && (
                                        <label className="relative">
                                            <ListFilter
                                                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6b7280]"
                                                size={15}
                                            />
                                            <select
                                                value={orderFilters.statut}
                                                onChange={(event) =>
                                                    updateOrderFilters({
                                                        statut: event.target
                                                            .value,
                                                    })
                                                }
                                                aria-label="Filtrer par statut"
                                                className="h-9 rounded-lg border border-[#d1d5db] bg-white pr-8 pl-9 text-sm text-[#374151] shadow-sm outline-none focus:border-[#1a5632] focus:ring-2 focus:ring-[#1a5632]/15"
                                            >
                                                <option value="open">
                                                    Ordres ouverts
                                                </option>
                                                <option value="all">
                                                    Tous les statuts
                                                </option>
                                                {Object.entries(
                                                    options.orderStatuses,
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {tab === 'orders' && (
                                        <select
                                            value={orderFilters.nature}
                                            onChange={(event) =>
                                                updateOrderFilters({
                                                    nature: event.target.value,
                                                })
                                            }
                                            aria-label="Filtrer par nature"
                                            className="h-9 rounded-lg border border-[#d1d5db] bg-white px-3 pr-8 text-sm text-[#374151] shadow-sm outline-none focus:border-[#1a5632] focus:ring-2 focus:ring-[#1a5632]/15"
                                        >
                                            <option value="all">
                                                Toutes les natures
                                            </option>
                                            {Object.entries(
                                                options.orderTypes,
                                            ).map(([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {tab === 'orders' && (
                                        <select
                                            value={orderFilters.priorite}
                                            onChange={(event) =>
                                                updateOrderFilters({
                                                    priorite:
                                                        event.target.value,
                                                })
                                            }
                                            aria-label="Filtrer par priorité"
                                            className="h-9 rounded-lg border border-[#d1d5db] bg-white px-3 pr-8 text-sm text-[#374151] shadow-sm outline-none focus:border-[#1a5632] focus:ring-2 focus:ring-[#1a5632]/15"
                                        >
                                            <option value="all">
                                                Toutes les priorités
                                            </option>
                                            {Object.entries(priorityLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    )}
                                    <label className="relative min-w-56 flex-1 sm:flex-none">
                                        <Search
                                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6b7280]"
                                            size={15}
                                        />
                                        <input
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    tab === 'orders' &&
                                                    event.key === 'Enter'
                                                ) {
                                                    event.preventDefault();
                                                    updateOrderFilters();
                                                }
                                            }}
                                            placeholder="Search"
                                            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white pr-3 pl-9 text-sm text-[#111827] shadow-sm outline-none placeholder:text-[#9ca3af] focus:border-[#1a5632] focus:ring-2 focus:ring-[#1a5632]/15 sm:w-64"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            tab === 'orders' &&
                                            updateOrderFilters()
                                        }
                                        aria-label="Appliquer les filtres"
                                        className="grid size-9 place-items-center rounded-lg border border-[#d1d5db] bg-white text-[#4b5563] shadow-sm hover:bg-[#f9fafb]"
                                    >
                                        <ListFilter size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {tab === 'orders' && (
                            <OrdersView
                                orders={filteredOrders}
                                selected={selectedOrder}
                                statuses={options.orderStatuses}
                                types={options.orderTypes}
                                origins={options.orderOrigins}
                                permits={options.workPermits}
                                pagination={orderPagination}
                                permissions={permissions}
                                onSelect={setSelectedOrderId}
                                onAction={(action, item) =>
                                    setDialog({
                                        kind: 'order-action',
                                        action,
                                        item,
                                    })
                                }
                            />
                        )}
                        {tab === 'equipment' && (
                            <EquipmentView
                                items={filteredEquipment}
                                selected={selectedEquipment}
                                categories={options.equipmentCategories}
                                statuses={options.equipmentStatuses}
                                canManage={permissions.canManage}
                                onSelect={setSelectedEquipmentId}
                                onEdit={(item) =>
                                    setDialog({ kind: 'equipment', item })
                                }
                                onPlan={(item, plan) =>
                                    setDialog({
                                        kind: 'plan',
                                        targetType: 'equipment',
                                        item,
                                        plan,
                                    })
                                }
                                onAddWork={(item) =>
                                    setDialog({ kind: 'equipment-work', item })
                                }
                                onAddIntervention={(item) =>
                                    setDialog({
                                        kind: 'equipment-intervention',
                                        item,
                                    })
                                }
                            />
                        )}
                        {tab === 'infrastructures' && (
                            <InfrastructureView
                                items={filteredInfrastructures}
                                selected={selectedInfrastructure}
                                categories={options.infrastructureCategories}
                                states={options.infrastructureStates}
                                canManage={permissions.canManage}
                                onSelect={setSelectedInfrastructureId}
                                onEdit={(item) =>
                                    setDialog({ kind: 'infrastructure', item })
                                }
                                onPlan={(item, plan) =>
                                    setDialog({
                                        kind: 'plan',
                                        targetType: 'infrastructure',
                                        item,
                                        plan,
                                    })
                                }
                                onInspect={(item) =>
                                    setDialog({ kind: 'inspection', item })
                                }
                                onCreateOrder={(item) =>
                                    setDialog({
                                        kind: 'order-create',
                                        targetType: 'infrastructure',
                                        targetId: item.id,
                                    })
                                }
                            />
                        )}
                    </section>
                </div>
            </main>

            {dialog && !embeddedDialog && (
                <MaintenanceDialog
                    dialog={dialog}
                    options={options}
                    equipment={equipment}
                    infrastructures={infrastructures}
                    sites={sites}
                    parcelles={parcelles}
                    users={users}
                    articles={articles}
                    fuelArticles={fuelArticles}
                    units={units}
                    submitting={submitting}
                    onClose={() => setDialog(null)}
                    onSubmit={submit}
                />
            )}
        </>
    );
}

function OrdersView({
    orders,
    selected,
    statuses,
    types,
    origins,
    permits,
    pagination,
    permissions,
    onSelect,
    onAction,
}: {
    orders: WorkOrder[];
    selected: WorkOrder | null;
    statuses: Record<string, string>;
    types: Record<string, string>;
    origins: Record<string, string>;
    permits: Record<string, string>;
    pagination: Props['orderPagination'];
    permissions: Props['permissions'];
    onSelect: (id: number) => void;
    onAction: (action: OrderAction, item: WorkOrder) => void;
}) {
    if (selected) {
        return (
            <div className="bg-[#f9fafb]">
                <OrderDetail
                    order={selected}
                    statuses={statuses}
                    types={types}
                    origins={origins}
                    permits={permits}
                    permissions={permissions}
                    onAction={onAction}
                />
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="bg-white text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Réf.</th>
                            <th className="px-4 py-3">Objet</th>
                            <th className="px-4 py-3">Nature</th>
                            <th className="px-4 py-3">Priorité</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3">Échéance</th>
                            <th className="px-4 py-3">Statut</th>
                            {permissions.canManage && (
                                <th className="px-4 py-3 text-right">Coût</th>
                            )}
                            <th className="px-4 py-3">Récurrent</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {orders.map((order, index) => (
                            <tr
                                key={order.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 align-top">
                                    <button
                                        type="button"
                                        onClick={() => onSelect(order.id)}
                                        className="font-semibold text-[#1a5632] hover:underline"
                                    >
                                        {order.reference}
                                    </button>
                                    <span className="mt-0.5 block text-xs text-[#6b7280]">
                                        {origins[order.origine] ??
                                            order.origine}
                                    </span>
                                </td>
                                <td className="max-w-64 px-4 py-3 align-top">
                                    <span className="block font-medium text-[#111827]">
                                        {order.objet}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-[#6b7280]">
                                        {order.cible_libelle ||
                                            'Travaux généraux'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={
                                            order.type_intervention ===
                                            'preventif'
                                                ? 'bg-green-50 text-green-700 ring-green-200'
                                                : 'bg-amber-50 text-amber-700 ring-amber-200'
                                        }
                                    >
                                        {types[order.type_intervention] ??
                                            order.type_intervention}
                                    </Pill>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={priorityTone[order.priorite]}
                                    >
                                        {priorityLabels[order.priorite] ??
                                            order.priorite}
                                    </Pill>
                                    {order.arret_production && (
                                        <span className="mt-1.5 block text-[10px] font-bold text-red-700">
                                            ARRÊT PRODUCTION
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    {order.responsable?.name ?? '—'}
                                    {order.prestataire && (
                                        <span className="mt-0.5 block text-xs text-[#6b7280]">
                                            {order.prestataire}
                                        </span>
                                    )}
                                </td>
                                <td
                                    className={`px-4 py-3 align-top ${order.late ? 'font-semibold text-red-700' : 'text-[#374151]'}`}
                                >
                                    {formatDate(order.echeance)}
                                    <span className="mt-0.5 block text-xs text-[#6b7280]">
                                        ouvert depuis {order.open_days} j
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill className={statusTone[order.statut]}>
                                        {statuses[order.statut] ?? order.statut}
                                    </Pill>
                                </td>
                                {permissions.canManage && (
                                    <td className="px-4 py-3 text-right align-top font-medium text-[#374151]">
                                        {order.costs
                                            ? money(order.costs.total)
                                            : '—'}
                                    </td>
                                )}
                                <td className="px-4 py-3 align-top">
                                    {order.recurrent ? (
                                        <Pill className="bg-red-50 text-red-700 ring-red-200">
                                            RÉCURRENT
                                        </Pill>
                                    ) : (
                                        <span className="text-[#9ca3af]">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="flex justify-end gap-3 whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => onSelect(order.id)}
                                            className="inline-flex items-center gap-1.5 font-medium text-[#1a5632] hover:underline"
                                        >
                                            <Eye size={15} /> Ouvrir
                                        </button>
                                        {permissions.canManage &&
                                            order.statut === 'demande' &&
                                            order.demandeur_id !==
                                                permissions.userId && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onAction(
                                                            'approve',
                                                            order,
                                                        )
                                                    }
                                                    className="font-medium text-[#1a5632] hover:underline"
                                                >
                                                    Approuver
                                                </button>
                                            )}
                                        {permissions.canManage &&
                                            ['demande', 'approuve'].includes(
                                                order.statut,
                                            ) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onAction(
                                                            'refuse',
                                                            order,
                                                        )
                                                    }
                                                    className="font-medium text-red-700 hover:underline"
                                                >
                                                    Refuser
                                                </button>
                                            )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr className="hidden sm:table-row">
                                <td colSpan={permissions.canManage ? 10 : 9}>
                                    <EmptyState
                                        icon={ClipboardCheck}
                                        title="No ordres de travail"
                                        text="Create an ordre de travail to get started."
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {orders.length === 0 && (
                <div className="sm:hidden">
                    <EmptyState
                        icon={ClipboardCheck}
                        title="No ordres de travail"
                        text="Create an ordre de travail to get started."
                    />
                </div>
            )}
            {orders.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] px-4 py-3 text-sm text-[#6b7280]">
                    <span>
                        Résultats {pagination.from ?? 0}–{pagination.to ?? 0}{' '}
                        sur {pagination.total}
                    </span>
                    {pagination.lastPage > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!pagination.previousUrl}
                                onClick={() =>
                                    pagination.previousUrl &&
                                    router.visit(pagination.previousUrl, {
                                        preserveScroll: true,
                                    })
                                }
                                className="h-8 rounded-lg border border-[#d1d5db] bg-white px-3 font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Précédent
                            </button>
                            <span>
                                Page {pagination.currentPage} /{' '}
                                {pagination.lastPage}
                            </span>
                            <button
                                type="button"
                                disabled={!pagination.nextUrl}
                                onClick={() =>
                                    pagination.nextUrl &&
                                    router.visit(pagination.nextUrl, {
                                        preserveScroll: true,
                                    })
                                }
                                className="h-8 rounded-lg border border-[#d1d5db] bg-white px-3 font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function OrderDetail({
    order,
    statuses,
    types,
    origins,
    permits,
    permissions,
    onAction,
}: {
    order: WorkOrder;
    statuses: Record<string, string>;
    types: Record<string, string>;
    origins: Record<string, string>;
    permits: Record<string, string>;
    permissions: Props['permissions'];
    onAction: (action: OrderAction, item: WorkOrder) => void;
}) {
    const terminal = ['clos', 'refuse', 'annule'].includes(order.statut);
    const canExecute =
        permissions.canManage ||
        order.responsable_id === permissions.userId ||
        (!order.responsable_id && order.demandeur_id === permissions.userId);

    return (
        <article className="space-y-6 bg-[#f9fafb] p-5 sm:p-6">
            <header className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold tracking-wide text-[#1a5632] uppercase">
                                {order.reference}
                            </span>
                            <Pill className={statusTone[order.statut]}>
                                {statuses[order.statut] ?? order.statut}
                            </Pill>
                            <Pill className={priorityTone[order.priorite]}>
                                {priorityLabels[order.priorite] ??
                                    order.priorite}
                            </Pill>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
                            {order.objet}
                        </h2>
                        <p className="mt-2 text-sm text-[#6b7280]">
                            {order.cible_libelle || 'Travaux généraux'} ·
                            demandé par{' '}
                            {order.demandeur?.name ?? order.demandeur_nom} le{' '}
                            {formatDateTime(order.demande_le)}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {permissions.canManage &&
                            order.statut === 'demande' &&
                            order.demandeur_id !== permissions.userId && (
                                <ActionButton
                                    label="Approuver"
                                    icon={Check}
                                    onClick={() => onAction('approve', order)}
                                />
                            )}
                        {permissions.canManage &&
                            ['demande', 'approuve'].includes(order.statut) && (
                                <ActionButton
                                    label="Refuser"
                                    icon={XCircle}
                                    tone="danger"
                                    onClick={() => onAction('refuse', order)}
                                />
                            )}
                        {permissions.canManage &&
                            order.statut === 'approuve' && (
                                <ActionButton
                                    label="Planifier"
                                    icon={CalendarClock}
                                    onClick={() => onAction('plan', order)}
                                />
                            )}
                        {canExecute &&
                            ['approuve', 'planifie'].includes(order.statut) && (
                                <ActionButton
                                    label="Démarrer"
                                    icon={Play}
                                    onClick={() => onAction('start', order)}
                                />
                            )}
                        {canExecute &&
                            ['planifie', 'en_cours', 'realise'].includes(
                                order.statut,
                            ) && (
                                <ActionButton
                                    label="Pièce"
                                    icon={PackagePlus}
                                    tone="neutral"
                                    onClick={() => onAction('piece', order)}
                                />
                            )}
                        {canExecute &&
                            ['en_cours', 'realise'].includes(order.statut) && (
                                <ActionButton
                                    label="Temps"
                                    icon={Clock3}
                                    tone="neutral"
                                    onClick={() => onAction('time', order)}
                                />
                            )}
                        {canExecute && order.statut === 'en_cours' && (
                            <ActionButton
                                label="Terminer"
                                icon={CheckCircle2}
                                onClick={() => onAction('finish', order)}
                            />
                        )}
                        {permissions.canManage &&
                            order.statut === 'realise' && (
                                <ActionButton
                                    label="Vérifier"
                                    icon={ShieldCheck}
                                    onClick={() => onAction('verify', order)}
                                />
                            )}
                        {permissions.canManage &&
                            order.statut === 'verifie' && (
                                <ActionButton
                                    label="Clore"
                                    icon={CheckCircle2}
                                    onClick={() => onAction('close', order)}
                                />
                            )}
                    </div>
                </div>

                {!terminal && (
                    <div className="mt-7 overflow-x-auto pb-2">
                        <div className="flex min-w-[620px] items-start">
                            {steps.map((step, index) => {
                                const passed = index < order.current_step;
                                const current = index === order.current_step;

                                return (
                                    <div
                                        key={step}
                                        className="relative flex flex-1 flex-col items-center text-center"
                                    >
                                        {index > 0 && (
                                            <span
                                                className={`absolute top-3.5 right-1/2 h-0.5 w-full ${passed || current ? 'bg-[#2e7d32]' : 'bg-[#d1d5db]'}`}
                                            />
                                        )}
                                        <span
                                            className={`relative z-10 grid size-7 place-items-center rounded-full border-2 text-[11px] font-semibold ${passed ? 'border-[#2e7d32] bg-[#2e7d32] text-white' : current ? 'border-[#e8871e] bg-[#e8871e] text-white' : 'border-[#d1d5db] bg-white text-[#9ca3af]'}`}
                                        >
                                            {passed ? (
                                                <Check size={13} />
                                            ) : (
                                                index + 1
                                            )}
                                        </span>
                                        <span
                                            className={`mt-2 text-[11px] font-medium ${passed ? 'text-[#2e7d32]' : current ? 'text-[#b45309]' : 'text-[#9ca3af]'}`}
                                        >
                                            {step}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {(order.recurrent ||
                order.arret_production ||
                order.consignation_requise) && (
                <div className="grid gap-3 md:grid-cols-3">
                    {order.recurrent && (
                        <AlertBox
                            icon={TriangleAlert}
                            title="Panne récurrente"
                            text="La cause racine est obligatoire avant la fin des travaux."
                            tone="danger"
                        />
                    )}
                    {order.arret_production && (
                        <AlertBox
                            icon={AlertTriangle}
                            title="Arrêt de production"
                            text={
                                order.consequence || 'Conséquence non précisée.'
                            }
                            tone="warning"
                        />
                    )}
                    {order.consignation_requise && (
                        <AlertBox
                            icon={ShieldCheck}
                            title="Consignation obligatoire"
                            text={
                                order.consignation_faite
                                    ? 'Mise hors énergie confirmée.'
                                    : 'Le démarrage reste bloqué sans confirmation.'
                            }
                            tone="danger"
                        />
                    )}
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-3">
                <section className="rounded-xl border border-[#e5e7eb] bg-white p-5 xl:col-span-2">
                    <h3 className="text-base font-semibold text-[#111827]">
                        Intervention
                    </h3>
                    <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                        <Detail
                            label="Origine"
                            value={origins[order.origine] ?? order.origine}
                        />
                        <Detail
                            label="Nature"
                            value={
                                types[order.type_intervention] ??
                                order.type_intervention
                            }
                        />
                        <Detail
                            label="Responsable"
                            value={
                                order.responsable?.name ??
                                order.prestataire ??
                                'À assigner'
                            }
                        />
                        <Detail
                            label="Échéance"
                            value={formatDate(order.echeance)}
                            danger={order.late}
                        />
                        <Detail
                            label="Site"
                            value={
                                order.site
                                    ? `${order.site.code} — ${order.site.nom}`
                                    : '—'
                            }
                        />
                        <Detail
                            label="Permis"
                            value={
                                permits[order.permis_travail ?? 'aucun'] ??
                                order.permis_travail ??
                                'Aucun'
                            }
                        />
                    </dl>
                    {order.description && (
                        <div className="mt-5 border-t border-[#edf1ed] pt-4">
                            <p className="text-xs font-bold text-[#7a877f] uppercase">
                                Problème constaté
                            </p>
                            <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-[#3f4f46]">
                                {order.description}
                            </p>
                        </div>
                    )}
                    {(order.photo_before_url || order.photo_after_url) && (
                        <div className="mt-5 border-t border-[#edf1ed] pt-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#7a877f] uppercase">
                                <Camera size={14} /> Preuves photographiques
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                {order.photo_before_url && (
                                    <a
                                        href={order.photo_before_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group overflow-hidden rounded-xl border border-[#dce5de] bg-[#f6f8f6]"
                                    >
                                        <img
                                            src={order.photo_before_url}
                                            alt={`Problème avant intervention — ${order.reference}`}
                                            loading="lazy"
                                            className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
                                        />
                                        <span className="block px-3 py-2 text-xs font-bold text-[#526a5d]">
                                            Avant
                                        </span>
                                    </a>
                                )}
                                {order.photo_after_url && (
                                    <a
                                        href={order.photo_after_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="group overflow-hidden rounded-xl border border-[#dce5de] bg-[#f6f8f6]"
                                    >
                                        <img
                                            src={order.photo_after_url}
                                            alt={`Résultat après intervention — ${order.reference}`}
                                            loading="lazy"
                                            className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
                                        />
                                        <span className="block px-3 py-2 text-xs font-bold text-[#526a5d]">
                                            Après
                                        </span>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                    {order.travaux_realises && (
                        <div className="mt-5 rounded-xl bg-emerald-50 p-4">
                            <p className="text-xs font-bold text-emerald-700 uppercase">
                                Travaux réalisés
                            </p>
                            <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap text-emerald-950">
                                {order.travaux_realises}
                            </p>
                            {order.cause_racine && (
                                <p className="mt-3 border-t border-emerald-200 pt-3 text-sm text-emerald-950">
                                    <b>Cause racine :</b> {order.cause_racine}
                                </p>
                            )}
                        </div>
                    )}
                    {order.motif_refus && (
                        <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                            <b>Motif du refus :</b> {order.motif_refus}
                        </div>
                    )}
                </section>

                <div className="space-y-5">
                    {order.costs && (
                        <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                            <div className="flex items-center gap-2">
                                <CircleDollarSign
                                    size={18}
                                    className="text-[#a1742e]"
                                />
                                <h3 className="text-base font-semibold text-[#111827]">
                                    Coûts
                                </h3>
                            </div>
                            <div className="mt-4 space-y-2 text-sm">
                                <CostRow
                                    label="Pièces"
                                    value={money(order.costs.pieces)}
                                />
                                <CostRow
                                    label="Main-d’œuvre"
                                    value={money(order.costs.labor)}
                                />
                                <CostRow
                                    label="Prestataire"
                                    value={money(order.costs.provider)}
                                />
                                <CostRow
                                    label="Total"
                                    value={money(order.costs.total)}
                                    total
                                />
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                        <div className="flex items-center gap-2">
                            <History size={18} className="text-[#1a5632]" />
                            <h3 className="text-base font-semibold text-[#111827]">
                                Journal de l’ordre
                            </h3>
                        </div>
                        <div className="mt-5 space-y-4">
                            {order.events.map((event, index) => (
                                <div
                                    key={event.id}
                                    className="relative grid grid-cols-[24px_1fr] gap-3"
                                >
                                    {index < order.events.length - 1 && (
                                        <span className="absolute top-6 bottom-[-16px] left-[11px] w-px bg-[#e5e7eb]" />
                                    )}
                                    <span className="relative z-10 mt-0.5 grid size-6 place-items-center rounded-full bg-green-50 text-[#1a5632] ring-1 ring-green-200">
                                        <Check size={12} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-[#111827]">
                                            {event.resume}
                                        </p>
                                        <p className="mt-1 text-xs text-[#6b7280]">
                                            {formatDateTime(event.created_at)} ·{' '}
                                            {event.user_nom}
                                        </p>
                                        {event.detail && (
                                            <p className="mt-1 text-xs leading-5 text-[#4b5563]">
                                                {event.detail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {order.events.length === 0 && (
                                <p className="text-sm text-[#6b7280]">
                                    Aucun événement.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <WorkOrderPiecesTable
                order={order}
                canAdd={
                    canExecute &&
                    ['planifie', 'en_cours', 'realise'].includes(order.statut)
                }
                onAdd={() => onAction('piece', order)}
            />
            <WorkOrderTimeTable
                order={order}
                canAdd={
                    canExecute && ['en_cours', 'realise'].includes(order.statut)
                }
                onAdd={() => onAction('time', order)}
            />
        </article>
    );
}

function WorkOrderPiecesTable({
    order,
    canAdd,
    onAdd,
}: {
    order: WorkOrder;
    canAdd: boolean;
    onAdd: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4">
                <h3 className="text-base font-semibold text-[#111827]">
                    Pièces et consommables
                </h3>
                {canAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <PackagePlus size={14} /> Poser une pièce
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Pièce</th>
                            <th className="px-4 py-3">Quantité</th>
                            <th className="px-4 py-3">Provenance</th>
                            {order.costs && (
                                <th className="px-4 py-3 text-right">Coût</th>
                            )}
                            <th className="px-4 py-3">Mouvement</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {order.pieces.map((piece, index) => (
                            <tr
                                key={piece.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 font-medium text-[#111827]">
                                    {piece.designation}
                                </td>
                                <td className="px-4 py-3 text-[#374151]">
                                    {piece.quantite} {piece.unite ?? ''}
                                </td>
                                <td className="px-4 py-3 text-[#374151]">
                                    {piece.origine_piece}
                                </td>
                                {order.costs && (
                                    <td className="px-4 py-3 text-right text-[#374151]">
                                        {money(piece.cout)}
                                    </td>
                                )}
                                <td className="px-4 py-3 text-[#6b7280]">
                                    {piece.article?.code ?? '—'}
                                </td>
                            </tr>
                        ))}
                        {order.pieces.length === 0 && (
                            <tr>
                                <td
                                    colSpan={order.costs ? 5 : 4}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucune pièce.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function WorkOrderTimeTable({
    order,
    canAdd,
    onAdd,
}: {
    order: WorkOrder;
    canAdd: boolean;
    onAdd: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4">
                <h3 className="text-base font-semibold text-[#111827]">
                    Main-d’œuvre
                </h3>
                {canAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <Clock3 size={14} /> Pointer du temps
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Intervenant</th>
                            <th className="px-4 py-3">Heures</th>
                            <th className="px-4 py-3">Travail effectué</th>
                            {order.costs && (
                                <th className="px-4 py-3 text-right">Coût</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {order.time_entries.map((entry, index) => (
                            <tr
                                key={entry.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 text-[#374151]">
                                    {formatDate(entry.date)}
                                </td>
                                <td className="px-4 py-3 font-medium text-[#111827]">
                                    {entry.intervenant_nom}
                                </td>
                                <td className="px-4 py-3 text-[#374151]">
                                    {entry.heures} h
                                </td>
                                <td className="px-4 py-3 text-[#374151]">
                                    {entry.travail || '—'}
                                </td>
                                {order.costs && (
                                    <td className="px-4 py-3 text-right text-[#374151]">
                                        {money(entry.cout)}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {order.time_entries.length === 0 && (
                            <tr>
                                <td
                                    colSpan={order.costs ? 5 : 4}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucun temps pointé.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function EquipmentView({
    items,
    selected,
    categories,
    statuses,
    canManage,
    onSelect,
    onEdit,
    onPlan,
    onAddWork,
    onAddIntervention,
}: {
    items: Equipment[];
    selected: Equipment | null;
    categories: Record<string, string>;
    statuses: Record<string, string>;
    canManage: boolean;
    onSelect: (id: number) => void;
    onEdit: (item: Equipment) => void;
    onPlan: (item: Equipment, plan?: MaintenancePlan) => void;
    onAddWork: (item: Equipment) => void;
    onAddIntervention: (item: Equipment) => void;
}) {
    if (selected) {
        return (
            <EquipmentDetail
                item={selected}
                categories={categories}
                statuses={statuses}
                canManage={canManage}
                onPlan={onPlan}
                onAddWork={onAddWork}
                onAddIntervention={onAddIntervention}
            />
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[13px]">
                    <thead className="bg-white text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Équipement</th>
                            <th className="px-4 py-3">Catégorie</th>
                            <th className="px-4 py-3">Compteur</th>
                            <th className="px-4 py-3">Entretien</th>
                            <th className="px-4 py-3">Statut</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {items.map((item, index) => {
                            const equipmentTone =
                                item.statut === 'disponible'
                                    ? 'bg-green-50 text-green-700 ring-green-200'
                                    : item.statut === 'en_service'
                                      ? 'bg-blue-50 text-blue-700 ring-blue-200'
                                      : item.statut === 'maintenance'
                                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                        : 'bg-red-50 text-red-700 ring-red-200';

                            return (
                                <tr
                                    key={item.id}
                                    className={
                                        index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                    }
                                >
                                    <td className="px-4 py-3 align-top font-semibold whitespace-nowrap text-[#1a5632]">
                                        {item.code}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <span className="block font-medium text-[#111827]">
                                            {item.nom}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-[#6b7280]">
                                            {[item.marque, item.modele]
                                                .filter(Boolean)
                                                .join(' ') || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <Pill className="bg-gray-50 text-gray-700 ring-gray-200">
                                            {categories[item.categorie] ??
                                                item.categorie}
                                        </Pill>
                                    </td>
                                    <td className="px-4 py-3 align-top text-[#374151]">
                                        <span className="inline-flex items-center gap-1.5">
                                            <Gauge size={14} />{' '}
                                            {item.counter_label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        {item.maintenance_due.length ? (
                                            <>
                                                <Pill className="bg-red-50 text-red-700 ring-red-200">
                                                    {
                                                        item.maintenance_due
                                                            .length
                                                    }{' '}
                                                    échéance(s)
                                                </Pill>
                                                <span className="mt-1 block max-w-52 text-xs text-[#6b7280]">
                                                    {item.maintenance_due
                                                        .map((due) => due.label)
                                                        .join(' · ')}
                                                </span>
                                            </>
                                        ) : (
                                            <Pill className="bg-green-50 text-green-700 ring-green-200">
                                                À jour
                                            </Pill>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <Pill className={equipmentTone}>
                                            {statuses[item.statut] ??
                                                item.statut}
                                        </Pill>
                                        {item.motif_immobilisation && (
                                            <span className="mt-1 block max-w-48 text-xs text-red-700">
                                                {item.motif_immobilisation}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top text-[#374151]">
                                        {item.responsable?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex justify-end gap-3 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onSelect(item.id)
                                                }
                                                className="inline-flex items-center gap-1.5 font-medium text-[#1a5632] hover:underline"
                                            >
                                                <Eye size={15} /> Ouvrir
                                            </button>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(item)}
                                                    className="inline-flex items-center gap-1.5 font-medium text-[#1a5632] hover:underline"
                                                >
                                                    <Pencil size={15} /> Edit
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {items.length === 0 && (
                            <tr className="hidden sm:table-row">
                                <td colSpan={8}>
                                    <EmptyState
                                        icon={Tractor}
                                        title="No équipements"
                                        text="Create an équipement to get started."
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {items.length === 0 && (
                <div className="sm:hidden">
                    <EmptyState
                        icon={Tractor}
                        title="No équipements"
                        text="Create an équipement to get started."
                    />
                </div>
            )}
            {items.length > 0 && (
                <div className="border-t border-[#e5e7eb] px-4 py-3 text-sm text-[#6b7280]">
                    Showing {items.length} results
                </div>
            )}
        </div>
    );
}

function EquipmentDetail({
    item,
    categories,
    statuses,
    canManage,
    onPlan,
    onAddWork,
    onAddIntervention,
}: {
    item: Equipment;
    categories: Record<string, string>;
    statuses: Record<string, string>;
    canManage: boolean;
    onPlan: (item: Equipment, plan?: MaintenancePlan) => void;
    onAddWork: (item: Equipment) => void;
    onAddIntervention: (item: Equipment) => void;
}) {
    const [activeHistoryTab, setActiveHistoryTab] = useState<
        'work' | 'plans' | 'interventions'
    >('work');
    const equipmentTone =
        item.statut === 'disponible'
            ? 'bg-green-50 text-green-700 ring-green-200'
            : item.statut === 'en_service'
              ? 'bg-blue-50 text-blue-700 ring-blue-200'
              : item.statut === 'maintenance'
                ? 'bg-amber-50 text-amber-700 ring-amber-200'
                : 'bg-red-50 text-red-700 ring-red-200';

    return (
        <article className="space-y-6 bg-[#f9fafb] p-5 sm:p-6">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#1a5632]">
                            {item.code}
                        </span>
                        <Pill className={equipmentTone}>
                            {statuses[item.statut] ?? item.statut}
                        </Pill>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[#111827]">
                        {item.nom}
                    </h2>
                    <p className="mt-1 text-sm text-[#6b7280]">
                        {categories[item.categorie] ?? item.categorie}
                    </p>
                </div>
            </div>

            <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                <h3 className="text-base font-semibold text-[#111827]">
                    Informations de l’équipement
                </h3>
                <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail
                        label="Marque / modèle"
                        value={
                            [item.marque, item.modele]
                                .filter(Boolean)
                                .join(' ') || '—'
                        }
                    />
                    <Detail
                        label="Immatriculation"
                        value={item.immatriculation || '—'}
                    />
                    <Detail
                        label="N° de série"
                        value={item.numero_serie || '—'}
                    />
                    <Detail label="Compteur" value={item.counter_label} />
                    <Detail label="Énergie" value={item.carburant || '—'} />
                    <Detail
                        label="Site"
                        value={
                            item.site
                                ? `${item.site.code} — ${item.site.nom}`
                                : '—'
                        }
                    />
                    <Detail
                        label="Responsable"
                        value={item.responsable?.name ?? '—'}
                    />
                    <Detail
                        label="Date d’acquisition"
                        value={formatDate(item.acquis_le)}
                    />
                    <Detail
                        label="Travaux ouverts"
                        value={String(item.open_orders_count)}
                    />
                </dl>
                {item.note && (
                    <p className="mt-5 border-t border-[#e5e7eb] pt-4 text-sm leading-6 text-[#4b5563]">
                        {item.note}
                    </p>
                )}
            </section>

            <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
                <div
                    role="tablist"
                    aria-label="Historique de l’équipement"
                    className="flex overflow-x-auto border-b border-[#e5e7eb] bg-[#f9fafb] px-2 pt-2"
                >
                    <EquipmentHistoryTab
                        active={activeHistoryTab === 'work'}
                        icon={<ClipboardCheck size={16} />}
                        label="Fiches de travail"
                        count={item.work_logs.length}
                        onClick={() => setActiveHistoryTab('work')}
                    />
                    <EquipmentHistoryTab
                        active={activeHistoryTab === 'plans'}
                        icon={<CalendarClock size={16} />}
                        label="Plans d’entretien"
                        count={item.maintenance_plans.length}
                        onClick={() => setActiveHistoryTab('plans')}
                    />
                    <EquipmentHistoryTab
                        active={activeHistoryTab === 'interventions'}
                        icon={<Wrench size={16} />}
                        label="Interventions réalisées"
                        count={item.interventions.length}
                        onClick={() => setActiveHistoryTab('interventions')}
                    />
                </div>
                <div role="tabpanel" className="bg-white p-4 sm:p-5">
                    {activeHistoryTab === 'work' && (
                        <EquipmentWorkLogsTable
                            item={item}
                            canManage={canManage}
                            onAdd={() => onAddWork(item)}
                        />
                    )}
                    {activeHistoryTab === 'plans' && (
                        <MaintenancePlansTable
                            plans={item.maintenance_plans}
                            canManage={canManage}
                            counterUnit={
                                item.type_compteur === 'heures'
                                    ? 'h'
                                    : item.type_compteur === 'km'
                                      ? 'km'
                                      : undefined
                            }
                            onAdd={() => onPlan(item)}
                            onEdit={(plan) => onPlan(item, plan)}
                        />
                    )}
                    {activeHistoryTab === 'interventions' && (
                        <EquipmentInterventionsTable
                            item={item}
                            canManage={canManage}
                            onAdd={() => onAddIntervention(item)}
                        />
                    )}
                </div>
            </section>
        </article>
    );
}

function EquipmentHistoryTab({
    active,
    icon,
    label,
    count,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                active
                    ? 'border-[#1a5632] bg-white text-[#1a5632]'
                    : 'border-transparent text-[#6b7280] hover:border-[#d1d5db] hover:text-[#374151]'
            }`}
        >
            {icon}
            {label}
            <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active
                        ? 'bg-[#eaf4ed] text-[#1a5632]'
                        : 'bg-[#e5e7eb] text-[#4b5563]'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

function EquipmentWorkLogsTable({
    item,
    canManage,
    onAdd,
}: {
    item: Equipment;
    canManage: boolean;
    onAdd: () => void;
}) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'reference'>(
        'date-desc',
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        const rows = item.work_logs.filter((work) =>
            [
                work.reference,
                work.operateur_nom,
                work.travail,
                work.client_libre,
                work.parcelle?.label,
                work.destination,
                work.anomalie,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('fr')
                .includes(needle),
        );

        return [...rows].sort((left, right) => {
            if (sort === 'reference') {
                return left.reference.localeCompare(right.reference, 'fr');
            }

            const delta =
                new Date(left.date).getTime() - new Date(right.date).getTime();

            return sort === 'date-asc' ? delta : -delta;
        });
    }, [item.work_logs, query, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const rows = filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
                <div>
                    <h3 className="text-base font-semibold text-[#111827]">
                        Fiches de travail
                    </h3>
                    <p className="mt-1 text-xs text-[#6b7280]">
                        Heures, compteur, affectation, carburant, facturation et
                        anomalies.
                    </p>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <Plus size={14} /> Nouvelle fiche
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block w-full sm:max-w-sm">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9ca3af]"
                        size={15}
                    />
                    <span className="sr-only">
                        Rechercher une fiche de travail
                    </span>
                    <input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        className="form-control h-9 pl-9"
                        placeholder="Référence, opérateur, travail, parcelle…"
                    />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#4b5563]">
                    Trier
                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value as typeof sort);
                            setPage(1);
                        }}
                        className="form-control h-9 w-auto"
                    >
                        <option value="date-desc">Plus récentes</option>
                        <option value="date-asc">Plus anciennes</option>
                        <option value="reference">Référence</option>
                    </select>
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1220px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Fiche</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Opérateur</th>
                            <th className="px-4 py-3">Horaire</th>
                            <th className="px-4 py-3">Compteur</th>
                            <th className="px-4 py-3">Travail</th>
                            <th className="px-4 py-3">Pour</th>
                            <th className="px-4 py-3">Carburant</th>
                            <th className="px-4 py-3">Facturé</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {rows.map((work, index) => (
                            <tr
                                key={work.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 align-top">
                                    <span className="block font-semibold text-[#1a5632]">
                                        {work.reference}
                                    </span>
                                    {work.photo_url && (
                                        <a
                                            href={work.photo_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#1a5632] hover:underline"
                                        >
                                            <Camera size={12} /> Photo
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    {formatDate(work.date)}
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    {work.operateur_nom}
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    <span className="block">
                                        {[work.heure_debut, work.heure_fin]
                                            .filter(Boolean)
                                            .join(' – ') || '—'}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[#6b7280]">
                                        {work.duree_heures
                                            ? `${work.duree_heures} h`
                                            : '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    {work.compteur_fin != null ? (
                                        <>
                                            <span className="block">
                                                {work.compteur_debut ?? '—'} →{' '}
                                                {work.compteur_fin}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                                                {work.compteur_parcouru != null
                                                    ? `+ ${work.compteur_parcouru} ${item.type_compteur === 'heures' ? 'h' : 'km'}`
                                                    : '—'}
                                            </span>
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className="max-w-72 px-4 py-3 align-top">
                                    <span className="block font-medium text-[#111827]">
                                        {work.travail}
                                    </span>
                                    {work.destination && (
                                        <span className="mt-1 block text-xs text-[#6b7280]">
                                            Destination : {work.destination}
                                        </span>
                                    )}
                                    {work.anomalie ? (
                                        <span className="mt-1 block text-xs font-medium text-red-700">
                                            Anomalie : {work.anomalie}
                                        </span>
                                    ) : work.observation ? (
                                        <span className="mt-1 block text-xs text-[#6b7280]">
                                            {work.observation}
                                        </span>
                                    ) : null}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={
                                            work.nature === 'tiers'
                                                ? 'bg-sky-50 text-sky-700 ring-sky-200'
                                                : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        }
                                    >
                                        {work.nature === 'tiers'
                                            ? 'TIERS'
                                            : 'FKN'}
                                    </Pill>
                                    <span className="mt-1 block max-w-48 text-xs text-[#6b7280]">
                                        {[
                                            work.client_libre,
                                            work.parcelle?.label,
                                            work.surface_travaillee
                                                ? `${work.surface_travaillee} ha`
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') || '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap">
                                    <span className="block text-[#374151]">
                                        {work.carburant_litres
                                            ? `${work.carburant_litres} L`
                                            : '—'}
                                    </span>
                                    {work.consumption != null && (
                                        <>
                                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                                                {work.consumption}{' '}
                                                {item.type_compteur === 'km'
                                                    ? 'L/100 km'
                                                    : 'L/h'}
                                            </span>
                                            {work.consumption_variance !=
                                                null && (
                                                <span
                                                    className={`mt-0.5 block text-xs font-semibold ${work.consumption_variance > 20 ? 'text-red-700' : 'text-[#6b7280]'}`}
                                                >
                                                    {work.consumption_variance >
                                                    0
                                                        ? '+'
                                                        : ''}
                                                    {work.consumption_variance}%
                                                </span>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top font-medium whitespace-nowrap text-[#374151]">
                                    {work.montant_facture != null
                                        ? money(
                                              work.montant_facture,
                                              work.devise ?? 'USD',
                                          )
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucune fiche de travail enregistrée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ClientPagination
                total={filtered.length}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
            />
        </section>
    );
}

function EquipmentInterventionsTable({
    item,
    canManage,
    onAdd,
}: {
    item: Equipment;
    canManage: boolean;
    onAdd: () => void;
}) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<
        'date-desc' | 'date-asc' | 'reference' | 'type'
    >('date-desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        const rows = item.interventions.filter((intervention) =>
            [
                intervention.reference,
                intervention.type,
                intervention.description,
                intervention.pieces_utilisees,
                intervention.prestataire,
                intervention.realise_par_nom,
                intervention.entretien?.libelle,
            ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('fr')
                .includes(needle),
        );

        return [...rows].sort((left, right) => {
            if (sort === 'reference') {
                return left.reference.localeCompare(right.reference, 'fr');
            }

            if (sort === 'type') {
                return left.type.localeCompare(right.type, 'fr');
            }

            const delta =
                new Date(left.date).getTime() - new Date(right.date).getTime();

            return sort === 'date-asc' ? delta : -delta;
        });
    }, [item.interventions, query, sort]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const rows = filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
                <div>
                    <h3 className="text-base font-semibold text-[#111827]">
                        Interventions réalisées
                    </h3>
                    <p className="mt-1 text-xs text-[#6b7280]">
                        Historique autonome ou rattaché au plan d’entretien.
                    </p>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <Wrench size={14} /> Enregistrer
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block w-full sm:max-w-sm">
                    <Search
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9ca3af]"
                        size={15}
                    />
                    <span className="sr-only">Rechercher une intervention</span>
                    <input
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setPage(1);
                        }}
                        className="form-control h-9 pl-9"
                        placeholder="Référence, type, travaux, prestataire…"
                    />
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#4b5563]">
                    Trier
                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value as typeof sort);
                            setPage(1);
                        }}
                        className="form-control h-9 w-auto"
                    >
                        <option value="date-desc">Plus récentes</option>
                        <option value="date-asc">Plus anciennes</option>
                        <option value="reference">Référence</option>
                        <option value="type">Type</option>
                    </select>
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Réf.</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Compteur</th>
                            <th className="px-4 py-3">Intervention</th>
                            <th className="px-4 py-3">Coût</th>
                            <th className="px-4 py-3">Immobilisation</th>
                            <th className="px-4 py-3">Par</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {rows.map((intervention, index) => (
                            <tr
                                key={intervention.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 align-top">
                                    <span className="block font-semibold text-[#1a5632]">
                                        {intervention.reference}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    {formatDate(intervention.date)}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={
                                            intervention.type === 'preventif'
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                : intervention.type ===
                                                        'correctif' ||
                                                    intervention.type ===
                                                        'reparation'
                                                  ? 'bg-amber-50 text-amber-800 ring-amber-200'
                                                  : 'bg-sky-50 text-sky-700 ring-sky-200'
                                        }
                                    >
                                        {equipmentInterventionLabels[
                                            intervention.type
                                        ] ?? intervention.type}
                                    </Pill>
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    {intervention.compteur != null
                                        ? `${intervention.compteur} ${item.type_compteur === 'heures' ? 'h' : 'km'}`
                                        : '—'}
                                </td>
                                <td className="max-w-96 px-4 py-3 align-top">
                                    <span className="block font-medium text-[#111827]">
                                        {intervention.description}
                                    </span>
                                    <span className="mt-1 block text-xs text-[#6b7280]">
                                        {intervention.entretien?.libelle
                                            ? `Plan : ${intervention.entretien.libelle}`
                                            : 'Intervention autonome'}
                                    </span>
                                    {intervention.pieces_utilisees && (
                                        <span className="mt-1 block text-xs text-[#6b7280]">
                                            Pièces :{' '}
                                            {intervention.pieces_utilisees}
                                        </span>
                                    )}
                                    {intervention.photo_url && (
                                        <a
                                            href={intervention.photo_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#1a5632] hover:underline"
                                        >
                                            <Camera size={12} /> Photo
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    {intervention.cost_total != null
                                        ? money(intervention.cost_total)
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 align-top whitespace-nowrap text-[#374151]">
                                    {intervention.immobilisation_heures
                                        ? `${intervention.immobilisation_heures} h`
                                        : '—'}
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    <span className="block">
                                        {intervention.realise_par_nom || '—'}
                                    </span>
                                    {intervention.prestataire && (
                                        <span className="mt-0.5 block text-xs text-[#6b7280]">
                                            {intervention.prestataire}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucune intervention enregistrée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ClientPagination
                total={filtered.length}
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                onPage={setPage}
                onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                }}
                pageSizeOptions={[10, 25]}
            />
        </section>
    );
}

function ClientPagination({
    total,
    page,
    pageCount,
    pageSize,
    onPage,
    onPageSize,
    pageSizeOptions = [10, 25, 50],
}: {
    total: number;
    page: number;
    pageCount: number;
    pageSize: number;
    onPage: (page: number) => void;
    onPageSize: (size: number) => void;
    pageSizeOptions?: number[];
}) {
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-col gap-3 border-t border-[#e5e7eb] px-4 py-3 text-sm text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
            <span>
                {first}–{last} sur {total}
            </span>
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                    Lignes
                    <select
                        value={pageSize}
                        onChange={(event) =>
                            onPageSize(Number(event.target.value))
                        }
                        className="form-control h-8 w-auto"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                    className="h-8 rounded-lg border border-[#d1d5db] px-3 font-medium text-[#374151] disabled:opacity-40"
                >
                    Précédent
                </button>
                <span className="text-xs">
                    Page {page}/{pageCount}
                </span>
                <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => onPage(page + 1)}
                    className="h-8 rounded-lg border border-[#d1d5db] px-3 font-medium text-[#374151] disabled:opacity-40"
                >
                    Suivant
                </button>
            </div>
        </div>
    );
}

function InfrastructureView({
    items,
    selected,
    categories,
    states,
    canManage,
    onSelect,
    onEdit,
    onPlan,
    onInspect,
    onCreateOrder,
}: {
    items: Infrastructure[];
    selected: Infrastructure | null;
    categories: Record<string, string>;
    states: Record<string, string>;
    canManage: boolean;
    onSelect: (id: number) => void;
    onEdit: (item: Infrastructure) => void;
    onPlan: (item: Infrastructure, plan?: MaintenancePlan) => void;
    onInspect: (item: Infrastructure) => void;
    onCreateOrder: (item: Infrastructure) => void;
}) {
    if (selected) {
        return (
            <InfrastructureDetail
                item={selected}
                categories={categories}
                states={states}
                canManage={canManage}
                onEdit={onEdit}
                onPlan={onPlan}
                onInspect={onInspect}
                onCreateOrder={onCreateOrder}
            />
        );
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-[13px]">
                    <thead className="bg-white text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Infrastructure</th>
                            <th className="px-4 py-3">Catégorie</th>
                            <th className="px-4 py-3">État</th>
                            <th className="px-4 py-3">Criticité</th>
                            <th className="px-4 py-3">Prochaine inspection</th>
                            <th className="px-4 py-3">Travaux ouverts</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {items.map((item, index) => (
                            <tr
                                key={item.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3 align-top font-semibold whitespace-nowrap text-[#1a5632]">
                                    {item.code}
                                </td>
                                <td className="max-w-64 px-4 py-3 align-top">
                                    <span className="block font-medium text-[#111827]">
                                        {item.nom}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-[#6b7280]">
                                        {item.caracteristiques ||
                                            item.localisation ||
                                            '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill className="bg-gray-50 text-gray-700 ring-gray-200">
                                        {categories[item.categorie] ??
                                            item.categorie}
                                    </Pill>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={
                                            infrastructureTone[item.etat]
                                        }
                                    >
                                        {states[item.etat] ?? item.etat}
                                    </Pill>
                                    <span className="mt-1 block text-xs text-[#6b7280]">
                                        constaté le{' '}
                                        {formatDate(item.etat_constate_le)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <Pill
                                        className={
                                            item.criticite <= 2
                                                ? 'bg-red-50 text-red-700 ring-red-200'
                                                : 'bg-gray-50 text-gray-700 ring-gray-200'
                                        }
                                    >
                                        C{item.criticite}
                                    </Pill>
                                </td>
                                <td
                                    className={`px-4 py-3 align-top ${item.inspection_late ? 'font-semibold text-red-700' : 'text-[#374151]'}`}
                                >
                                    {item.prochaine_inspection
                                        ? formatDate(item.prochaine_inspection)
                                        : 'non programmée'}
                                    {item.inspection_late && (
                                        <span className="mt-1 block text-[10px] font-bold">
                                            EN RETARD
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    {item.open_orders_count ? (
                                        <Pill className="bg-amber-50 text-amber-700 ring-amber-200">
                                            {item.open_orders_count}
                                        </Pill>
                                    ) : (
                                        <span className="text-[#9ca3af]">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => onInspect(item)}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#154629] focus-visible:ring-2 focus-visible:ring-[#1a5632]/30 focus-visible:outline-none"
                                            >
                                                <ClipboardCheck size={15} />
                                                Inspecter
                                            </button>
                                        )}
                                        <details className="group relative">
                                            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-3 text-xs font-semibold text-[#374151] shadow-sm transition hover:border-[#9ca3af] hover:bg-[#f9fafb] focus-visible:ring-2 focus-visible:ring-[#1a5632]/20 focus-visible:outline-none">
                                                More actions
                                                <ChevronDown
                                                    size={14}
                                                    className="transition group-open:rotate-180"
                                                />
                                            </summary>
                                            <div className="absolute right-0 z-30 mt-1 w-60 rounded-xl border border-[#e5e7eb] bg-white p-1.5 shadow-xl">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onSelect(item.id)
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                                                >
                                                    <Eye size={15} /> Ouvrir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onCreateOrder(item)
                                                    }
                                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                                                >
                                                    <Wrench size={15} /> Ouvrir
                                                    un ordre de travail
                                                </button>
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onEdit(item)
                                                        }
                                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                                                    >
                                                        <Pencil size={15} />{' '}
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </details>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr className="hidden sm:table-row">
                                <td colSpan={8}>
                                    <EmptyState
                                        icon={Building2}
                                        title="No infrastructures"
                                        text="Create an infrastructure to get started."
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {items.length === 0 && (
                <div className="sm:hidden">
                    <EmptyState
                        icon={Building2}
                        title="No infrastructures"
                        text="Create an infrastructure to get started."
                    />
                </div>
            )}
            {items.length > 0 && (
                <div className="border-t border-[#e5e7eb] px-4 py-3 text-sm text-[#6b7280]">
                    Showing {items.length} results
                </div>
            )}
        </div>
    );
}

function InfrastructureDetail({
    item,
    categories,
    states,
    canManage,
    onEdit,
    onPlan,
    onInspect,
    onCreateOrder,
}: {
    item: Infrastructure;
    categories: Record<string, string>;
    states: Record<string, string>;
    canManage: boolean;
    onEdit: (item: Infrastructure) => void;
    onPlan: (item: Infrastructure, plan?: MaintenancePlan) => void;
    onInspect: (item: Infrastructure) => void;
    onCreateOrder: (item: Infrastructure) => void;
}) {
    const [activeHistoryTab, setActiveHistoryTab] = useState<
        'inspections' | 'plans'
    >('inspections');

    return (
        <article className="space-y-6 bg-[#f9fafb] p-5 sm:p-6">
            <div className="flex flex-col gap-4 rounded-xl border border-[#e5e7eb] bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#1a5632]">
                            {item.code}
                        </span>
                        <Pill className={infrastructureTone[item.etat]}>
                            {states[item.etat] ?? item.etat}
                        </Pill>
                        <Pill
                            className={
                                item.criticite <= 2
                                    ? 'bg-red-50 text-red-700 ring-red-200'
                                    : 'bg-gray-50 text-gray-700 ring-gray-200'
                            }
                        >
                            C{item.criticite}
                        </Pill>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[#111827]">
                        {item.nom}
                    </h2>
                    <p className="mt-1 text-sm text-[#6b7280]">
                        {categories[item.categorie] ?? item.categorie}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canManage && (
                        <button
                            type="button"
                            onClick={() => onInspect(item)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[#154629]"
                        >
                            <ClipboardCheck size={15} /> Inspecter
                        </button>
                    )}
                    <details className="group relative">
                        <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-semibold text-[#374151] shadow-sm transition hover:border-[#9ca3af] hover:bg-[#f9fafb]">
                            More actions
                            <ChevronDown
                                size={14}
                                className="transition group-open:rotate-180"
                            />
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 w-60 rounded-xl border border-[#e5e7eb] bg-white p-1.5 shadow-xl">
                            <button
                                type="button"
                                onClick={() => onCreateOrder(item)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                            >
                                <Wrench size={15} /> Ouvrir un ordre de travail
                            </button>
                            {canManage && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onPlan(item)}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                                    >
                                        <CalendarClock size={15} /> Ajouter une
                                        opération
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onEdit(item)}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#374151] hover:bg-[#f3f4f6]"
                                    >
                                        <Pencil size={15} /> Edit
                                    </button>
                                </>
                            )}
                        </div>
                    </details>
                </div>
            </div>

            <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
                <h3 className="text-base font-semibold text-[#111827]">
                    Informations de l’infrastructure
                </h3>
                <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail
                        label="Caractéristiques"
                        value={item.caracteristiques || '—'}
                    />
                    <Detail
                        label="Site"
                        value={
                            item.site
                                ? `${item.site.code} — ${item.site.nom}`
                                : '—'
                        }
                    />
                    <Detail
                        label="Parcelle / bloc"
                        value={item.parcelle?.label ?? '—'}
                    />
                    <Detail
                        label="Localisation"
                        value={item.localisation || '—'}
                    />
                    <Detail
                        label="Mise en service"
                        value={
                            item.annee_mise_en_service
                                ? String(item.annee_mise_en_service)
                                : '—'
                        }
                    />
                    <Detail
                        label="Responsable"
                        value={item.responsable?.name ?? '—'}
                    />
                    <Detail
                        label="Dernière inspection"
                        value={formatDate(item.derniere_inspection)}
                    />
                    <Detail
                        label="Prochaine inspection"
                        value={formatDate(item.prochaine_inspection)}
                        danger={item.inspection_late}
                    />
                    <Detail
                        label="Travaux ouverts"
                        value={String(item.open_orders_count)}
                    />
                    <Detail
                        label="En service"
                        value={item.actif ? 'Oui' : 'Non'}
                    />
                </dl>
                {item.description && (
                    <p className="mt-5 border-t border-[#e5e7eb] pt-4 text-sm leading-6 text-[#4b5563]">
                        {item.description}
                    </p>
                )}
            </section>

            <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
                <div
                    role="tablist"
                    aria-label="Historique de l’infrastructure"
                    className="flex overflow-x-auto border-b border-[#e5e7eb] bg-[#f9fafb] px-2 pt-2"
                >
                    <EquipmentHistoryTab
                        active={activeHistoryTab === 'inspections'}
                        icon={<ClipboardCheck size={16} />}
                        label="Historique des inspections"
                        count={item.inspections.length}
                        onClick={() => setActiveHistoryTab('inspections')}
                    />
                    <EquipmentHistoryTab
                        active={activeHistoryTab === 'plans'}
                        icon={<CalendarClock size={16} />}
                        label="Plans d’entretien"
                        count={item.maintenance_plans.length}
                        onClick={() => setActiveHistoryTab('plans')}
                    />
                </div>
                <div role="tabpanel" className="bg-white p-4 sm:p-5">
                    {activeHistoryTab === 'inspections' && (
                        <InfrastructureInspectionsTable
                            item={item}
                            states={states}
                            canManage={canManage}
                            onInspect={() => onInspect(item)}
                        />
                    )}
                    {activeHistoryTab === 'plans' && (
                        <MaintenancePlansTable
                            plans={item.maintenance_plans}
                            canManage={canManage}
                            onAdd={() => onPlan(item)}
                            onEdit={(plan) => onPlan(item, plan)}
                        />
                    )}
                </div>
            </section>
        </article>
    );
}

function InfrastructureInspectionsTable({
    item,
    states,
    canManage,
    onInspect,
}: {
    item: Infrastructure;
    states: Record<string, string>;
    canManage: boolean;
    onInspect: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4">
                <div>
                    <h3 className="text-base font-semibold text-[#111827]">
                        Historique des inspections
                    </h3>
                    <p className="mt-1 text-xs text-[#6b7280]">
                        Évolution de l’état et constats relevés sur le terrain.
                    </p>
                </div>
                {canManage && (
                    <button
                        type="button"
                        onClick={onInspect}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <Plus size={14} /> Nouvelle inspection
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Réf.</th>
                            <th className="px-4 py-3">État</th>
                            <th className="px-4 py-3">Constat</th>
                            <th className="px-4 py-3">Par</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {item.inspections.map((inspection, index) => (
                            <tr
                                key={inspection.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="px-4 py-3">
                                    {formatDate(inspection.date)}
                                </td>
                                <td className="px-4 py-3 font-medium text-[#1a5632]">
                                    {inspection.reference}
                                </td>
                                <td className="px-4 py-3">
                                    <Pill
                                        className={
                                            infrastructureTone[
                                                inspection.etat_constate
                                            ]
                                        }
                                    >
                                        {states[inspection.etat_constate] ??
                                            inspection.etat_constate}
                                    </Pill>
                                </td>
                                <td className="max-w-md px-4 py-3 text-[#374151]">
                                    {inspection.constat}
                                    {inspection.photo_url && (
                                        <a
                                            href={inspection.photo_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="ml-2 inline-flex items-center gap-1 font-medium text-[#1a5632] hover:underline"
                                        >
                                            <Camera size={13} /> Photo
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-[#374151]">
                                    {inspection.inspecteur_nom}
                                </td>
                            </tr>
                        ))}
                        {item.inspections.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucune inspection enregistrée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function MaintenancePlansTable({
    plans,
    canManage,
    counterUnit,
    onAdd,
    onEdit,
}: {
    plans: MaintenancePlan[];
    canManage: boolean;
    counterUnit?: 'h' | 'km';
    onAdd: () => void;
    onEdit: (plan: MaintenancePlan) => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5e7eb] px-5 py-4">
                <h3 className="text-base font-semibold text-[#111827]">
                    Plan d’entretien
                </h3>
                {canManage && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1a5632] px-3 text-sm font-semibold text-white hover:bg-[#154629]"
                    >
                        <Plus size={14} /> Ajouter une opération
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="text-xs font-semibold text-[#4b5563]">
                        <tr className="border-b border-[#e5e7eb]">
                            <th className="px-4 py-3">Opération</th>
                            <th className="px-4 py-3">Périodicité</th>
                            <th className="px-4 py-3">Dernier</th>
                            <th className="px-4 py-3">Prochaine échéance</th>
                            {canManage && (
                                <th className="px-4 py-3 text-right">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e7eb]">
                        {plans.map((plan, index) => (
                            <tr
                                key={plan.id}
                                className={
                                    index % 2 ? 'bg-[#f9fafb]' : 'bg-white'
                                }
                            >
                                <td className="max-w-80 px-4 py-3 align-top">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium text-[#111827]">
                                            {plan.libelle}
                                        </span>
                                        <Pill
                                            className={
                                                plan.type === 'reglementaire'
                                                    ? 'bg-violet-50 text-violet-700 ring-violet-200'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                            }
                                        >
                                            {plan.type === 'reglementaire'
                                                ? 'Réglementaire'
                                                : 'Préventif'}
                                        </Pill>
                                        <Pill
                                            className={
                                                plan.actif
                                                    ? 'bg-green-50 text-green-700 ring-green-200'
                                                    : 'bg-gray-100 text-gray-600 ring-gray-200'
                                            }
                                        >
                                            {plan.actif ? 'Actif' : 'Inactif'}
                                        </Pill>
                                    </div>
                                    {plan.operations && (
                                        <span className="mt-1 block text-xs leading-5 text-[#6b7280]">
                                            {plan.operations}
                                        </span>
                                    )}
                                    {plan.pieces && (
                                        <span className="mt-1 block text-xs font-medium text-[#4b5563]">
                                            Pièces : {plan.pieces}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    {plan.periodicite_compteur ? (
                                        <span className="block font-medium">
                                            Tous les {plan.periodicite_compteur}{' '}
                                            {counterUnit ?? 'unités'}
                                        </span>
                                    ) : plan.periodicite_jours ? (
                                        <span className="block font-medium">
                                            Tous les {plan.periodicite_jours}{' '}
                                            jours
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                    {plan.periodicite_compteur &&
                                        plan.periodicite_jours && (
                                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                                                ou {plan.periodicite_jours}{' '}
                                                jours
                                            </span>
                                        )}
                                    {plan.alerte_avant_compteur && (
                                        <span className="mt-0.5 block text-xs text-[#6b7280]">
                                            Alerte {plan.alerte_avant_compteur}{' '}
                                            {counterUnit ?? 'unités'} avant
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 align-top text-[#374151]">
                                    {plan.dernier_compteur != null ? (
                                        <span className="block font-medium">
                                            {plan.dernier_compteur}{' '}
                                            {counterUnit ?? 'unités'}
                                        </span>
                                    ) : plan.dernier_le ? (
                                        formatDate(plan.dernier_le)
                                    ) : (
                                        '—'
                                    )}
                                    {plan.dernier_compteur != null &&
                                        plan.dernier_le && (
                                            <span className="mt-0.5 block text-xs text-[#6b7280]">
                                                {formatDate(plan.dernier_le)}
                                            </span>
                                        )}
                                </td>
                                <td className="px-4 py-3 align-top">
                                    {!plan.actif ? (
                                        <Pill className="bg-gray-100 text-gray-600 ring-gray-200">
                                            Suspendue
                                        </Pill>
                                    ) : plan.due ? (
                                        <Pill className="bg-red-50 text-red-700 ring-red-200">
                                            Échue
                                        </Pill>
                                    ) : plan.warning ? (
                                        <Pill className="bg-amber-50 text-amber-700 ring-amber-200">
                                            Proche
                                        </Pill>
                                    ) : (
                                        <span className="text-[#374151]">
                                            {plan.prochain_compteur != null
                                                ? `${plan.prochain_compteur} ${counterUnit ?? 'unités'}`
                                                : plan.prochain_le
                                                  ? formatDate(plan.prochain_le)
                                                  : plan.remaining || '—'}
                                        </span>
                                    )}
                                    {plan.actif &&
                                        plan.prochain_compteur != null &&
                                        plan.prochain_le && (
                                            <span className="mt-1 block text-xs text-[#6b7280]">
                                                ou{' '}
                                                {formatDate(plan.prochain_le)}
                                            </span>
                                        )}
                                </td>
                                {canManage && (
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(plan)}
                                            className="mr-4 inline-flex items-center gap-1 font-medium text-[#1a5632] hover:underline"
                                        >
                                            <Pencil size={14} /> Modifier
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `Retirer « ${plan.libelle} » du plan d’entretien ?`,
                                                    )
                                                ) {
                                                    router.delete(
                                                        `/maintenance/plans/${plan.id}`,
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }
                                            }}
                                            className="font-medium text-red-700 hover:underline"
                                        >
                                            Retirer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {plans.length === 0 && (
                            <tr>
                                <td
                                    colSpan={canManage ? 5 : 4}
                                    className="px-4 py-10 text-center text-[#6b7280]"
                                >
                                    Aucune opération d’entretien.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function MaintenanceDialog({
    dialog,
    options,
    equipment,
    infrastructures,
    sites,
    parcelles,
    users,
    articles,
    fuelArticles,
    units,
    submitting,
    embedded = false,
    onClose,
    onSubmit,
}: {
    dialog: NonNullable<DialogState>;
    options: Props['options'];
    equipment: Equipment[];
    infrastructures: Infrastructure[];
    sites: Site[];
    parcelles: Parcelle[];
    users: NamedOption[];
    articles: Article[];
    fuelArticles: Article[];
    units: Unit[];
    submitting: boolean;
    embedded?: boolean;
    onClose: () => void;
    onSubmit: (
        event: React.FormEvent<HTMLFormElement>,
        path: string,
        method?: 'post' | 'put',
    ) => void;
}) {
    const [orderTargetType, setOrderTargetType] = useState<
        'none' | 'equipment' | 'infrastructure'
    >(
        dialog.kind === 'order-create'
            ? (dialog.targetType ?? 'equipment')
            : 'none',
    );
    const [orderStopsProduction, setOrderStopsProduction] = useState(false);
    const [workNature, setWorkNature] = useState<'interne' | 'tiers'>(
        'interne',
    );

    if (dialog.kind === 'order-create') {
        const infrastructureLocked =
            dialog.targetType === 'infrastructure' &&
            dialog.targetId !== undefined;
        const targetInfrastructure = infrastructureLocked
            ? infrastructures.find((item) => item.id === dialog.targetId)
            : undefined;

        return (
            <DialogShell
                title={
                    infrastructureLocked
                        ? 'Ouvrir un ordre de travail'
                        : 'Nouvel ordre de travail'
                }
                subtitle={
                    infrastructureLocked
                        ? `${targetInfrastructure?.code ?? 'Infrastructure'} — ${targetInfrastructure?.nom ?? 'cible sélectionnée'}`
                        : 'Un numéro réel, une cible et un circuit vérifiable.'
                }
                onClose={onClose}
                embedded={embedded}
            >
                <form
                    onSubmit={(event) => onSubmit(event, '/maintenance/orders')}
                    className="space-y-5"
                >
                    {infrastructureLocked && (
                        <>
                            <input
                                type="hidden"
                                name="target_type"
                                value="infrastructure"
                            />
                            <input
                                type="hidden"
                                name="target_id"
                                value={dialog.targetId}
                            />
                            {targetInfrastructure?.site_id && (
                                <input
                                    type="hidden"
                                    name="site_id"
                                    value={targetInfrastructure.site_id}
                                />
                            )}
                            <input
                                type="hidden"
                                name="permis_travail"
                                value="aucun"
                            />
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                                <Building2
                                    size={20}
                                    className="mt-0.5 shrink-0 text-[#1a5632]"
                                />
                                <div>
                                    <p className="text-sm font-semibold">
                                        Infrastructure déjà sélectionnée
                                    </p>
                                    <p className="mt-1 text-sm text-emerald-800">
                                        {targetInfrastructure?.nom ?? '—'}
                                        {targetInfrastructure?.site
                                            ? ` · ${targetInfrastructure.site.code} — ${targetInfrastructure.site.nom}`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                    {!infrastructureLocked && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Sur quoi porte l’intervention ?">
                                <select
                                    name="target_type"
                                    value={orderTargetType}
                                    onChange={(event) =>
                                        setOrderTargetType(
                                            event.target.value as
                                                | 'none'
                                                | 'equipment'
                                                | 'infrastructure',
                                        )
                                    }
                                    required
                                    className="form-control"
                                >
                                    <option value="none">
                                        Travaux généraux — sans cible précise
                                    </option>
                                    <option value="equipment">
                                        Un équipement (tracteur, véhicule,
                                        groupe, pompe)
                                    </option>
                                    <option value="infrastructure">
                                        Une infrastructure (canal, forage,
                                        solaire, bâtiment)
                                    </option>
                                </select>
                            </Field>
                            {orderTargetType !== 'none' && (
                                <Field
                                    label={
                                        orderTargetType === 'equipment'
                                            ? 'Équipement'
                                            : 'Infrastructure'
                                    }
                                >
                                    <select
                                        name="target_id"
                                        className="form-control"
                                        defaultValue={dialog.targetId ?? ''}
                                        required
                                    >
                                        <option value="">
                                            Choisir la cible
                                        </option>
                                        {(orderTargetType === 'equipment'
                                            ? equipment
                                            : infrastructures
                                        )
                                            .filter((item) => item.actif)
                                            .map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.code} — {item.nom}
                                                </option>
                                            ))}
                                    </select>
                                </Field>
                            )}
                        </div>
                    )}
                    <Field
                        label={
                            infrastructureLocked
                                ? 'Objet'
                                : 'Objet — que faut-il faire ?'
                        }
                        required
                    >
                        <input
                            name="objet"
                            required
                            maxLength={255}
                            className="form-control"
                            placeholder="Ex. Réparer la fuite du canal principal"
                        />
                    </Field>
                    <Field
                        label={
                            infrastructureLocked
                                ? 'Description'
                                : 'Description du problème constaté'
                        }
                    >
                        <textarea
                            name="description"
                            rows={3}
                            className="form-control"
                            placeholder="Faits observés, symptômes, localisation précise…"
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nature" required>
                            <select
                                name="type_intervention"
                                defaultValue={
                                    infrastructureLocked ? '' : 'correctif'
                                }
                                required
                                className="form-control"
                            >
                                {infrastructureLocked && (
                                    <option value="" disabled>
                                        Select an option
                                    </option>
                                )}
                                {Object.entries(options.orderTypes).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                        <Field label="Priorité" required>
                            <select
                                name="priorite"
                                defaultValue={
                                    infrastructureLocked ? '' : 'normale'
                                }
                                required
                                className="form-control"
                            >
                                {infrastructureLocked && (
                                    <option value="" disabled>
                                        Select an option
                                    </option>
                                )}
                                {Object.entries(priorityLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                    </div>
                    {!infrastructureLocked && (
                        <Checkbox
                            name="arret_production"
                            label="Arrête la production"
                            help="L’ordre passera automatiquement en urgent."
                            onChange={setOrderStopsProduction}
                        />
                    )}
                    {!infrastructureLocked && orderStopsProduction && (
                        <Field label="Ce que la panne empêche de faire">
                            <textarea
                                name="consequence"
                                rows={2}
                                className="form-control"
                            />
                        </Field>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label={
                                infrastructureLocked
                                    ? 'Échéance'
                                    : 'Échéance souhaitée'
                            }
                        >
                            <input
                                name="echeance"
                                type="date"
                                min={today}
                                className="form-control"
                            />
                        </Field>
                        {!infrastructureLocked && (
                            <Field label="Site">
                                <select
                                    name="site_id"
                                    defaultValue=""
                                    className="form-control"
                                >
                                    <option value="">Déduit de la cible</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.code} — {site.nom}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                    </div>
                    <div className="space-y-4">
                        <Checkbox
                            name="consignation_requise"
                            label="Consignation requise avant intervention"
                            help="Mise hors énergie : électricité, pression ou pièces en mouvement."
                        />
                        {!infrastructureLocked && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Permis de travail">
                                    <select
                                        name="permis_travail"
                                        defaultValue="aucun"
                                        className="form-control"
                                    >
                                        {Object.entries(
                                            options.workPermits,
                                        ).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        )}
                        {!infrastructureLocked && (
                            <Field label="EPI exigés">
                                <input
                                    name="epi_requis"
                                    maxLength={255}
                                    className="form-control"
                                    placeholder="Gants, lunettes, harnais…"
                                />
                            </Field>
                        )}
                    </div>
                    {!infrastructureLocked && (
                        <Field label="Photo du problème">
                            <input
                                name="photo_avant"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                className="form-control file:mr-3 file:rounded-md file:border-0 file:bg-[#f3f4f6] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#374151]"
                            />
                        </Field>
                    )}
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel={infrastructureLocked ? 'Submit' : 'Create'}
                        createAnother={!infrastructureLocked}
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'equipment-work') {
        const item = dialog.item;

        return (
            <DialogShell
                title={`Nouvelle fiche de travail — ${item.code}`}
                subtitle="Consignez l’utilisation réelle, le carburant et toute anomalie constatée."
                onClose={onClose}
                embedded={embedded}
                wide
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            `/maintenance/equipment/${item.id}/work-logs`,
                        )
                    }
                    className="space-y-5"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Date du travail">
                            <input
                                name="date"
                                type="date"
                                max={today}
                                defaultValue={today}
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Opérateur">
                            <select
                                name="operateur_id"
                                defaultValue={users[0]?.id ?? ''}
                                required
                                className="form-control"
                            >
                                <option value="" disabled>
                                    Choisir l’opérateur
                                </option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Nom d’opérateur libre">
                            <input
                                name="operateur_nom"
                                maxLength={180}
                                className="form-control"
                                placeholder="Si extérieur ou différent"
                            />
                        </Field>
                        <Field label="Heure de début">
                            <input
                                name="heure_debut"
                                type="time"
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Heure de fin">
                            <input
                                name="heure_fin"
                                type="time"
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Durée manuelle (heures)">
                            <input
                                name="duree_heures"
                                type="number"
                                min="0.01"
                                max="24"
                                step="0.25"
                                className="form-control"
                                placeholder="Calculée avec les heures si vide"
                            />
                        </Field>
                        {item.type_compteur !== 'aucun' && (
                            <>
                                <Field
                                    label={`Compteur début (${item.type_compteur === 'heures' ? 'h' : 'km'})`}
                                >
                                    <input
                                        name="compteur_debut"
                                        type="number"
                                        min={Number(item.compteur_actuel)}
                                        step="0.01"
                                        defaultValue={item.compteur_actuel}
                                        required
                                        className="form-control"
                                    />
                                </Field>
                                <Field
                                    label={`Compteur fin (${item.type_compteur === 'heures' ? 'h' : 'km'})`}
                                >
                                    <input
                                        name="compteur_fin"
                                        type="number"
                                        min={Number(item.compteur_actuel)}
                                        step="0.01"
                                        defaultValue={item.compteur_actuel}
                                        required
                                        className="form-control"
                                    />
                                </Field>
                            </>
                        )}
                        <Field label="Pour qui ?">
                            <select
                                name="nature"
                                value={workNature}
                                onChange={(event) =>
                                    setWorkNature(
                                        event.target.value as
                                            'interne' | 'tiers',
                                    )
                                }
                                required
                                className="form-control"
                            >
                                {Object.entries(
                                    options.equipmentWorkNatures,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field label="Travail effectué">
                        <input
                            name="travail"
                            required
                            maxLength={255}
                            className="form-control"
                            placeholder="Ex. Labour de préparation, transport de récolte…"
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Parcelle">
                            <select
                                name="parcelle_id"
                                defaultValue=""
                                className="form-control"
                            >
                                <option value="">
                                    Aucune / non applicable
                                </option>
                                {parcelles.map((parcelle) => (
                                    <option
                                        key={parcelle.id}
                                        value={parcelle.id}
                                    >
                                        {parcelle.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Surface travaillée (ha)">
                            <input
                                name="surface_travaillee"
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Destination / affectation">
                            <input
                                name="destination"
                                maxLength={255}
                                className="form-control"
                                placeholder="Atelier, champ, dépôt…"
                            />
                        </Field>
                    </div>
                    {workNature === 'tiers' ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Client facturé">
                                <input
                                    name="client_libre"
                                    required
                                    maxLength={180}
                                    className="form-control"
                                />
                            </Field>
                            <Field label="Montant facturé">
                                <input
                                    name="montant_facture"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                />
                            </Field>
                            <Field label="Devise">
                                <select
                                    name="devise"
                                    defaultValue="USD"
                                    required
                                    className="form-control"
                                >
                                    <option value="USD">USD</option>
                                    <option value="CDF">CDF</option>
                                </select>
                            </Field>
                        </div>
                    ) : null}
                    {workNature === 'interne' && (
                        <input type="hidden" name="devise" value="USD" />
                    )}
                    <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                        <h3 className="text-sm font-semibold text-[#111827]">
                            Carburant consommé
                        </h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <Field label="Article carburant">
                                <select
                                    name="article_carburant_id"
                                    defaultValue=""
                                    className="form-control"
                                >
                                    <option value="">Aucun prélèvement</option>
                                    {fuelArticles.map((article) => (
                                        <option
                                            key={article.id}
                                            value={article.id}
                                        >
                                            {article.code} — {article.libelle}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Quantité (litres)">
                                <input
                                    name="carburant_litres"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="form-control"
                                />
                            </Field>
                            <Field label="Coût carburant (USD)">
                                <input
                                    name="cout_carburant"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                    placeholder="Calculé depuis l’article si vide"
                                />
                            </Field>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-[#6b7280]">
                            Un article carburant et une quantité créent
                            automatiquement une sortie de stock.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Observation">
                            <textarea
                                name="observation"
                                rows={3}
                                maxLength={3000}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Anomalie constatée">
                            <textarea
                                name="anomalie"
                                rows={3}
                                maxLength={3000}
                                className="form-control"
                                placeholder="Une tâche de contrôle sera ouverte automatiquement."
                            />
                        </Field>
                    </div>
                    <Field label="Photo / justificatif">
                        <input
                            name="photo_chemin"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="form-control file:mr-3 file:rounded-md file:border-0 file:bg-[#f3f4f6] file:px-3 file:py-1.5 file:text-xs file:font-medium"
                        />
                    </Field>
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel="Enregistrer la fiche"
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'equipment-intervention') {
        const item = dialog.item;
        const activePlans = item.maintenance_plans.filter((plan) => plan.actif);

        return (
            <DialogShell
                title={`Intervention réalisée — ${item.code}`}
                subtitle="Rattachez-la à une échéance pour recalculer automatiquement le prochain entretien, ou laissez-la autonome."
                onClose={onClose}
                embedded={embedded}
                wide
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            `/maintenance/equipment/${item.id}/interventions`,
                        )
                    }
                    className="space-y-5"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Date de l’intervention">
                            <input
                                name="date"
                                type="date"
                                max={today}
                                defaultValue={today}
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Type d’intervention">
                            <select
                                name="type"
                                defaultValue="preventif"
                                required
                                className="form-control"
                            >
                                {Object.entries(
                                    options.equipmentInterventionTypes,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        {item.type_compteur !== 'aucun' && (
                            <Field
                                label={`Compteur (${item.type_compteur === 'heures' ? 'h' : 'km'})`}
                            >
                                <input
                                    name="compteur"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={item.compteur_actuel}
                                    className="form-control"
                                />
                            </Field>
                        )}
                    </div>
                    <Field label="Échéance du plan d’entretien">
                        <select
                            name="entretien_planifie_id"
                            defaultValue=""
                            className="form-control"
                        >
                            <option value="">
                                Intervention autonome — ne recalcule aucune
                                échéance
                            </option>
                            {activePlans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.libelle}
                                    {plan.due ? ' — échue' : ''}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <p className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                        Si une échéance est choisie, cette intervention devient
                        son dernier entretien et les prochains seuils au
                        compteur et/ou à la date sont recalculés.
                    </p>
                    <Field label="Travaux réalisés">
                        <textarea
                            name="description"
                            rows={4}
                            required
                            maxLength={5000}
                            className="form-control"
                            placeholder="Décrivez précisément les contrôles, remplacements et essais."
                        />
                    </Field>
                    <Field label="Pièces utilisées">
                        <textarea
                            name="pieces_utilisees"
                            rows={3}
                            maxLength={3000}
                            className="form-control"
                            placeholder="Références, désignations et quantités."
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Field label="Coût pièces (USD)">
                            <input
                                name="cout_pieces"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Coût main-d’œuvre (USD)">
                            <input
                                name="cout_main_oeuvre"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Prestataire">
                            <input
                                name="prestataire"
                                maxLength={180}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Immobilisation (heures)">
                            <input
                                name="immobilisation_heures"
                                type="number"
                                min="0"
                                step="0.25"
                                className="form-control"
                            />
                        </Field>
                    </div>
                    <Checkbox
                        name="remettre_en_service"
                        label="Remettre l’équipement en service"
                        help={
                            item.statut === 'maintenance'
                                ? 'Le statut repassera à Disponible et le motif d’immobilisation sera effacé.'
                                : 'À cocher uniquement si cette intervention clôt une période d’indisponibilité.'
                        }
                    />
                    <Field label="Photo / justificatif">
                        <input
                            name="photo_chemin"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="form-control file:mr-3 file:rounded-md file:border-0 file:bg-[#f3f4f6] file:px-3 file:py-1.5 file:text-xs file:font-medium"
                        />
                    </Field>
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel="Enregistrer l’intervention"
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'equipment') {
        const item = dialog.item;

        return (
            <DialogShell
                title={item ? `Modifier ${item.code}` : 'Ajouter un équipement'}
                subtitle="Le parc mobile se suit au compteur et par état."
                onClose={onClose}
                embedded={embedded}
                wide
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            item
                                ? `/maintenance/equipment/${item.id}`
                                : '/maintenance/equipment',
                            item ? 'put' : 'post',
                        )
                    }
                    className="space-y-5"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Code">
                            <input
                                name="code"
                                required
                                maxLength={24}
                                defaultValue={item?.code}
                                className="form-control"
                                placeholder="TR-01"
                            />
                        </Field>
                        <Field label="Désignation">
                            <input
                                name="nom"
                                required
                                defaultValue={item?.nom}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Catégorie">
                            <select
                                name="categorie"
                                required
                                defaultValue={item?.categorie ?? 'tracteur'}
                                className="form-control"
                            >
                                {Object.entries(
                                    options.equipmentCategories,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Marque">
                            <input
                                name="marque"
                                defaultValue={item?.marque ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Modèle">
                            <input
                                name="modele"
                                defaultValue={item?.modele ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Immatriculation">
                            <input
                                name="immatriculation"
                                maxLength={32}
                                defaultValue={item?.immatriculation ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="N° de série">
                            <input
                                name="numero_serie"
                                maxLength={64}
                                defaultValue={item?.numero_serie ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Année">
                            <input
                                name="annee"
                                type="number"
                                min="1950"
                                max={new Date().getFullYear() + 1}
                                defaultValue={item?.annee ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Acquis le">
                            <input
                                name="acquis_le"
                                type="date"
                                defaultValue={item?.acquis_le ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Valeur d’acquisition (USD)">
                            <input
                                name="valeur_acquisition"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.valeur_acquisition ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Type de compteur">
                            <select
                                name="type_compteur"
                                required
                                defaultValue={item?.type_compteur ?? 'heures'}
                                className="form-control"
                            >
                                <option value="heures">
                                    Horamètre (heures)
                                </option>
                                <option value="km">Odomètre (km)</option>
                                <option value="aucun">Aucun</option>
                            </select>
                        </Field>
                        <Field label="Relevé actuel">
                            <input
                                name="compteur_actuel"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.compteur_actuel ?? 0}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Énergie">
                            <select
                                name="carburant"
                                defaultValue={item?.carburant ?? ''}
                                className="form-control"
                            >
                                <option value="">Non renseignée</option>
                                <option value="diesel">Diesel</option>
                                <option value="essence">Essence</option>
                                <option value="electrique">Électrique</option>
                                <option value="solaire">Solaire</option>
                            </select>
                        </Field>
                        <Field label="Capacité du réservoir (L)">
                            <input
                                name="capacite_reservoir"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.capacite_reservoir ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Consommation de référence">
                            <input
                                name="consommation_ref"
                                type="number"
                                min="0"
                                step="0.001"
                                defaultValue={item?.consommation_ref ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Site">
                            <select
                                name="site_id"
                                defaultValue={item?.site_id ?? ''}
                                className="form-control"
                            >
                                <option value="">Aucun</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.code} — {site.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Responsable">
                            <select
                                name="responsable_id"
                                defaultValue={item?.responsable_id ?? ''}
                                className="form-control"
                            >
                                <option value="">À assigner</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Statut">
                            <select
                                name="statut"
                                required
                                defaultValue={item?.statut ?? 'disponible'}
                                className="form-control"
                            >
                                {Object.entries(options.equipmentStatuses).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                        <Field label="Tarif horaire tiers (USD)">
                            <input
                                name="tarif_horaire"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.tarif_horaire ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Tarif par hectare (USD)">
                            <input
                                name="tarif_hectare"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.tarif_hectare ?? ''}
                                className="form-control"
                            />
                        </Field>
                    </div>
                    <Field label="Motif d’immobilisation">
                        <input
                            name="motif_immobilisation"
                            maxLength={255}
                            defaultValue={item?.motif_immobilisation ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Field label="Note">
                        <textarea
                            name="note"
                            rows={2}
                            defaultValue={item?.note ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Checkbox
                        name="actif"
                        label="Équipement actif"
                        defaultChecked={item?.actif ?? true}
                    />
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel={item ? 'Save changes' : 'Create'}
                        createAnother={!item}
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'plan') {
        const isEquipment = dialog.targetType === 'equipment';
        const plan = dialog.plan;
        const counterUnit = isEquipment
            ? (dialog.item as Equipment).type_compteur === 'heures'
                ? 'h'
                : 'km'
            : 'unités';

        return (
            <DialogShell
                title={`${plan ? 'Modifier l’opération' : 'Plan d’entretien'} · ${dialog.item.code}`}
                subtitle="L’échéance ouvrira automatiquement un ordre préventif lors du balayage quotidien."
                onClose={onClose}
                embedded={embedded}
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            plan
                                ? `/maintenance/plans/${plan.id}`
                                : '/maintenance/plans',
                            plan ? 'put' : 'post',
                        )
                    }
                    className="space-y-5"
                >
                    <input
                        type="hidden"
                        name="target_type"
                        value={dialog.targetType}
                    />
                    <input
                        type="hidden"
                        name="target_id"
                        value={dialog.item.id}
                    />
                    <Field label="Opération d’entretien">
                        <input
                            name="libelle"
                            required
                            defaultValue={plan?.libelle ?? ''}
                            className="form-control"
                            placeholder={
                                isEquipment
                                    ? 'Vidange moteur, filtre à air, graissage…'
                                    : 'Curage, nettoyage, contrôle des connexions…'
                            }
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Type">
                            <select
                                name="type"
                                defaultValue={plan?.type ?? 'preventif'}
                                required
                                className="form-control"
                            >
                                <option value="preventif">Préventif</option>
                                <option value="reglementaire">
                                    Réglementaire / obligatoire
                                </option>
                            </select>
                        </Field>
                        <Field label="Périodicité en jours">
                            <input
                                name="periodicite_jours"
                                type="number"
                                min="1"
                                max="3650"
                                required={!isEquipment}
                                defaultValue={plan?.periodicite_jours ?? ''}
                                className="form-control"
                                placeholder="Ex. 90"
                            />
                        </Field>
                        {isEquipment && (
                            <>
                                <Field
                                    label={`Périodicité au compteur (${counterUnit})`}
                                >
                                    <input
                                        name="periodicite_compteur"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        defaultValue={
                                            plan?.periodicite_compteur ?? ''
                                        }
                                        className="form-control"
                                        placeholder="Ex. 250 h ou 5 000 km"
                                    />
                                </Field>
                                <Field
                                    label={`Prévenir combien de ${counterUnit} avant ?`}
                                >
                                    <input
                                        name="alerte_avant_compteur"
                                        type="number"
                                        min="1"
                                        max="65535"
                                        defaultValue={
                                            plan?.alerte_avant_compteur ?? ''
                                        }
                                        className="form-control"
                                        placeholder="Ex. 20"
                                    />
                                </Field>
                                <Field
                                    label={`Compteur au dernier entretien (${counterUnit})`}
                                >
                                    <input
                                        name="dernier_compteur"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        defaultValue={
                                            plan?.dernier_compteur ?? ''
                                        }
                                        className="form-control"
                                    />
                                </Field>
                            </>
                        )}
                        <Field label="Date du dernier entretien">
                            <input
                                name="dernier_le"
                                type="date"
                                max={today}
                                defaultValue={plan?.dernier_le ?? ''}
                                className="form-control"
                            />
                        </Field>
                    </div>
                    <Field label="Opérations à réaliser">
                        <textarea
                            name="operations"
                            rows={3}
                            defaultValue={plan?.operations ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Field label="Pièces et consommables prévus">
                        <textarea
                            name="pieces"
                            rows={2}
                            defaultValue={plan?.pieces ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Checkbox
                        name="actif"
                        label="Plan actif"
                        defaultChecked={plan?.actif ?? true}
                    />
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel={
                            plan
                                ? 'Enregistrer les modifications'
                                : 'Ajouter au plan'
                        }
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'infrastructure') {
        const item = dialog.item;

        return (
            <DialogShell
                title={
                    item
                        ? `Modifier ${item.code}`
                        : 'Ajouter une infrastructure'
                }
                subtitle="Un actif fixe se surveille par inspection d’état."
                onClose={onClose}
                embedded={embedded}
                wide
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            item
                                ? `/maintenance/infrastructures/${item.id}`
                                : '/maintenance/infrastructures',
                            item ? 'put' : 'post',
                        )
                    }
                    className="space-y-5"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Code">
                            <input
                                name="code"
                                required
                                maxLength={24}
                                defaultValue={item?.code}
                                className="form-control"
                                placeholder="IRR-01"
                            />
                        </Field>
                        <Field label="Désignation">
                            <input
                                name="nom"
                                required
                                defaultValue={item?.nom}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Catégorie">
                            <select
                                name="categorie"
                                required
                                defaultValue={item?.categorie ?? 'irrigation'}
                                className="form-control"
                            >
                                {Object.entries(
                                    options.infrastructureCategories,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Caractéristiques">
                            <input
                                name="caracteristiques"
                                maxLength={255}
                                defaultValue={item?.caracteristiques ?? ''}
                                className="form-control"
                                placeholder="40 mm HDPE · 11 kVA…"
                            />
                        </Field>
                        <Field label="Site">
                            <select
                                name="site_id"
                                defaultValue={item?.site_id ?? ''}
                                className="form-control"
                            >
                                <option value="">Aucun</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.code} — {site.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Parcelle / bloc">
                            <select
                                name="parcelle_id"
                                defaultValue={item?.parcelle_id ?? ''}
                                className="form-control"
                            >
                                <option value="">Aucune parcelle</option>
                                {parcelles.map((parcelle) => (
                                    <option
                                        key={parcelle.id}
                                        value={parcelle.id}
                                    >
                                        {parcelle.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Localisation">
                            <input
                                name="localisation"
                                defaultValue={item?.localisation ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Latitude">
                            <input
                                name="latitude"
                                type="number"
                                min="-90"
                                max="90"
                                step="0.0000001"
                                defaultValue={item?.latitude ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Longitude">
                            <input
                                name="longitude"
                                type="number"
                                min="-180"
                                max="180"
                                step="0.0000001"
                                defaultValue={item?.longitude ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="État">
                            <select
                                name="etat"
                                required
                                defaultValue={item?.etat ?? 'bon'}
                                className="form-control"
                            >
                                {Object.entries(
                                    options.infrastructureStates,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Criticité">
                            <select
                                name="criticite"
                                required
                                defaultValue={item?.criticite ?? 3}
                                className="form-control"
                            >
                                <option value="1">1 — vitale</option>
                                <option value="2">2 — importante</option>
                                <option value="3">3 — normale</option>
                                <option value="4">4 — secondaire</option>
                                <option value="5">5 — accessoire</option>
                            </select>
                        </Field>
                        <Field label="Inspection tous les… jours">
                            <input
                                name="periodicite_inspection_jours"
                                type="number"
                                min="1"
                                defaultValue={
                                    item?.periodicite_inspection_jours ?? ''
                                }
                                className="form-control"
                            />
                        </Field>
                        <Field label="Prochaine inspection">
                            <input
                                name="prochaine_inspection"
                                type="date"
                                defaultValue={item?.prochaine_inspection ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Responsable">
                            <select
                                name="responsable_id"
                                defaultValue={item?.responsable_id ?? ''}
                                className="form-control"
                            >
                                <option value="">À assigner</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Année de mise en service">
                            <input
                                name="annee_mise_en_service"
                                type="number"
                                min="1900"
                                defaultValue={item?.annee_mise_en_service ?? ''}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Valeur de remplacement (USD)">
                            <input
                                name="valeur_remplacement"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={item?.valeur_remplacement ?? ''}
                                className="form-control"
                            />
                        </Field>
                    </div>
                    <Field label="Description">
                        <textarea
                            name="description"
                            rows={2}
                            defaultValue={item?.description ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Field label="Note">
                        <textarea
                            name="note"
                            rows={2}
                            defaultValue={item?.note ?? ''}
                            className="form-control"
                        />
                    </Field>
                    <Checkbox
                        name="actif"
                        label="Infrastructure en service"
                        defaultChecked={item?.actif ?? true}
                    />
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel={item ? 'Save changes' : 'Create'}
                        createAnother={!item}
                    />
                </form>
            </DialogShell>
        );
    }

    if (dialog.kind === 'inspection') {
        return (
            <DialogShell
                title="Inspecter"
                subtitle={`${dialog.item.code} — ${dialog.item.nom}`}
                onClose={onClose}
                embedded={embedded}
            >
                <form
                    onSubmit={(event) =>
                        onSubmit(
                            event,
                            `/maintenance/infrastructures/${dialog.item.id}/inspect`,
                        )
                    }
                    className="space-y-5"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Date de la visite" required>
                            <input
                                name="date"
                                type="date"
                                max={today}
                                defaultValue={today}
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="État constaté" required>
                            <select
                                name="etat_constate"
                                required
                                defaultValue=""
                                className="form-control"
                            >
                                <option value="" disabled>
                                    Select an option
                                </option>
                                {Object.entries(
                                    options.infrastructureStates,
                                ).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <Field
                        label="Ce que vous avez vu"
                        required
                        help="Décrivez les faits : fuite, fissure, corrosion, obstruction, câble dénudé."
                    >
                        <textarea
                            name="constat"
                            rows={4}
                            required
                            className="form-control"
                            placeholder="Décrivez précisément ce que vous avez constaté…"
                        />
                    </Field>
                    <Field label="Actions prises sur-le-champ">
                        <textarea
                            name="actions_immediates"
                            rows={2}
                            className="form-control"
                        />
                    </Field>
                    <Checkbox
                        name="intervention_requise"
                        label="Une intervention est nécessaire"
                        help="Un ordre de travail sera ouvert automatiquement."
                        defaultChecked={dialog.item.intervention_needed}
                    />
                    <Field label="Photo">
                        <input
                            name="photo_chemin"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            className="form-control file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8f1eb] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#245e42]"
                        />
                    </Field>
                    <DialogActions
                        submitting={submitting}
                        onClose={onClose}
                        submitLabel="Submit"
                    />
                </form>
            </DialogShell>
        );
    }

    return (
        <OrderActionDialog
            action={dialog.action}
            order={dialog.item}
            users={users}
            articles={articles}
            units={units}
            submitting={submitting}
            onClose={onClose}
            onSubmit={onSubmit}
        />
    );
}

function OrderActionDialog({
    action,
    order,
    users,
    articles,
    units,
    submitting,
    onClose,
    onSubmit,
}: {
    action: OrderAction;
    order: WorkOrder;
    users: NamedOption[];
    articles: Article[];
    units: Unit[];
    submitting: boolean;
    onClose: () => void;
    onSubmit: (
        event: React.FormEvent<HTMLFormElement>,
        path: string,
        method?: 'post' | 'put',
    ) => void;
}) {
    const [pieceOrigin, setPieceOrigin] = useState<
        'magasin' | 'achat_direct' | 'prestataire'
    >('magasin');
    const path = `/maintenance/orders/${order.id}`;
    const titles: Record<OrderAction, string> = {
        approve: 'Approuver la demande',
        refuse: 'Refuser la demande',
        plan: 'Planifier l’intervention',
        start: 'Démarrer l’intervention',
        piece: 'Ajouter une pièce',
        time: 'Pointer du temps',
        finish: 'Terminer les travaux',
        verify: 'Vérifier les travaux',
        close: 'Clore l’ordre de travail',
    };
    const endpoints: Record<OrderAction, string> = {
        approve: `${path}/approve`,
        refuse: `${path}/refuse`,
        plan: `${path}/plan`,
        start: `${path}/start`,
        piece: `${path}/pieces`,
        time: `${path}/time`,
        finish: `${path}/finish`,
        verify: `${path}/verify`,
        close: `${path}/close`,
    };

    return (
        <DialogShell
            title={titles[action]}
            subtitle={`${order.reference} — ${order.objet}`}
            onClose={onClose}
        >
            <form
                onSubmit={(event) => onSubmit(event, endpoints[action])}
                className="space-y-5"
            >
                {action === 'approve' && (
                    <Field label="Note d’approbation (facultative)">
                        <textarea
                            name="note"
                            rows={3}
                            className="form-control"
                        />
                    </Field>
                )}
                {action === 'refuse' && (
                    <Field label="Motif du refus">
                        <textarea
                            name="motif"
                            required
                            rows={4}
                            className="form-control"
                        />
                    </Field>
                )}
                {action === 'plan' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Responsable interne">
                                <select
                                    name="responsable_id"
                                    defaultValue=""
                                    className="form-control"
                                >
                                    <option value="">Aucun</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Ou prestataire">
                                <input
                                    name="prestataire"
                                    className="form-control"
                                    placeholder="Nom de l’entreprise ou du technicien"
                                />
                            </Field>
                            <Field label="Date planifiée">
                                <input
                                    name="planifie_le"
                                    type="date"
                                    min={today}
                                    defaultValue={order.planifie_le ?? today}
                                    required
                                    className="form-control"
                                />
                            </Field>
                            <Field label="Échéance">
                                <input
                                    name="echeance"
                                    type="date"
                                    min={today}
                                    defaultValue={order.echeance ?? ''}
                                    className="form-control"
                                />
                            </Field>
                        </div>
                        <p className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                            Avec un responsable interne, une tâche
                            opérationnelle datée sera créée automatiquement.
                        </p>
                    </>
                )}
                {action === 'start' && (
                    <>
                        {order.consignation_requise ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <Checkbox
                                    name="consignation"
                                    label="Je confirme la consignation et l’absence d’énergie ou de pression"
                                    help="Sans cette confirmation, le service refusera le démarrage."
                                />
                            </div>
                        ) : (
                            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                                Aucune consignation n’est requise pour cet
                                ordre.
                            </p>
                        )}
                    </>
                )}
                {action === 'piece' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Origine">
                                <select
                                    name="origine_piece"
                                    value={pieceOrigin}
                                    onChange={(event) =>
                                        setPieceOrigin(
                                            event.target.value as
                                                | 'magasin'
                                                | 'achat_direct'
                                                | 'prestataire',
                                        )
                                    }
                                    required
                                    className="form-control"
                                >
                                    <option value="magasin">
                                        Magasin — sortie immédiate
                                    </option>
                                    <option value="achat_direct">
                                        Achat direct
                                    </option>
                                    <option value="prestataire">
                                        Prestataire
                                    </option>
                                </select>
                            </Field>
                            {pieceOrigin === 'magasin' && (
                                <Field label="Article magasin">
                                    <select
                                        name="article_id"
                                        defaultValue=""
                                        required
                                        className="form-control"
                                    >
                                        <option value="">
                                            Choisir l’article
                                        </option>
                                        {articles.map((article) => (
                                            <option
                                                key={article.id}
                                                value={article.id}
                                            >
                                                {article.code} —{' '}
                                                {article.libelle}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                            <Field label="Désignation">
                                <input
                                    name="designation"
                                    required={pieceOrigin !== 'magasin'}
                                    maxLength={255}
                                    className="form-control"
                                    placeholder={
                                        pieceOrigin === 'magasin'
                                            ? 'Déduite de l’article si vide'
                                            : 'Nom précis de la pièce'
                                    }
                                />
                            </Field>
                            <Field label="Quantité">
                                <input
                                    name="quantite"
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    required
                                    className="form-control"
                                />
                            </Field>
                            {pieceOrigin === 'magasin' ? (
                                <Field label="Unité">
                                    <select
                                        name="unite_id"
                                        defaultValue=""
                                        className="form-control"
                                    >
                                        <option value="">
                                            Unité de l’article
                                        </option>
                                        {units.map((unit) => (
                                            <option
                                                key={unit.id}
                                                value={unit.id}
                                            >
                                                {unit.code} — {unit.nom}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            ) : (
                                <Field label="Unité libre">
                                    <input
                                        name="unite"
                                        required
                                        maxLength={24}
                                        list="maintenance-unit-options"
                                        className="form-control"
                                        placeholder="Ex. pièce, litre, mètre"
                                    />
                                    <datalist id="maintenance-unit-options">
                                        {units.map((unit) => (
                                            <option
                                                key={unit.id}
                                                value={unit.nom}
                                            >
                                                {unit.code}
                                            </option>
                                        ))}
                                    </datalist>
                                </Field>
                            )}
                            <Field label="Coût total hors magasin (USD)">
                                <input
                                    name="cout"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="form-control"
                                />
                            </Field>
                        </div>
                        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                            Une pièce issue du magasin crée son mouvement de
                            stock dans le même geste.
                        </p>
                    </>
                )}
                {action === 'time' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Intervenant">
                            <select
                                name="user_id"
                                defaultValue=""
                                className="form-control"
                            >
                                <option value="">Utilisateur courant</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Nom externe">
                            <input
                                name="intervenant_nom"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Date">
                            <input
                                name="date"
                                type="date"
                                max={today}
                                defaultValue={today}
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Heures">
                            <input
                                name="heures"
                                type="number"
                                min="0.01"
                                max="24"
                                step="0.25"
                                required
                                className="form-control"
                            />
                        </Field>
                        <Field label="Taux horaire (USD)">
                            <input
                                name="taux_horaire"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Travail effectué">
                            <input
                                name="travail"
                                maxLength={255}
                                className="form-control"
                            />
                        </Field>
                    </div>
                )}
                {action === 'finish' && (
                    <>
                        <Field label="Travaux réalisés — précisément">
                            <textarea
                                name="travaux_realises"
                                rows={4}
                                required
                                className="form-control"
                                placeholder="Pièce remplacée, réglage effectué, essais réalisés…"
                            />
                        </Field>
                        <Field
                            label={
                                order.recurrent
                                    ? 'Cause racine — obligatoire pour cette panne récurrente'
                                    : 'Cause racine (si identifiée)'
                            }
                        >
                            <textarea
                                name="cause_racine"
                                rows={3}
                                required={order.recurrent}
                                className="form-control"
                            />
                        </Field>
                        <Field label="Coût prestataire (USD)">
                            <input
                                name="cout_prestataire"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue="0"
                                className="form-control"
                            />
                        </Field>
                        <Field label="Photo après intervention (facultative, 5 Mo max.)">
                            <input
                                name="photo_apres"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                className="form-control file:mr-3 file:rounded-lg file:border-0 file:bg-[#e8f1eb] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#245e42]"
                            />
                        </Field>
                    </>
                )}
                {action === 'verify' && (
                    <>
                        <Field label="Décision">
                            <select
                                name="conforme"
                                defaultValue="1"
                                required
                                className="form-control"
                            >
                                <option value="1">
                                    Conforme — accepter les travaux
                                </option>
                                <option value="0">
                                    Non conforme — renvoyer en exécution
                                </option>
                            </select>
                        </Field>
                        <Field label="Observation">
                            <textarea
                                name="observation"
                                rows={3}
                                className="form-control"
                                placeholder="Obligatoire si les travaux sont non conformes"
                            />
                        </Field>
                        <p className="rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                            Une personne ayant exécuté ou pointé du temps sur
                            cet ordre ne peut pas le vérifier.
                        </p>
                    </>
                )}
                {action === 'close' && (
                    <Checkbox
                        name="remettre_en_service"
                        label="Remettre la cible en service"
                        help="L’équipement redevient disponible ou l’infrastructure revient à l’état bon."
                        defaultChecked
                    />
                )}
                <DialogActions
                    submitting={submitting}
                    onClose={onClose}
                    submitLabel={titles[action]}
                    danger={action === 'refuse'}
                />
            </form>
        </DialogShell>
    );
}

function DialogShell({
    title,
    subtitle,
    onClose,
    wide = false,
    embedded = false,
    children,
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    wide?: boolean;
    embedded?: boolean;
    children: React.ReactNode;
}) {
    const titleId = useId();
    const descriptionId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    const dialogErrors =
        usePage<{ errors?: Record<string, string> }>().props.errors ?? {};

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (embedded) {
            return;
        }

        const previousFocus = document.activeElement as HTMLElement | null;
        const frame = window.requestAnimationFrame(() =>
            closeButtonRef.current?.focus(),
        );

        return () => {
            window.cancelAnimationFrame(frame);
            previousFocus?.focus();
        };
    }, [embedded]);

    const handleDialogKeyDown = (
        event: React.KeyboardEvent<HTMLDivElement>,
    ) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onCloseRef.current();

            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ) ?? [],
        ).filter((element) => element.offsetParent !== null);

        if (focusable.length === 0) {
            event.preventDefault();

            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    const errorBanner = Object.keys(dialogErrors).length > 0 && (
        <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <div>
                <p className="font-semibold">
                    Le formulaire contient des erreurs.
                </p>
                {Object.entries(dialogErrors).map(([field, message]) => (
                    <p key={field}>{message}</p>
                ))}
            </div>
        </div>
    );

    if (embedded) {
        return (
            <section className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
                <div className={`p-5 sm:p-6 ${wide ? '' : 'max-w-4xl'}`}>
                    {errorBanner}
                    {children}
                </div>
            </section>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={subtitle ? descriptionId : undefined}
            onKeyDown={handleDialogKeyDown}
        >
            <div
                ref={panelRef}
                className={`max-h-[94vh] w-full overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-xl ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
            >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-[#e5e7eb] bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
                    <div>
                        <h2
                            id={titleId}
                            className="text-xl font-semibold text-[#111827]"
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p
                                id={descriptionId}
                                className="mt-1 text-sm text-[#6b7280]"
                            >
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </header>
                <div className="p-5 sm:p-6">
                    {errorBanner}
                    {children}
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    required = false,
    help,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#374151]">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs leading-5 text-[#6b7280]">
                    {help}
                </span>
            )}
        </label>
    );
}

function Checkbox({
    name,
    label,
    help,
    defaultChecked = false,
    onChange,
}: {
    name: string;
    label: string;
    help?: string;
    defaultChecked?: boolean;
    onChange?: (checked: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3">
            <input
                type="checkbox"
                name={name}
                defaultChecked={defaultChecked}
                value="1"
                onChange={(event) => onChange?.(event.target.checked)}
                className="mt-0.5 size-4 rounded border-[#d1d5db] text-[#1a5632] focus:ring-[#1a5632]"
            />
            <span>
                <span className="block text-sm font-medium text-[#374151]">
                    {label}
                </span>
                {help && (
                    <span className="mt-0.5 block text-xs leading-5 text-[#6b7280]">
                        {help}
                    </span>
                )}
            </span>
        </label>
    );
}

function DialogActions({
    submitting,
    onClose,
    submitLabel,
    danger = false,
    createAnother = false,
}: {
    submitting: boolean;
    onClose: () => void;
    submitLabel: string;
    danger?: boolean;
    createAnother?: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3 border-t border-[#e5e7eb] pt-5">
            <button
                type="submit"
                disabled={submitting}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a5632] hover:bg-[#154629]'}`}
            >
                {submitting && (
                    <LoaderCircle className="animate-spin" size={16} />
                )}
                {submitLabel}
            </button>
            {createAnother && (
                <button
                    type="submit"
                    name="_create_another"
                    value="1"
                    disabled={submitting}
                    className="h-9 rounded-lg px-3 text-sm font-medium text-[#4b5563] hover:bg-[#f3f4f6] disabled:opacity-60"
                >
                    Create &amp; create another
                </button>
            )}
            <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-9 rounded-lg px-3 text-sm font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
            >
                Cancel
            </button>
        </div>
    );
}

function Pill({
    className = '',
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
        >
            {children}
        </span>
    );
}

function ActionButton({
    label,
    icon: Icon,
    onClick,
    tone = 'primary',
}: {
    label: string;
    icon: typeof Wrench;
    onClick: () => void;
    tone?: 'primary' | 'neutral' | 'danger';
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition ${tone === 'danger' ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100' : tone === 'neutral' ? 'bg-white text-[#4b5563] ring-1 ring-[#d1d5db] hover:bg-[#f9fafb]' : 'bg-[#1a5632] text-white hover:bg-[#154629]'}`}
        >
            <Icon size={14} />
            {label}
        </button>
    );
}

function AlertBox({
    icon: Icon,
    title,
    text,
    tone = 'info',
}: {
    icon: typeof Wrench;
    title: string;
    text: string;
    tone?: 'info' | 'warning' | 'danger';
}) {
    const classes =
        tone === 'danger'
            ? 'border-red-200 bg-red-50 text-red-900'
            : tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-sky-200 bg-sky-50 text-sky-900';

    return (
        <div className={`rounded-xl border p-4 ${classes}`}>
            <div className="flex items-center gap-2">
                <Icon size={17} />
                <p className="text-xs font-black tracking-[.04em] uppercase">
                    {title}
                </p>
            </div>
            <p className="mt-2 text-xs leading-5">{text}</p>
        </div>
    );
}

function Detail({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div>
            <dt className="text-xs font-medium text-[#6b7280]">{label}</dt>
            <dd
                className={`mt-1 text-sm font-medium ${danger ? 'text-red-700' : 'text-[#111827]'}`}
            >
                {value}
            </dd>
        </div>
    );
}

function CostRow({
    label,
    value,
    total = false,
}: {
    label: string;
    value: string;
    total?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between gap-4 ${total ? 'mt-3 border-t border-[#dfe7e1] pt-3 text-base font-black text-[#17352a]' : 'text-[#56675d]'}`}
        >
            <span>{label}</span>
            <span className="font-bold">{value}</span>
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    text,
}: {
    icon: typeof Wrench;
    title: string;
    text: string;
}) {
    return (
        <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#f3f4f6] text-[#6b7280]">
                    <Icon size={24} />
                </span>
                <h3 className="mt-4 font-semibold text-[#111827]">{title}</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#6b7280]">
                    {text}
                </p>
            </div>
        </div>
    );
}
