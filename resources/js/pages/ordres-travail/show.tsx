import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    ExternalLink,
    FileText,
    ShieldCheck,
    UserCheck,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import WorkOrderWorkflow from '@/components/work-order-workflow';

type Person = { id: number; name: string };
type Order = {
    id: number;
    reference: string;
    origine: string;
    objet: string;
    description?: string | null;
    cible_libelle?: string | null;
    type_intervention: string;
    priorite: string;
    arret_production: boolean;
    consequence?: string | null;
    statut: string;
    approbation_requise: boolean;
    demandeur_id?: number | null;
    responsable_id?: number | null;
    demandeur_nom: string;
    demande_le: string;
    echeance?: string | null;
    planifie_le?: string | null;
    en_retard: boolean;
    jours_ouvert: number;
    site?: { code: string; nom: string } | null;
    demandeur?: Person | null;
    responsable?: Person | null;
    approbateur?: Person | null;
    approuve_le?: string | null;
    prestataire?: string | null;
    consignation_requise: boolean;
    recurrent: boolean;
    permis_travail?: string | null;
    epi_requis?: string | null;
    motif_refus?: string | null;
    photo_avant_url?: string | null;
    evenements: Array<{
        id: number;
        resume: string;
        detail?: string | null;
        user_nom: string;
        created_at: string;
    }>;
};
type Props = {
    order: Order;
    options: {
        statuses: Record<string, string>;
        types: Record<string, string>;
        origins: Record<string, string>;
        permits: Record<string, string>;
    };
    permissions: {
        canManage: boolean;
        userId?: number | null;
        canExecute: boolean;
        executedByCurrentUser: boolean;
    };
    eligibleApprovers: Person[];
    users: Person[];
    today: string;
};
const priorityLabels: Record<string, string> = {
    basse: 'Basse',
    normale: 'Normale',
    elevee: 'Élevée',
    urgente: 'Urgente',
};
const priorityColors: Record<string, string> = {
    basse: 'bg-slate-100 text-slate-700',
    normale: 'bg-sky-100 text-sky-800',
    elevee: 'bg-amber-100 text-amber-800',
    urgente: 'bg-red-100 text-red-800',
};
const statusColors: Record<string, string> = {
    demande: 'bg-amber-100 text-amber-800',
    approuve: 'bg-sky-100 text-sky-800',
    planifie: 'bg-indigo-100 text-indigo-800',
    en_cours: 'bg-violet-100 text-violet-800',
    realise: 'bg-cyan-100 text-cyan-800',
    verifie: 'bg-emerald-100 text-emerald-800',
    clos: 'bg-slate-100 text-slate-700',
    refuse: 'bg-red-100 text-red-800',
    annule: 'bg-slate-100 text-slate-600',
};

