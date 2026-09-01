import { Head, useForm } from '@inertiajs/react';
import { Check, Lightbulb, Search, SlidersHorizontal } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { offlineQueue } from '@/lib/offline-queue';

type Motif = { id: number; code: string; libelle: string; recevable: boolean };
type WorkOrder = {
    id: number;
    reference: string;
    objet: string;
    cible_libelle?: string | null;
};
type Unit = { id: number; code: string; nom: string };
type Task = {
    id: number;
    reference: string;
    titre: string;
    instruction?: string | null;
    description?: string | null;
    lieu?: string | null;
    date_due: string;
    heure_due?: string | null;
    statut: string;
    statut_approbation?: string;
    can_act: boolean;
};
type Props = {
    tasks: Task[];
    motifs: Motif[];
    openWorkOrders: WorkOrder[];
    units: Unit[];
};

const today = new Date().toISOString().slice(0, 10);
const fieldClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const statusLabels: Record<string, string> = {
    a_faire: 'À faire',
    faite: 'Faite',
    non_faite_justifiee: 'Justifiée',
    non_faite_non_justifiee: 'Non recevable',
    reportee: 'Reportée',
    annulee: 'Annulée',
};
const statusClasses: Record<string, string> = {
    a_faire:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    faite: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    non_faite_justifiee:
        'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    non_faite_non_justifiee:
        'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    reportee:
        'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    annulee:
        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

function dateParts(value: string) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    const lateDays = Math.max(
        0,
        Math.floor(
            (new Date(`${today}T00:00:00`).getTime() - date.getTime()) /
                86_400_000,
        ),
    );

    return {
        label: new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
        }).format(date),
        lateDays,
    };
}

