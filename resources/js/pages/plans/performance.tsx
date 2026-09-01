import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    FileStack,
    Search,
    TimerReset,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type PlanOption = {
    id: number;
    code: string;
    libelle: string;
    version: number;
    date_effet: string | null;
    lignes_count?: number;
};
type PerformanceLine = {
    id: number;
    cible: string | null;
    code_cible: string | null;
    jour_offset: number | null;
    recurrence: string | null;
    tache: string;
    instruction: string | null;
    categorie: string | null;
    dues: number;
    faites: number;
    a_temps: number;
    justifiees: number;
    non_justifiees: number;
    ouvertes: number;
    taux: number | null;
    taux_a_temps: number | null;
};
type Summary = {
    lignes: number;
    dues: number;
    faites: number;
    a_temps: number;
    justifiees: number;
    non_justifiees: number;
    ouvertes: number;
    taux: number | null;
    taux_a_temps: number | null;
};

export default function PlanPerformance({
    plans,
    plan,
    summary,
    lines,
}: {
    plans: PlanOption[];
    plan: PlanOption | null;
    summary: Summary;
    lines: PerformanceLine[];
}) {
    const [search, setSearch] = useState('');
    const [target, setTarget] = useState('');
    const [category, setCategory] = useState('');
    const targets = useMemo(
        () =>
            Array.from(
                new Set(lines.map((line) => line.cible).filter(Boolean)),
            ).sort() as string[],
        [lines],
    );
    const categories = useMemo(
        () =>
            Array.from(
                new Set(lines.map((line) => line.categorie).filter(Boolean)),
            ).sort() as string[],
        [lines],
    );
    const filtered = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase('fr');

        return lines.filter(
            (line) =>
                (!target || line.cible === target) &&
                (!category || line.categorie === category) &&
                (!needle ||
                    `${line.cible ?? ''} ${line.tache} ${line.instruction ?? ''}`
                        .toLocaleLowerCase('fr')
                        .includes(needle)),
        );
    }, [lines, search, target, category]);

    return (
        <>
            <Head title="Plan en vigueur — réalisé vs plan" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[.16em] text-emerald-700 uppercase">
                                Plans &amp; Gouvernance
                            </p>
                            <h1 className="mt-1 text-3xl font-black tracking-tight">
                                Plan en vigueur — réalisé vs plan
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                Le protocole complet et, en face, ce qui a
                                réellement été exécuté sur le terrain.
                            </p>
                        </div>
                        {plans.length > 0 && (
                            <label className="min-w-72">
                                <span className="mb-1.5 block text-xs font-bold text-slate-500 uppercase">
                                    Plan analysé
                                </span>
                                <select
                                    value={plan?.id ?? ''}
                                    onChange={(event) =>
                                        router.get(
                                            '/plans-en-vigueur',
                                            { plan: event.target.value },
                                            { preserveState: true },
                                        )
                                    }
                                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold shadow-sm outline-none focus:border-emerald-700"
                                >
                                    {plans.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.code} · v{item.version} —{' '}
                                            {item.libelle}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </header>

                    {!plan ? (
                        <EmptyState />
                    ) : (
                        <>
                            <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-lg sm:p-8">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-lg bg-emerald-400/15 px-2.5 py-1 font-mono text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                                                {plan.code}
                                            </span>
                                            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold ring-1 ring-white/15">
                                                Version {plan.version}
                                            </span>
                                        </div>
                                        <h2 className="mt-3 text-2xl font-black">
                                            {plan.libelle}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-300">
                                            En vigueur depuis le{' '}
                                            {formatDate(plan.date_effet)} ·{' '}
                                            {summary.lignes} ligne(s) de
                                            protocole
                                        </p>
                                    </div>
                                    <Link
                                        href={`/plans/${plan.id}`}
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"
                                    >
                                        Ouvrir la fiche du plan
                                    </Link>
                                </div>
                            </section>

                            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <Metric
                                    icon={<ClipboardCheck size={18} />}
                                    label="Tâches dues"
                                    value={summary.dues}
                                />
                                <Metric
                                    icon={<CheckCircle2 size={18} />}
                                    label="Faites"
                                    value={summary.faites}
                                    note={`${summary.a_temps} à temps`}
                                    tone="green"
                                />
                                <Metric
                                    icon={<TimerReset size={18} />}
                                    label="Justifiées"
                                    value={summary.justifiees}
                                    tone="amber"
                                />
                                <Metric
                                    icon={<AlertTriangle size={18} />}
                                    label="Non justifiées"
                                    value={summary.non_justifiees}
                                    tone="red"
                                />
                                <Metric
                                    icon={<TrendingUp size={18} />}
                                    label="Taux d’exécution"
                                    value={
                                        summary.taux === null
                                            ? '—'
                                            : `${summary.taux} %`
                                    }
                                    note={
                                        summary.taux_a_temps === null
                                            ? undefined
                                            : `${summary.taux_a_temps} % à temps`
                                    }
                                    tone="blue"
                                />
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-5">
                                    <div>
                                        <p className="text-sm font-bold">
                                            Exécution globale
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {summary.ouvertes} tâche(s) encore
                                            ouverte(s)
                                        </p>
                                    </div>
                                    <b className="text-2xl text-emerald-800">
                                        {summary.taux ?? 0} %
                                    </b>
                                </div>
                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                                        style={{
                                            width: `${Math.min(summary.taux ?? 0, 100)}%`,
                                        }}
                                    />
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                                    <label className="relative">
                                        <Search
                                            size={17}
                                            className="absolute top-3 left-3 text-slate-400"
                                        />
                                        <input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Rechercher une opération…"
                                            className={filterClass + ' pl-10'}
                                        />
                                    </label>
                                    <select
                                        value={target}
                                        onChange={(event) =>
                                            setTarget(event.target.value)
                                        }
                                        className={filterClass}
                                    >
                                        <option value="">
                                            Toutes les cibles
                                        </option>
                                        {targets.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={category}
                                        onChange={(event) =>
                                            setCategory(event.target.value)
                                        }
                                        className={filterClass}
                                    >
                                        <option value="">
                                            Toutes les catégories
                                        </option>
                                        {categories.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </section>

                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 px-5 py-4">
                                    <h2 className="font-bold">
                                        Performance ligne par ligne
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {filtered.length} opération(s)
                                        affichée(s)
                                    </p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1250px] text-left text-sm">
                                        <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-5 py-3">
                                                    Cible
                                                </th>
                                                <th className="px-4 py-3">
                                                    Quand
                                                </th>
                                                <th className="px-4 py-3">
                                                    Opération du protocole
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Dues
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Faites
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    À temps
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Justifiées
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Non justifiées
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Ouvertes
                                                </th>
                                                <th className="px-5 py-3 text-right">
                                                    Taux
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filtered.map((line) => (
                                                <PerformanceRow
                                                    key={line.id}
                                                    line={line}
                                                />
                                            ))}
                                            {filtered.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={10}
                                                        className="px-5 py-14 text-center text-slate-500"
                                                    >
                                                        Aucune ligne ne
                                                        correspond aux filtres.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}

function PerformanceRow({ line }: { line: PerformanceLine }) {
    return (
        <tr className="hover:bg-slate-50/70">
            <td className="px-5 py-4">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                    {line.cible || 'Général'}
                </span>
            </td>
            <td className="px-4 py-4 font-bold">
                {line.jour_offset !== null
                    ? `J${line.jour_offset >= 0 ? '+' : ''}${line.jour_offset}`
                    : line.recurrence || '—'}
            </td>
            <td className="max-w-lg px-4 py-4">
                <b>{line.tache}</b>
                {line.instruction && (
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {line.instruction}
                    </span>
                )}
            </td>
            <NumberCell value={line.dues} />
            <NumberCell value={line.faites} tone="green" />
            <NumberCell value={line.a_temps} />
            <NumberCell value={line.justifiees} tone="amber" />
            <NumberCell
                value={line.non_justifiees}
                tone={line.non_justifiees > 0 ? 'red' : undefined}
            />
            <NumberCell value={line.ouvertes} />
            <td className="px-5 py-4 text-right">
                <Rate value={line.taux} />
            </td>
        </tr>
    );
}

function NumberCell({
    value,
    tone,
}: {
    value: number;
    tone?: 'green' | 'amber' | 'red';
}) {
    const color =
        tone === 'green'
            ? 'text-emerald-700'
            : tone === 'amber'
              ? 'text-amber-700'
              : tone === 'red'
                ? 'text-red-700'
                : 'text-slate-700';

    return (
        <td className={`px-4 py-4 text-right font-bold ${color}`}>{value}</td>
    );
}
function Rate({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                Pas encore due
            </span>
        );
    }

    const color =
        value >= 90
            ? 'bg-emerald-100 text-emerald-800'
            : value >= 60
              ? 'bg-amber-100 text-amber-800'
              : 'bg-red-100 text-red-800';

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-black ${color}`}
        >
            {value} %
        </span>
    );
}
function Metric({
    icon,
    label,
    value,
    note,
    tone = 'slate',
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    note?: string;
    tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue';
}) {
    const colors = {
        slate: 'border-slate-200 bg-white text-slate-900',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        amber: 'border-amber-200 bg-amber-50 text-amber-900',
        red: 'border-red-200 bg-red-50 text-red-900',
        blue: 'border-blue-200 bg-blue-50 text-blue-900',
    };

    return (
        <article className={`rounded-2xl border p-5 shadow-sm ${colors[tone]}`}>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase opacity-70">
                {icon}
                {label}
            </div>
            <p className="mt-3 text-3xl font-black">{value}</p>
            {note && (
                <p className="mt-1 text-xs font-semibold opacity-70">{note}</p>
            )}
        </article>
    );
}
function EmptyState() {
    return (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <FileStack size={46} className="mx-auto text-slate-300" />
            <h2 className="mt-4 text-xl font-bold">Aucun plan en vigueur</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Créez un plan, ajoutez ses lignes puis mettez-le en vigueur pour
                comparer automatiquement le réalisé au protocole prévu.
            </p>
            <Link
                href="/plans"
                className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white"
            >
                Voir les plans
            </Link>
        </section>
    );
}
function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`))
        : 'date non renseignée';
}
const filterClass =
    'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';