export default function WorkOrderShow({
    order,
    options,
    permissions,
    eligibleApprovers,
    users,
    today,
}: Props) {
    const page = usePage<{ flash?: { success?: string } }>();
    const waiting = order.statut === 'demande';

    return (
        <>
            <Head title={order.reference} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <Link
                            href="/ordres-travail"
                            className="hover:text-emerald-600"
                        >
                            Ordres de travail
                        </Link>
                        <span>›</span>
                        <span>View</span>
                    </nav>
                    {page.props.flash?.success && (
                        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {page.props.flash.success}
                        </div>
                    )}
                    <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap items-start justify-between gap-5">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm font-bold tracking-wide text-emerald-700 dark:text-emerald-400">
                                        {order.reference}
                                    </span>
                                    <Badge
                                        className={
                                            statusColors[order.statut] ??
                                            'bg-slate-100'
                                        }
                                    >
                                        {options.statuses[order.statut] ??
                                            order.statut}
                                    </Badge>
                                    <Badge
                                        className={
                                            priorityColors[order.priorite]
                                        }
                                    >
                                        {priorityLabels[order.priorite] ??
                                            order.priorite}
                                    </Badge>
                                </div>
                                <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                                    {order.objet}
                                </h1>
                                <p className="mt-2 text-sm text-slate-500">
                                    {order.cible_libelle ?? 'Travaux généraux'}{' '}
                                    · demandé par{' '}
                                    {order.demandeur?.name ??
                                        order.demandeur_nom}{' '}
                                    le {dateTime(order.demande_le)}
                                </p>
                            </div>
                            {!waiting && order.statut !== 'refuse' && (
                                <Link
                                    href={`/maintenance?resource=orders&order=${order.id}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-800"
                                >
                                    <ExternalLink size={15} />
                                    Suivi complet
                                </Link>
                            )}
                        </div>
                        <WorkflowSteps order={order} />
                    </header>

                    <WorkOrderWorkflow
                        order={order}
                        permissions={permissions}
                        users={users}
                        today={today}
                    />

                    <ApprovalCard
                        order={order}
                        permissions={permissions}
                        eligibleApprovers={eligibleApprovers}
                    />

                    {(order.arret_production || order.consignation_requise) && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {order.arret_production && (
                                <Notice
                                    icon={<AlertTriangle />}
                                    tone="red"
                                    title="Arrêt de production"
                                >
                                    {order.consequence ||
                                        'Cet ordre est automatiquement traité en priorité urgente.'}
                                </Notice>
                            )}
                            {order.consignation_requise && (
                                <Notice
                                    icon={<ShieldCheck />}
                                    tone="amber"
                                    title="Consignation obligatoire"
                                >
                                    L’énergie, la pression et les pièces en
                                    mouvement doivent être sécurisées avant le
                                    démarrage.
                                </Notice>
                            )}
                        </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="flex items-center gap-2 text-base font-bold">
                                <FileText
                                    size={18}
                                    className="text-emerald-600"
                                />
                                Détails de l’intervention
                            </h2>
                            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                <Detail
                                    label="Origine"
                                    value={
                                        options.origins[order.origine] ??
                                        order.origine
                                    }
                                />
                                <Detail
                                    label="Nature"
                                    value={
                                        options.types[
                                            order.type_intervention
                                        ] ?? order.type_intervention
                                    }
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
                                    label="Échéance"
                                    value={
                                        order.echeance
                                            ? date(order.echeance)
                                            : 'Non définie'
                                    }
                                    danger={order.en_retard}
                                />
                                <Detail
                                    label="Responsable d’exécution"
                                    value={
                                        order.responsable?.name ??
                                        order.prestataire ??
                                        'À désigner après approbation'
                                    }
                                />
                                <Detail
                                    label="Ouvert depuis"
                                    value={`${order.jours_ouvert} jour${order.jours_ouvert !== 1 ? 's' : ''}`}
                                />
                                <Detail
                                    label="Permis de travail"
                                    value={
                                        options.permits[
                                            order.permis_travail ?? 'aucun'
                                        ] ?? 'Aucun permis requis'
                                    }
                                />
                                <Detail
                                    label="EPI exigés"
                                    value={order.epi_requis || 'Non précisés'}
                                />
                                <Detail
                                    label="Consignation"
                                    value={
                                        order.consignation_requise
                                            ? 'Requise avant intervention'
                                            : 'Non requise'
                                    }
                                />
                            </dl>
                            {order.description && (
                                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                                    <h3 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                                        Problème constaté
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                                        {order.description}
                                    </p>
                                </div>
                            )}
                            {order.photo_avant_url && (
                                <a
                                    href={order.photo_avant_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-5 block max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                                >
                                    <img
                                        src={order.photo_avant_url}
                                        alt={`Problème — ${order.reference}`}
                                        className="h-44 w-full object-cover"
                                    />
                                    <span className="block px-3 py-2 text-xs font-semibold text-emerald-700">
                                        Voir la photo du problème
                                    </span>
                                </a>
                            )}
                            {order.motif_refus && (
                                <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                                    <strong>Motif du refus :</strong>{' '}
                                    {order.motif_refus}
                                </div>
                            )}
                        </section>
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="flex items-center gap-2 text-base font-bold">
                                <CalendarClock
                                    size={18}
                                    className="text-emerald-600"
                                />
                                Journal de l’ordre
                            </h2>
                            <div className="mt-5 space-y-5">
                                {order.evenements.map((event, index) => (
                                    <div
                                        key={event.id}
                                        className="relative grid grid-cols-[24px_1fr] gap-3"
                                    >
                                        {index <
                                            order.evenements.length - 1 && (
                                            <span className="absolute top-6 bottom-[-20px] left-[11px] w-px bg-slate-200 dark:bg-slate-700" />
                                        )}
                                        <span className="relative z-10 mt-0.5 grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                                            <CheckCircle2 size={13} />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {event.resume}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {dateTime(event.created_at)} ·{' '}
                                                {event.user_nom}
                                            </p>
                                            {event.detail && (
                                                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                                    {event.detail}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!order.evenements.length && (
                                    <p className="text-sm text-slate-500">
                                        Aucun événement enregistré.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                    <Link
                        href="/ordres-travail"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} />
                        Retour aux ordres de travail
                    </Link>
                </div>
            </main>
        </>
    );
}

function WorkflowSteps({ order }: { order: Order }) {
    const labels = [
        order.approbation_requise ? 'Approbation' : 'Sans approbation',
        'Planification',
        'Exécution',
        'Vérification',
        'Clôture',
    ];
    const current =
        order.statut === 'demande'
            ? 0
            : order.statut === 'approuve'
              ? 1
              : ['planifie', 'en_cours'].includes(order.statut)
                ? 2
                : order.statut === 'realise'
                  ? 3
                  : order.statut === 'verifie'
                    ? 4
                    : order.statut === 'clos'
                      ? 5
                      : 0;

    if (['refuse', 'annule'].includes(order.statut)) {
        return null;
    }

    return (
        <div className="mt-7 overflow-x-auto pb-1">
            <div className="flex min-w-[620px] items-start">
                {labels.map((label, index) => {
                    const done = index < current;
                    const active = index === current;

                    return (
                        <div
                            key={label}
                            className="relative flex flex-1 flex-col items-center text-center"
                        >
                            {index > 0 && (
                                <span
                                    className={`absolute top-4 right-1/2 h-0.5 w-full ${done || active ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                />
                            )}
                            <span
                                className={`relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-bold ${done ? 'border-emerald-600 bg-emerald-600 text-white' : active ? 'border-emerald-600 bg-white text-emerald-700 ring-4 ring-emerald-100 dark:bg-slate-900 dark:ring-emerald-950' : 'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}
                            >
                                {done ? <CheckCircle2 size={15} /> : index + 1}
                            </span>
                            <span
                                className={`mt-2 text-xs font-semibold ${done || active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ApprovalCard({
    order,
    permissions,
    eligibleApprovers,
}: {
    order: Order;
    permissions: Props['permissions'];
    eligibleApprovers: Person[];
}) {
    if (order.statut === 'demande') {
        const own = order.demandeur_id === permissions.userId;

        return (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                        <UserCheck />
                    </span>
                    <div>
                        <h2 className="font-bold text-amber-950 dark:text-amber-100">
                            Approbation requise avant planification
                        </h2>
                        <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200">
                            {own
                                ? 'Vous avez créé cette demande : un autre responsable doit obligatoirement l’approuver.'
                                : permissions.canManage
                                  ? 'Vous êtes autorisé à approuver cet ordre.'
                                  : 'Un responsable de niveau 1 à 3 ou un administrateur doit approuver cet ordre.'}
                        </p>
                        <p className="mt-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
                            Approbateurs possibles :{' '}
                            {eligibleApprovers.length
                                ? eligibleApprovers
                                      .slice(0, 6)
                                      .map((user) => user.name)
                                      .join(', ')
                                : 'aucun approbateur actif configuré'}
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    if (order.statut === 'refuse') {
        return (
            <Notice icon={<XCircle />} tone="red" title="Ordre refusé">
                {order.motif_refus || 'Aucun motif renseigné.'}
            </Notice>
        );
    }

    if (!order.approbation_requise && order.statut === 'approuve') {
        return (
            <Notice
                icon={<CheckCircle2 />}
                tone="emerald"
                title="Approbation non requise"
            >
                Cet ordre est déjà autorisé et peut être planifié directement.
            </Notice>
        );
    }

    if (order.approbateur) {
        return (
            <Notice
                icon={<CheckCircle2 />}
                tone="emerald"
                title="Ordre approuvé"
            >
                Approuvé par {order.approbateur.name}
                {order.approuve_le ? ` le ${dateTime(order.approuve_le)}` : ''}.
                Il peut maintenant être planifié.
            </Notice>
        );
    }

    return null;
}
function Notice({
    icon,
    tone,
    title,
    children,
}: {
    icon: ReactNode;
    tone: 'red' | 'amber' | 'emerald';
    title: string;
    children: ReactNode;
}) {
    const colors = {
        red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100',
        amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100',
        emerald:
            'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100',
    };

    return (
        <section className={`flex gap-3 rounded-xl border p-4 ${colors[tone]}`}>
            <span className="shrink-0">{icon}</span>
            <div>
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm opacity-80">{children}</p>
            </div>
        </section>
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
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {label}
            </dt>
            <dd
                className={`mt-1 text-sm font-medium ${danger ? 'text-red-700' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}
function Badge({
    className,
    children,
}: {
    className: string;
    children: ReactNode;
}) {
    return (
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${className}`}>
            {children}
        </span>
    );
}
function date(value: string) {
    return new Date(
        value.length === 10 ? `${value}T00:00:00` : value,
    ).toLocaleDateString('fr-FR');
}
function dateTime(value: string) {
    return new Date(value).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}
