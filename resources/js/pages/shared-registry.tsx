import { Head, Link } from '@inertiajs/react';
import { Columns3, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TaskActionDialogs } from '@/components/task-action-dialogs';
import type {
    ActionMotif,
    ActionTask,
    ActionUnit,
    ActionWorkOrder,
} from '@/components/task-action-dialogs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Task = ActionTask & {
    description?: string | null;
    instruction?: string | null;
    lieu?: string | null;
    statut: string;
    priorite: string;
    statut_approbation?: string | null;
    date_due: string;
    responsable?: string | null;
    departement?: string | null;
    site?: string | null;
    can_act: boolean;
};

type Props = {
    scopeMessage: string;
    tasks: Task[];
    taskDepartments: Array<{ id: number; code: string; nom: string }>;
    motifs: ActionMotif[];
    openWorkOrders: ActionWorkOrder[];
    units: ActionUnit[];
};

const statusLabels: Record<string, string> = {
    a_faire: 'À faire',
    faite: 'Faite',
    non_faite_justifiee: 'Justifiée',
    non_faite_non_justifiee: 'Non recevable',
    reportee: 'Reportée',
    annulee: 'Annulée',
};
const priorityLabels: Record<string, string> = {
    urgente: 'Urgent',
    elevee: 'Élevée',
    normale: 'Normale',
    planifiee: 'Planifiée',
};
const approvalLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    soumise: 'À approuver',
    approuvee: 'Approuvée',
    refusee: 'Refusée',
};
const badgeClass: Record<string, string> = {
    a_faire:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    faite: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    soumise:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    approuvee:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    refusee: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    default:
        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};
const inputClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900';

