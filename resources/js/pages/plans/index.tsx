import { Head, Link, router } from '@inertiajs/react';
import { Copy, Eye, FileStack, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PlanConfirmDialog } from '@/components/plan-confirm-dialog';

type Plan = {
    id: number;
    code: string;
    libelle: string;
    version: number;
    statut: string;
    date_effet: string | null;
    lignes_count: number;
    created_at: string;
};

const statuses: Record<string, { label: string; style: string }> = {
    brouillon: { label: 'Brouillon', style: 'bg-amber-100 text-amber-800' },
    en_vigueur: {
        label: 'EN VIGUEUR',
        style: 'bg-emerald-100 text-emerald-800',
    },
    archive: { label: 'Archivé', style: 'bg-slate-100 text-slate-600' },
};

export default function PlansIndex({
    plans,
    summary,
}: {
    plans: Plan[];
    summary: {
        total: number;
        drafts: number;
        active: number;
        lineages: number;
    };
}) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [duplicateTarget, setDuplicateTarget] = useState<Plan | null>(null);
    const [processing, setProcessing] = useState(false);
    const filtered = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase('fr');

        return plans.filter(
            (plan) =>
                (!status || plan.statut === status) &&
                (!needle ||
                    `${plan.code} ${plan.libelle}`
                        .toLocaleLowerCase('fr')
                        .includes(needle)),
        );
    }, [plans, search, status]);

    const duplicate = () => {
        if (!duplicateTarget) {
            return;
        }

        setProcessing(true);
        router.post(
            `/plans/${duplicateTarget.id}/dupliquer`,
            {},
            {
                onSuccess: () => setDuplicateTarget(null),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title="Plans (versions)" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[.16em] text-emerald-700 uppercase">
                                Plans &amp; Gouvernance
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                Plans (versions)
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                Créez un plan, construisez son protocole puis
                                suivez chaque version sans perdre l’historique.
                            </p>
                        </div>
                        <Link
                            href="/plans/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                            <Plus size={18} /> Nouveau plan d’exploitation
                        </Link>
                    </header>

                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat label="Versions" value={summary.total} />
                        <Stat
                            label="Lignées de plans"
                            value={summary.lineages}
                        />
                        <Stat
                            label="En vigueur"
                            value={summary.active}
                            tone="green"
                        />
                        <Stat
                            label="Brouillons"
                            value={summary.drafts}
                            tone="amber"
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
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
                                    placeholder="Rechercher un code ou un intitulé…"
                                    className="min-h-11 w-full rounded-xl border border-slate-300 pr-4 pl-10 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                                />
                            </label>
                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700"
                            >
                                <option value="">Tous les statuts</option>
                                <option value="en_vigueur">En vigueur</option>
                                <option value="brouillon">Brouillon</option>
                                <option value="archive">Archivé</option>
                            </select>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Code</th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Version</th>
                                        <th className="px-4 py-3">Statut</th>
                                        <th className="px-4 py-3">
                                            En vigueur depuis
                                        </th>
                                        <th className="px-4 py-3">Lignes</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filtered.map((plan) => {
                                        const state = statuses[plan.statut] ?? {
                                            label: plan.statut,
                                            style: 'bg-slate-100 text-slate-700',
                                        };

                                        return (
                                            <tr
                                                key={plan.id}
                                                className="hover:bg-slate-50/80"
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="rounded-lg bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-white">
                                                        {plan.code}
                                                    </span>
                                                </td>
                                                <td className="max-w-md px-4 py-4 font-semibold text-slate-800">
                                                    {plan.libelle}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                                                        v{plan.version}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.style}`}
                                                    >
                                                        {state.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-slate-600">
                                                    {formatDate(
                                                        plan.date_effet,
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 font-bold">
                                                    {plan.lignes_count}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/plans/${plan.id}`}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                                                        >
                                                            <Eye size={14} />{' '}
                                                            Ouvrir le plan
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDuplicateTarget(
                                                                    plan,
                                                                )
                                                            }
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <Copy size={14} />{' '}
                                                            Dupliquer en
                                                            nouvelle version
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <FileStack
                                                    size={38}
                                                    className="mx-auto mb-3 text-slate-300"
                                                />
                                                Aucun plan ne correspond à cette
                                                recherche.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
            <PlanConfirmDialog
                open={duplicateTarget !== null}
                onOpenChange={(open) => !open && setDuplicateTarget(null)}
                title="Dupliquer en nouvelle version"
                description={
                    duplicateTarget
                        ? `Une nouvelle version brouillon de ${duplicateTarget.code} sera créée avec les ${duplicateTarget.lignes_count} ligne(s) de la version ${duplicateTarget.version}. La version actuelle ne sera pas modifiée.`
                        : ''
                }
                confirmLabel="Créer la nouvelle version"
                processing={processing}
                onConfirm={duplicate}
            />
        </>
    );
}

function Stat({
    label,
    value,
    tone = 'slate',
}: {
    label: string;
    value: number;
    tone?: 'slate' | 'green' | 'amber';
}) {
    const colors =
        tone === 'green'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : tone === 'amber'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-white text-slate-900 border-slate-200';

    return (
        <article className={`rounded-2xl border p-5 shadow-sm ${colors}`}>
            <p className="text-xs font-bold tracking-wide uppercase opacity-70">
                {label}
            </p>
            <p className="mt-2 text-3xl font-black">{value}</p>
        </article>
    );
}

function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`))
        : '—';
}
