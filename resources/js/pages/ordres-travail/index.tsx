import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarClock,
    CircleGauge,
    Factory,
    Plus,
    Search,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import WorkOrderApprovalActions from '@/components/work-order-approval-actions';

type Order = {
    id: number;
    reference: string;
    origine: string;
    objet: string;
    cible_libelle?: string | null;
    type_intervention: string;
    priorite: string;
    arret_production: boolean;
    statut: string;
    prestataire?: string | null;
    cout_total?: string | null;
    recurrent: boolean;
    demande_le: string;
    echeance?: string | null;
    jours_ouvert: number;
    en_retard: boolean;
    demandeur_id?: number | null;
    site?: { code: string; nom: string } | null;
    demandeur?: { name: string } | null;
    responsable?: { name: string } | null;
};
type Props = {
    orders: Order[];
    options: {
        statuses: Record<string, string>;
        types: Record<string, string>;
    };
    stats: { open: number; urgent: number; stopped: number; late: number };
    permissions: { canManage: boolean; userId?: number | null };
};
const priorities: Record<string, string> = {
    basse: 'Basse',
    normale: 'Normale',
    elevee: 'Élevée',
    urgente: 'Urgente',
};
const priorityClass: Record<string, string> = {
    basse: 'bg-slate-100 text-slate-700',
    normale: 'bg-sky-100 text-sky-800',
    elevee: 'bg-amber-100 text-amber-800',
    urgente: 'bg-red-100 text-red-800',
};
const statusClass: Record<string, string> = {
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

export default function WorkOrderIndex({
    orders,
    options,
    stats,
    permissions,
}: Props) {
    const page = usePage<{ flash?: { success?: string } }>();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('open');
    const [nature, setNature] = useState('all');
    const [priority, setPriority] = useState('all');
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return orders.filter(
            (o) =>
                (status === 'all' ||
                    (status === 'open'
                        ? !['clos', 'refuse', 'annule'].includes(o.statut)
                        : o.statut === status)) &&
                (nature === 'all' || o.type_intervention === nature) &&
                (priority === 'all' || o.priorite === priority) &&
                `${o.reference} ${o.objet} ${o.cible_libelle ?? ''} ${o.site?.nom ?? ''} ${o.responsable?.name ?? ''}`
                    .toLocaleLowerCase('fr')
                    .includes(needle),
        );
    }, [orders, query, status, nature, priority]);

    return (
        <>
            <Head title="Ordres de travail" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/ordres-travail"
                            className="hover:text-emerald-600"
                        >
                            Ordres de travail
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Ordres de travail
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                                Du signalement à la clôture : priorisez les
                                pannes, sécurisez les interventions et gardez
                                une trace de chaque décision.
                            </p>
                        </div>
                        <Link
                            href="/ordres-travail/create"
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            <Plus size={17} />
                            Nouvel ordre de travail
                        </Link>
                    </header>
                    {page.props.flash?.success && (
                        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {page.props.flash.success}
                        </div>
                    )}
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat
                            icon={<CircleGauge />}
                            label="Ordres ouverts"
                            value={stats.open}
                            tone="emerald"
                        />
                        <Stat
                            icon={<AlertTriangle />}
                            label="Priorité urgente"
                            value={stats.urgent}
                            tone="red"
                        />
                        <Stat
                            icon={<Factory />}
                            label="Production arrêtée"
                            value={stats.stopped}
                            tone="amber"
                        />
                        <Stat
                            icon={<CalendarClock />}
                            label="En retard"
                            value={stats.late}
                            tone="violet"
                        />
                    </section>
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_190px_190px_170px] dark:border-slate-800">
                            <label className="relative">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Référence, objet, cible…"
                                    className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <Filter value={status} set={setStatus}>
                                <option value="open">Ouverts</option>
                                <option value="all">Tous les statuts</option>
                                {Object.entries(options.statuses).map(
                                    ([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ),
                                )}
                            </Filter>
                            <Filter value={nature} set={setNature}>
                                <option value="all">Toutes les natures</option>
                                {Object.entries(options.types).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </Filter>
                            <Filter value={priority} set={setPriority}>
                                <option value="all">Toutes priorités</option>
                                {Object.entries(priorities).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </Filter>
                        </div>
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {rows.length} résultat{rows.length !== 1 ? 's' : ''}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        {[
                                            'Référence',
                                            'Objet / cible',
                                            'Nature',
                                            'Priorité',
                                            'Responsable',
                                            'Échéance',
                                            'Statut',
                                            'Actions',
                                        ].map((h) => (
                                            <th key={h} className="px-5 py-4">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="group hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
                                        >
                                            <td className="px-5 py-4 align-top">
                                                <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                                    {order.reference}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {date(order.demande_le)} ·{' '}
                                                    {order.demandeur?.name ??
                                                        'Système'}
                                                </div>
                                            </td>
                                            <td className="max-w-sm px-5 py-4 align-top">
                                                <div className="font-semibold">
                                                    {order.objet}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {order.cible_libelle ??
                                                        'Travaux généraux'}
                                                    {order.site
                                                        ? ` · ${order.site.code}`
                                                        : ''}
                                                </div>
                                                {order.recurrent && (
                                                    <span className="mt-2 inline-block rounded bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                                                        PANNE RÉCURRENTE
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                {options.types[
                                                    order.type_intervention
                                                ] ?? order.type_intervention}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <span
                                                    className={`rounded-md px-2 py-1 text-xs font-bold ${priorityClass[order.priorite]}`}
                                                >
                                                    {priorities[
                                                        order.priorite
                                                    ] ?? order.priorite}
                                                </span>
                                                {order.arret_production && (
                                                    <div className="mt-2 text-[11px] font-bold text-red-700">
                                                        ARRÊT PRODUCTION
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                {order.responsable?.name ??
                                                    order.prestataire ?? (
                                                        <span className="text-slate-400">
                                                            Non assigné
                                                        </span>
                                                    )}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div
                                                    className={
                                                        order.en_retard
                                                            ? 'font-semibold text-red-700'
                                                            : ''
                                                    }
                                                >
                                                    {order.echeance
                                                        ? date(order.echeance)
                                                        : '—'}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {order.jours_ouvert} j
                                                    ouvert
                                                    {order.jours_ouvert !== 1
                                                        ? 's'
                                                        : ''}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <span
                                                    className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass[order.statut] ?? 'bg-slate-100'}`}
                                                >
                                                    {options.statuses[
                                                        order.statut
                                                    ] ?? order.statut}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div className="inline-flex items-center justify-end gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                                    <Link
                                                        href={`/ordres-travail/${order.id}`}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
                                                    >
                                                        <Wrench size={14} />
                                                        Ouvrir
                                                    </Link>
                                                    <WorkOrderApprovalActions
                                                        compact
                                                        order={order}
                                                        canApprove={
                                                            permissions.canManage &&
                                                            order.statut ===
                                                                'demande' &&
                                                            order.demandeur_id !==
                                                                permissions.userId
                                                        }
                                                        canRefuse={
                                                            permissions.canManage &&
                                                            [
                                                                'demande',
                                                                'approuve',
                                                            ].includes(
                                                                order.statut,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!rows.length && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-14 text-center"
                                            >
                                                <Wrench
                                                    className="mx-auto mb-3 text-slate-300"
                                                    size={34}
                                                />
                                                <p className="font-medium text-slate-600">
                                                    Aucun ordre de travail
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Modifiez les filtres ou
                                                    créez une nouvelle demande.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
function Filter({
    value,
    set,
    children,
}: {
    value: string;
    set: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <select
            value={value}
            onChange={(e) => set(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
            {children}
        </select>
    );
}
function Stat({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone: 'emerald' | 'red' | 'amber' | 'violet';
}) {
    const colors = {
        emerald: 'bg-emerald-100 text-emerald-700',
        red: 'bg-red-100 text-red-700',
        amber: 'bg-amber-100 text-amber-700',
        violet: 'bg-violet-100 text-violet-700',
    };

    return (
        <article className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className={`rounded-xl p-3 ${colors[tone]}`}>{icon}</span>
            <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
            </div>
        </article>
    );
}
function date(value: string) {
    return new Date(
        value.length === 10 ? `${value}T00:00:00` : value,
    ).toLocaleDateString('fr-FR');
}