export default function SharedRegistry({
    scopeMessage,
    tasks,
    taskDepartments,
    motifs,
    openWorkOrders,
    units,
}: Props) {
    const [query, setQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [department, setDepartment] = useState('');
    const [approval, setApproval] = useState('');
    const [mineOnly, setMineOnly] = useState(false);
    const [completeTask, setCompleteTask] = useState<Task | null>(null);
    const [justifyTask, setJustifyTask] = useState<Task | null>(null);
    const activeFilters = [
        status,
        department,
        approval,
        mineOnly ? 'mine' : '',
    ].filter(Boolean).length;

    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return tasks.filter((task) => {
            const matchesQuery =
                `${task.reference} ${task.titre} ${task.lieu ?? ''} ${task.responsable ?? ''}`
                    .toLocaleLowerCase('fr')
                    .includes(needle);

            return (
                matchesQuery &&
                (!status || task.statut === status) &&
                (!department || task.departement === department) &&
                (!approval || task.statut_approbation === approval) &&
                (!mineOnly || task.can_act)
            );
        });
    }, [approval, department, mineOnly, query, status, tasks]);

    return (
        <>
            <Head title="Tâches" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/registre-ferme"
                            className="hover:text-emerald-600"
                        >
                            Tâches
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold tracking-tight">
                                Tâches
                            </h1>
                            <p className="mt-2 max-w-3xl text-base text-slate-500">
                                {scopeMessage} Le filtre « Mes tâches » est un
                                confort de lecture — retirez-le pour voir toute
                                la ferme.
                            </p>
                        </div>
                        <Link
                            href="/registre-ferme/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            Nouvelle tâche
                        </Link>
                    </header>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => setFilterOpen(true)}
                                aria-label="Filter"
                                className="relative rounded-lg border border-slate-300 p-2 text-slate-500 dark:border-slate-700"
                            >
                                <Filter size={18} />
                                {activeFilters > 0 && (
                                    <span className="absolute -top-2 -right-2 rounded-full bg-emerald-600 px-1.5 text-[10px] text-white">
                                        {activeFilters}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                aria-label="Column manager"
                                className="rounded-lg border border-slate-300 p-2 text-slate-500 dark:border-slate-700"
                            >
                                <Columns3 size={18} />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">Référence</th>
                                        <th className="px-5 py-4">Tâche</th>
                                        <th className="px-5 py-4">
                                            Responsable
                                        </th>
                                        <th className="px-5 py-4">Dépt.</th>
                                        <th className="px-5 py-4">Échéance</th>
                                        <th className="px-5 py-4">Priorité</th>
                                        <th className="px-5 py-4">Statut</th>
                                        <th className="px-5 py-4">
                                            Approbation
                                        </th>
                                        <th className="px-5 py-4">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filtered.map((task) => {
                                        const lateDays =
                                            task.statut === 'a_faire'
                                                ? Math.max(
                                                      0,
                                                      Math.floor(
                                                          (new Date().setHours(
                                                              0,
                                                              0,
                                                              0,
                                                              0,
                                                          ) -
                                                              new Date(
                                                                  `${task.date_due}T00:00:00`,
                                                              ).getTime()) /
                                                              86_400_000,
                                                      ),
                                                  )
                                                : 0;
                                        const executable =
                                            task.can_act &&
                                            task.statut === 'a_faire' &&
                                            (!task.statut_approbation ||
                                                task.statut_approbation ===
                                                    'approuvee');

                                        return (
                                            <tr
                                                key={task.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <td className="px-5 py-4 align-top font-medium">
                                                    <Link
                                                        href={`/registre-ferme/${task.id}`}
                                                        className="hover:text-emerald-600"
                                                    >
                                                        {task.reference}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <Link
                                                        href={`/registre-ferme/${task.id}`}
                                                        className="font-semibold hover:text-emerald-600"
                                                    >
                                                        {task.titre}
                                                    </Link>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {task.lieu}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    {task.responsable || '—'}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
                                                        {task.departement ||
                                                            '—'}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`px-5 py-4 align-top ${lateDays ? 'font-semibold text-red-600' : ''}`}
                                                >
                                                    {new Intl.DateTimeFormat(
                                                        'fr-FR',
                                                    ).format(
                                                        new Date(
                                                            `${task.date_due}T00:00:00`,
                                                        ),
                                                    )}
                                                    {lateDays > 0 && (
                                                        <div className="mt-1 text-xs">
                                                            Retard {lateDays} j
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
                                                        {priorityLabels[
                                                            task.priorite
                                                        ] ?? task.priorite}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass[task.statut] ?? badgeClass.default}`}
                                                    >
                                                        {statusLabels[
                                                            task.statut
                                                        ] ?? task.statut}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass[task.statut_approbation ?? ''] ?? badgeClass.default}`}
                                                    >
                                                        {approvalLabels[
                                                            task.statut_approbation ??
                                                                ''
                                                        ] ??
                                                            task.statut_approbation ??
                                                            'Approuvée'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="flex justify-end gap-2">
                                                        {executable && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCompleteTask(
                                                                            task,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                                                                >
                                                                    Exécuter
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setJustifyTask(
                                                                            task,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
                                                                >
                                                                    Justifier
                                                                </button>
                                                            </>
                                                        )}
                                                        <Link
                                                            href={`/registre-ferme/${task.id}`}
                                                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-600"
                                                        >
                                                            Ouvrir
                                                        </Link>
                                                        <Link
                                                            href={`/registre-ferme/${task.id}/edit`}
                                                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-600"
                                                        >
                                                            Modifier
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filtered.length === 0 && (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 dark:bg-slate-800">
                                    ×
                                </div>
                                <h2 className="font-semibold">No tâches</h2>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filter</DialogTitle>
                        <DialogDescription>
                            Affiner le registre des tâches.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <label className="block text-sm font-medium">
                            Statut
                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Tous les statuts</option>
                                {Object.entries(statusLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="block text-sm font-medium">
                            Département
                            <select
                                value={department}
                                onChange={(event) =>
                                    setDepartment(event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Tous les départements</option>
                                {taskDepartments.map((item) => (
                                    <option key={item.id} value={item.code}>
                                        {item.nom}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block text-sm font-medium">
                            Approbation
                            <select
                                value={approval}
                                onChange={(event) =>
                                    setApproval(event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Tous</option>
                                {Object.entries(approvalLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label className="flex items-center gap-3 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={mineOnly}
                                onChange={(event) =>
                                    setMineOnly(event.target.checked)
                                }
                            />{' '}
                            Mes tâches uniquement
                        </label>
                    </div>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setFilterOpen(false)}
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Apply filters
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStatus('');
                                setDepartment('');
                                setApproval('');
                                setMineOnly(false);
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                        >
                            Reset
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <TaskActionDialogs
                completeTask={completeTask}
                justifyTask={justifyTask}
                motifs={motifs}
                openWorkOrders={openWorkOrders}
                units={units}
                onCloseComplete={() => setCompleteTask(null)}
                onCloseJustify={() => setJustifyTask(null)}
            />
        </>
    );
}
