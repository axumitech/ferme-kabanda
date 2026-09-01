import { Head, Link, router, useForm } from '@inertiajs/react';
import { Eye, Filter, Flag, MoreHorizontal, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Plantation = {
    id: number;
    reference: string;
    lieu: string;
    j0: string;
    quantite?: string | null;
    unite?: string | null;
    statut: string;
    recolte_bloquee_jusquau?: string | null;
    total_recolte?: string | null;
    culture?: { id: number; nom: string; unite_recolte: string } | null;
    parcelle?: { code: string; nom: string } | null;
};
type Props = {
    plantations: Plantation[];
    filters: {
        cultures: Array<{ id: number; nom: string }>;
        statuses: Array<{ value: string; label: string }>;
    };
    today: string;
};
const statusLabels: Record<string, string> = {
    active: 'Active',
    recoltee: 'Récoltée',
    terminee: 'Terminée',
    echouee: 'Échouée',
};

export default function PlantationIndex({
    plantations,
    filters,
    today,
}: Props) {
    const [query, setQuery] = useState('');
    const [culture, setCulture] = useState('');
    const [status, setStatus] = useState('');
    const [generateTarget, setGenerateTarget] = useState<Plantation | null>(
        null,
    );
    const [finishTarget, setFinishTarget] = useState<Plantation | null>(null);
    const finishForm = useForm({ motif: '' });
    const rows = useMemo(
        () =>
            plantations.filter(
                (p) =>
                    `${p.reference} ${p.culture?.nom ?? ''} ${p.parcelle?.code ?? ''} ${p.lieu}`
                        .toLocaleLowerCase('fr')
                        .includes(query.toLocaleLowerCase('fr')) &&
                    (!culture || String(p.culture?.id) === culture) &&
                    (!status || p.statut === status),
            ),
        [culture, plantations, query, status],
    );
    const todayTime = new Date(`${today}T00:00:00`).getTime();

    return (
        <>
            <Head title="Plantations" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/plantations"
                            className="hover:text-emerald-600"
                        >
                            Plantations
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Plantations
                        </h1>
                        <Link
                            href="/plantations/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Planter
                        </Link>
                    </header>
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <div className="relative">
                                <Filter
                                    size={17}
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <select
                                    aria-label="Culture filter"
                                    value={culture}
                                    onChange={(e) => setCulture(e.target.value)}
                                    className="rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">
                                        Toutes les cultures
                                    </option>
                                    {filters.cultures.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <select
                                aria-label="Status filter"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option value="">Tous les statuts</option>
                                {filters.statuses.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {rows.length
                                ? `${rows.length} results`
                                : 'No results'}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        {[
                                            'Référence',
                                            'Culture',
                                            'Parcelle',
                                            'J0',
                                            'Quantité',
                                            'Statut',
                                            'Récolte',
                                            'Récolté',
                                            '',
                                        ].map((h, i) => (
                                            <th
                                                key={`${h}-${i}`}
                                                className="px-5 py-4"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((p) => {
                                        const jplus = Math.max(
                                            0,
                                            Math.floor(
                                                (todayTime -
                                                    new Date(
                                                        `${p.j0.slice(0, 10)}T00:00:00`,
                                                    ).getTime()) /
                                                    86_400_000,
                                            ),
                                        );
                                        const blocked =
                                            p.recolte_bloquee_jusquau &&
                                            p.recolte_bloquee_jusquau.slice(
                                                0,
                                                10,
                                            ) > today;

                                        return (
                                            <tr
                                                key={p.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <td className="px-5 py-4 font-semibold">
                                                    <Link
                                                        href={`/plantations/${p.id}`}
                                                        className="hover:text-emerald-600"
                                                    >
                                                        {p.reference}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4 font-semibold">
                                                    {p.culture?.nom ?? '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-medium">
                                                        {p.parcelle?.code ??
                                                            '—'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {p.lieu}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        {new Intl.DateTimeFormat(
                                                            'fr-FR',
                                                        ).format(
                                                            new Date(
                                                                `${p.j0.slice(0, 10)}T00:00:00`,
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        J+{jplus}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {p.quantite
                                                        ? `${Number(p.quantite).toLocaleString('fr-FR')} ${p.unite ?? ''}`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge
                                                        green={
                                                            p.statut ===
                                                            'active'
                                                        }
                                                    >
                                                        {statusLabels[
                                                            p.statut
                                                        ] ?? p.statut}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge green={!blocked}>
                                                        {blocked
                                                            ? `BLOQUÉE jusqu'au ${new Intl.DateTimeFormat('fr-FR').format(new Date(`${p.recolte_bloquee_jusquau!.slice(0, 10)}T00:00:00`))}`
                                                            : 'Autorisée'}
                                                    </Badge>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {Number(
                                                        p.total_recolte ?? 0,
                                                    ).toLocaleString(
                                                        'fr-FR',
                                                    )}{' '}
                                                    {p.culture?.unite_recolte}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-3 whitespace-nowrap">
                                                        {p.statut ===
                                                            'active' && (
                                                            <Link
                                                                href={`/plantations/${p.id}?action=treat`}
                                                                className="font-semibold text-amber-600"
                                                            >
                                                                Traiter
                                                            </Link>
                                                        )}
                                                        {[
                                                            'active',
                                                            'recoltee',
                                                        ].includes(
                                                            p.statut,
                                                        ) && (
                                                            <Link
                                                                href={`/plantations/${p.id}?action=harvest`}
                                                                className="font-semibold text-emerald-700 dark:text-emerald-400"
                                                            >
                                                                Récolter
                                                            </Link>
                                                        )}
                                                        <MoreActions
                                                            plantation={p}
                                                            onGenerate={() =>
                                                                setGenerateTarget(
                                                                    p,
                                                                )
                                                            }
                                                            onFinish={() => {
                                                                finishForm.reset();
                                                                setFinishTarget(
                                                                    p,
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                <div className="text-lg font-semibold">
                                                    No plantations
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
            <Dialog
                open={generateTarget !== null}
                onOpenChange={(open) => !open && setGenerateTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Générer les tâches du plan ?</DialogTitle>
                        <DialogDescription>
                            Les lignes J+ du plan en vigueur seront créées pour{' '}
                            {generateTarget?.reference}. Les tâches déjà
                            présentes ne seront pas dupliquées.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setGenerateTarget(null)}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                generateTarget &&
                                router.post(
                                    `/plantations/${generateTarget.id}/generer-taches`,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onSuccess: () =>
                                            setGenerateTarget(null),
                                    },
                                )
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Confirm
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={finishTarget !== null}
                onOpenChange={(open) => !open && setFinishTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer</DialogTitle>
                        <DialogDescription>
                            Clôturer la plantation {finishTarget?.reference}.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (finishTarget) {
                                finishForm.post(
                                    `/plantations/${finishTarget.id}/terminer`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setFinishTarget(null),
                                    },
                                );
                            }
                        }}
                    >
                        <label className="block text-sm font-medium">
                            Motif<span className="text-red-600">*</span>
                            <input
                                required
                                autoFocus
                                value={finishForm.data.motif}
                                onChange={(event) =>
                                    finishForm.setData(
                                        'motif',
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                            />
                            {finishForm.errors.motif && (
                                <span className="mt-1 block text-xs text-red-600">
                                    {finishForm.errors.motif}
                                </span>
                            )}
                        </label>
                        <DialogFooter className="mt-5">
                            <button
                                type="button"
                                onClick={() => setFinishTarget(null)}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={finishForm.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function MoreActions({
    plantation,
    onGenerate,
    onFinish,
}: {
    plantation: Plantation;
    onGenerate: () => void;
    onFinish: () => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="More actions"
                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <MoreHorizontal size={17} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem asChild>
                    <Link href={`/plantations/${plantation.id}`}>
                        <Eye />
                        Ouvrir
                    </Link>
                </DropdownMenuItem>
                {plantation.statut === 'active' && (
                    <DropdownMenuItem onSelect={onGenerate}>
                        <Zap />
                        Générer les tâches du plan
                    </DropdownMenuItem>
                )}
                {plantation.statut !== 'terminee' && (
                    <DropdownMenuItem onSelect={onFinish}>
                        <Flag />
                        Terminer
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
function Badge({
    green,
    children,
}: {
    green: boolean;
    children: React.ReactNode;
}) {
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${green ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'}`}
        >
            {children}
        </span>
    );
}
