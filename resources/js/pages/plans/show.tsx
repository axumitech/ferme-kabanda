import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Copy,
    FileText,
    Layers3,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { PlanConfirmDialog } from '@/components/plan-confirm-dialog';

type Line = {
    id: number;
    cible: string | null;
    code_cible: string | null;
    jour_offset: number | null;
    recurrence: string | null;
    tache: string;
    instruction: string | null;
    quantite: string | null;
    unite: string | null;
    categorie: string | null;
    priorite: string;
    point_controle: boolean;
    preuve: string | null;
};
type Plan = {
    id: number;
    code: string;
    libelle: string;
    version: number;
    statut: string;
    date_effet: string | null;
    lignes_count: number;
    created_at: string;
    note?: string | null;
    lines?: Line[];
};

export default function PlanShow({
    plan,
    versions,
}: {
    plan: Plan;
    versions: Plan[];
}) {
    const [dialog, setDialog] = useState<'duplicate' | 'regenerate' | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);

    const confirmAction = () => {
        if (!dialog) {
            return;
        }

        setProcessing(true);
        const path =
            dialog === 'duplicate'
                ? `/plans/${plan.id}/dupliquer`
                : `/plans/${plan.id}/regenerer-dates`;
        router.post(
            path,
            {},
            {
                onSuccess: () => setDialog(null),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title={`${plan.code} · v${plan.version}`} />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                            href="/plans"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                        >
                            <ArrowLeft size={16} /> Plans (versions)
                        </Link>
                        <div className="flex flex-wrap gap-2">
                            {plan.statut === 'en_vigueur' && (
                                <button
                                    type="button"
                                    onClick={() => setDialog('regenerate')}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                                >
                                    <RefreshCw size={16} /> Regénérer les dates
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setDialog('duplicate')}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                                <Copy size={16} /> Dupliquer en nouvelle version
                            </button>
                        </div>
                    </div>

                    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-7 text-white shadow-lg sm:p-9">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="font-mono text-sm font-bold text-emerald-300">
                                    {plan.code}
                                </p>
                                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                                    {plan.libelle}
                                </h1>
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                                    {plan.note || 'Aucune note de version.'}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Badge label={`Version ${plan.version}`} />
                                <Badge
                                    label={statusLabel(plan.statut)}
                                    green={plan.statut === 'en_vigueur'}
                                />
                            </div>
                        </div>
                    </header>

                    <section className="grid gap-4 md:grid-cols-3">
                        <Info
                            icon={<Layers3 size={19} />}
                            label="Lignes du protocole"
                            value={String(plan.lignes_count)}
                        />
                        <Info
                            icon={<CalendarDays size={19} />}
                            label="En vigueur depuis"
                            value={formatDate(plan.date_effet)}
                        />
                        <Info
                            icon={<FileText size={19} />}
                            label="Statut"
                            value={statusLabel(plan.statut)}
                        />
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="border-b border-slate-100 pb-4">
                                <p className="text-xs font-bold tracking-[.14em] text-emerald-700 uppercase">
                                    Fiche du plan
                                </p>
                                <h2 className="mt-1 text-xl font-bold">
                                    Détails de la version
                                </h2>
                            </div>
                            <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                                <Detail
                                    label="Code du plan"
                                    value={plan.code}
                                    mono
                                />
                                <Detail
                                    label="Version"
                                    value={`v${plan.version}`}
                                />
                                <Detail label="Intitulé" value={plan.libelle} />
                                <Detail
                                    label="Statut"
                                    value={statusLabel(plan.statut)}
                                />
                                <Detail
                                    label="Créé le"
                                    value={formatDateTime(plan.created_at)}
                                />
                                <Detail
                                    label="Date d’effet"
                                    value={formatDate(plan.date_effet)}
                                />
                                <div className="sm:col-span-2">
                                    <Detail
                                        label="Note de version"
                                        value={plan.note || '—'}
                                    />
                                </div>
                            </dl>
                        </article>
                        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="font-bold">Lignée {plan.code}</h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Toutes les versions de ce code.
                            </p>
                            <div className="mt-4 space-y-2">
                                {versions.map((version) => (
                                    <Link
                                        key={version.id}
                                        href={`/plans/${version.id}`}
                                        className={`block rounded-xl border p-3 transition ${version.id === plan.id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <b>Version {version.version}</b>
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {statusLabel(version.statut)}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {version.lignes_count} ligne(s)
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </aside>
                    </section>

                    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                            <p className="text-xs font-bold tracking-[.14em] text-emerald-700 uppercase">
                                Protocole d’exploitation
                            </p>
                            <h2 className="mt-1 text-xl font-bold">
                                Lignes du plan
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Toutes les opérations prévues par cette version,
                                dans leur ordre d’exécution.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[950px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Cible</th>
                                        <th className="px-4 py-3">Quand</th>
                                        <th className="px-4 py-3">Opération</th>
                                        <th className="px-4 py-3">Catégorie</th>
                                        <th className="px-4 py-3">Dose</th>
                                        <th className="px-4 py-3">Priorité</th>
                                        <th className="px-4 py-3">Contrôle</th>
                                        <th className="px-5 py-3">Preuve</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {plan.lines?.map((line) => (
                                        <tr
                                            key={line.id}
                                            className="hover:bg-slate-50/70"
                                        >
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
                                            <td className="px-4 py-4">
                                                <b>{line.tache}</b>
                                                {line.instruction && (
                                                    <span className="mt-1 block max-w-lg text-xs leading-5 text-slate-500">
                                                        {line.instruction}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 capitalize">
                                                {line.categorie || '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                {line.quantite
                                                    ? `${Number(line.quantite).toLocaleString('fr-FR')} ${line.unite || ''}`
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-4 capitalize">
                                                {line.priorite}
                                            </td>
                                            <td className="px-4 py-4">
                                                {line.point_controle
                                                    ? 'Oui'
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-4 capitalize">
                                                {line.preuve || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {!plan.lines?.length && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-14 text-center text-slate-500"
                                            >
                                                Ce plan ne contient encore
                                                aucune ligne de protocole.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </div>
            </main>

            <PlanConfirmDialog
                open={dialog !== null}
                onOpenChange={(open) => !open && setDialog(null)}
                title={
                    dialog === 'regenerate'
                        ? 'Regénérer les dates'
                        : 'Dupliquer en nouvelle version'
                }
                description={
                    dialog === 'regenerate'
                        ? 'Les dates seront recalculées pour les plantations actives. Les tâches déjà créées ne seront pas dupliquées.'
                        : `Une nouvelle version brouillon de ${plan.code} sera créée avec toutes les lignes de la version ${plan.version}. Cette version restera intacte.`
                }
                confirmLabel={
                    dialog === 'regenerate'
                        ? 'Regénérer les dates'
                        : 'Créer la nouvelle version'
                }
                processing={processing}
                onConfirm={confirmAction}
            />
        </>
    );
}

function Badge({ label, green = false }: { label: string; green?: boolean }) {
    return (
        <span
            className={`rounded-xl px-3 py-2 text-xs font-bold ${green ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30' : 'bg-white/10 text-white ring-1 ring-white/15'}`}
        >
            {label}
        </span>
    );
}
function Info({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-700">
                {icon}
                <span className="text-xs font-bold tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <p className="mt-3 text-xl font-black">{value}</p>
        </article>
    );
}
function Detail({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div>
            <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                {label}
            </dt>
            <dd
                className={`mt-1.5 text-sm leading-6 font-semibold text-slate-900 ${mono ? 'font-mono' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}
function statusLabel(value: string) {
    return value === 'en_vigueur'
        ? 'EN VIGUEUR'
        : value === 'brouillon'
          ? 'Brouillon'
          : value === 'archive'
            ? 'Archivé'
            : value;
}
function formatDate(value: string | null) {
    return value
        ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`))
        : 'Pas encore en vigueur';
}
function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(value));
}