export default function MyDay({ tasks, motifs, openWorkOrders, units }: Props) {
    const [query, setQuery] = useState('');
    const [proposalOpen, setProposalOpen] = useState(false);
    const [completeTask, setCompleteTask] = useState<Task | null>(null);
    const [justifyTask, setJustifyTask] = useState<Task | null>(null);
    const proposalForm = useForm({
        titre: '',
        description: '',
        date_due: today,
        justification: '',
        cout_estime: '',
    });
    const completeForm = useForm({ quantite: '', unite: '', commentaire: '' });
    const justifyForm = useForm({
        motif_id: motifs[0] ? String(motifs[0].id) : '',
        motif_precision: '',
        ordre_travail_id: '',
    });
    const selectedMotif = motifs.find(
        (motif) => String(motif.id) === justifyForm.data.motif_id,
    );
    const needsWorkOrder = selectedMotif?.code.toUpperCase() === 'PANNE';

    const visibleTasks = useMemo(() => {
        const normalized = query.trim().toLocaleLowerCase('fr');

        return tasks.filter((task) => {
            const taskDate = task.date_due.slice(0, 10);
            const belongsToUser = task.can_act;
            const due =
                taskDate === today ||
                (task.statut === 'a_faire' && taskDate <= today);
            const matches =
                `${task.titre} ${task.reference} ${task.lieu ?? ''} ${task.instruction ?? ''}`
                    .toLocaleLowerCase('fr')
                    .includes(normalized);

            return belongsToUser && due && matches;
        });
    }, [query, tasks]);

    const submitProposal = (event: FormEvent) => {
        event.preventDefault();
        proposalForm.post('/journee/propositions', {
            preserveScroll: true,
            onSuccess: () => {
                proposalForm.reset();
                proposalForm.setData('date_due', today);
                setProposalOpen(false);
            },
        });
    };

    const submitComplete = (event: FormEvent) => {
        event.preventDefault();

        if (!completeTask) {
            return;
        }

        const url = `/journee/taches/${completeTask.id}/complete`;

        if (!navigator.onLine) {
            offlineQueue.enqueue({
                method: 'POST',
                url,
                payload: completeForm.data,
                label: `Tâche faite : ${completeTask.reference}`,
            });
            completeForm.reset();
            setCompleteTask(null);

            return;
        }

        completeForm.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                completeForm.reset();
                setCompleteTask(null);
            },
        });
    };

    const submitJustification = (event: FormEvent) => {
        event.preventDefault();

        if (!justifyTask) {
            return;
        }

        const url = `/journee/taches/${justifyTask.id}/justify`;

        if (!navigator.onLine) {
            offlineQueue.enqueue({
                method: 'POST',
                url,
                payload: justifyForm.data,
                label: `Justification : ${justifyTask.reference}`,
            });
            justifyForm.reset('motif_precision', 'ordre_travail_id');
            setJustifyTask(null);

            return;
        }

        justifyForm.post(url, {
            preserveScroll: true,
            onSuccess: () => {
                justifyForm.reset('motif_precision', 'ordre_travail_id');
                setJustifyTask(null);
            },
        });
    };

    return (
        <>
            <Head title="Ma journée" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Ma journée
                        </h1>
                        <button
                            type="button"
                            onClick={() => setProposalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                            <Lightbulb size={18} /> Proposer une action
                        </button>
                    </header>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Rechercher</span>
                                <input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Rechercher"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <button
                                type="button"
                                aria-label="Gérer les colonnes"
                                className="rounded-lg border border-slate-300 p-2 text-slate-500 dark:border-slate-700 dark:text-slate-300"
                            >
                                <SlidersHorizontal size={18} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:bg-slate-950/60 dark:text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">
                                            Échéance
                                        </th>
                                        <th className="px-5 py-3.5">Tâche</th>
                                        <th className="px-5 py-3.5">
                                            Instruction
                                        </th>
                                        <th className="px-5 py-3.5">Statut</th>
                                        <th className="px-5 py-3.5">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {visibleTasks.map((task) => {
                                        const due = dateParts(task.date_due);
                                        const canExecute =
                                            task.statut === 'a_faire' &&
                                            (!task.statut_approbation ||
                                                task.statut_approbation ===
                                                    'approuvee');

                                        return (
                                            <tr
                                                key={task.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <td className="px-5 py-4 align-top">
                                                    <div
                                                        className={
                                                            due.lateDays
                                                                ? 'font-semibold text-red-600 dark:text-red-400'
                                                                : 'font-medium'
                                                        }
                                                    >
                                                        {due.label}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {due.lateDays
                                                            ? `Retard ${due.lateDays} j`
                                                            : task.heure_due?.slice(
                                                                  0,
                                                                  5,
                                                              )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <div className="font-semibold">
                                                        {task.titre}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {[
                                                            task.reference,
                                                            task.lieu,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </div>
                                                </td>
                                                <td className="max-w-sm px-5 py-4 align-top text-slate-600 dark:text-slate-300">
                                                    {task.instruction ||
                                                        task.description ||
                                                        '—'}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[task.statut] ?? statusClasses.annulee}`}
                                                    >
                                                        {task.statut_approbation ===
                                                        'soumise'
                                                            ? 'En approbation'
                                                            : (statusLabels[
                                                                  task.statut
                                                              ] ?? task.statut)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    {canExecute && (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCompleteTask(
                                                                        task,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
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
                                                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                                                            >
                                                                Justifier
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {visibleTasks.length === 0 && (
                            <div className="px-6 py-14 text-center text-sm text-slate-500">
                                Aucune tâche
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Proposer une action</DialogTitle>
                        <DialogDescription className="sr-only">
                            Soumettre une nouvelle action à approbation.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitProposal} className="space-y-5">
                        <label className="block text-sm font-medium">
                            Quoi faire <span className="text-red-500">*</span>
                            <input
                                required
                                autoFocus
                                value={proposalForm.data.titre}
                                onChange={(event) =>
                                    proposalForm.setData(
                                        'titre',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                            {proposalForm.errors.titre && (
                                <span className="mt-1 block text-xs text-red-600">
                                    {proposalForm.errors.titre}
                                </span>
                            )}
                        </label>
                        <label className="block text-sm font-medium">
                            Détail
                            <textarea
                                rows={2}
                                value={proposalForm.data.description}
                                onChange={(event) =>
                                    proposalForm.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </label>
                        <label className="block text-sm font-medium">
                            Pour quand <span className="text-red-500">*</span>
                            <input
                                required
                                type="date"
                                value={proposalForm.data.date_due}
                                onChange={(event) =>
                                    proposalForm.setData(
                                        'date_due',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                            {proposalForm.errors.date_due && (
                                <span className="mt-1 block text-xs text-red-600">
                                    {proposalForm.errors.date_due}
                                </span>
                            )}
                        </label>
                        <label className="block text-sm font-medium">
                            Pourquoi — obligatoire{' '}
                            <span className="text-red-500">*</span>
                            <textarea
                                required
                                rows={2}
                                value={proposalForm.data.justification}
                                onChange={(event) =>
                                    proposalForm.setData(
                                        'justification',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                            {proposalForm.errors.justification && (
                                <span className="mt-1 block text-xs text-red-600">
                                    {proposalForm.errors.justification}
                                </span>
                            )}
                        </label>
                        <label className="block text-sm font-medium">
                            Coût estimé (USD)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={proposalForm.data.cout_estime}
                                onChange={(event) =>
                                    proposalForm.setData(
                                        'cout_estime',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                            {proposalForm.errors.cout_estime && (
                                <span className="mt-1 block text-xs text-red-600">
                                    {proposalForm.errors.cout_estime}
                                </span>
                            )}
                        </label>
                        <DialogFooter className="sm:justify-start">
                            <button
                                type="submit"
                                disabled={proposalForm.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Soumettre
                            </button>
                            <button
                                type="button"
                                onClick={() => setProposalOpen(false)}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Annuler
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={completeTask !== null}
                onOpenChange={(open) => !open && setCompleteTask(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Exécuter la tâche</DialogTitle>
                        <DialogDescription>
                            {completeTask?.titre}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitComplete} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <label className="text-sm font-medium">
                                Quantité
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={completeForm.data.quantite}
                                    onChange={(event) =>
                                        completeForm.setData(
                                            'quantite',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClass}
                                />
                            </label>
                            <label className="text-sm font-medium">
                                Unité
                                <select
                                    value={completeForm.data.unite}
                                    onChange={(event) =>
                                        completeForm.setData(
                                            'unite',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">Select an option</option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.code}>
                                            {unit.nom} ({unit.code})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <label className="block text-sm font-medium">
                            Commentaire
                            <textarea
                                rows={3}
                                value={completeForm.data.commentaire}
                                onChange={(event) =>
                                    completeForm.setData(
                                        'commentaire',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </label>
                        <DialogFooter>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                <Check size={16} /> Enregistrer
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={justifyTask !== null}
                onOpenChange={(open) => !open && setJustifyTask(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Justifier la tâche</DialogTitle>
                        <DialogDescription>
                            {justifyTask?.titre}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitJustification} className="space-y-4">
                        <label className="block text-sm font-medium">
                            Motif
                            <select
                                required
                                value={justifyForm.data.motif_id}
                                onChange={(event) =>
                                    justifyForm.setData(
                                        'motif_id',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            >
                                {motifs.map((motif) => (
                                    <option key={motif.id} value={motif.id}>
                                        {motif.libelle}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {needsWorkOrder && (
                            <label className="block text-sm font-medium">
                                Ordre de travail
                                <select
                                    required
                                    value={justifyForm.data.ordre_travail_id}
                                    onChange={(event) =>
                                        justifyForm.setData(
                                            'ordre_travail_id',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">Sélectionner</option>
                                    {openWorkOrders.map((order) => (
                                        <option key={order.id} value={order.id}>
                                            {order.reference} — {order.objet}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="block text-sm font-medium">
                            Précision
                            <textarea
                                rows={3}
                                value={justifyForm.data.motif_precision}
                                onChange={(event) =>
                                    justifyForm.setData(
                                        'motif_precision',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </label>
                        <DialogFooter>
                            <button
                                type="submit"
                                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                Enregistrer la justification
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
