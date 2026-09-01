import { Head, Link } from '@inertiajs/react';
import { Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { TaskActionDialogs } from '@/components/task-action-dialogs';
import type {
    ActionMotif,
    ActionUnit,
    ActionWorkOrder,
} from '@/components/task-action-dialogs';

type Task = {
    id: number;
    reference: string;
    source: string;
    titre: string;
    description?: string | null;
    instruction?: string | null;
    lieu?: string | null;
    date_due: string;
    heure_due?: string | null;
    statut: string;
    statut_approbation?: string | null;
    quantite?: string | null;
    unite?: string | null;
    photo_chemin?: string | null;
    motif_precision?: string | null;
    dde_reference?: string | null;
    dde_statut?: string | null;
    departement?: { code: string; nom: string } | null;
    site?: { code: string; nom: string } | null;
    responsable?: { id: number; name: string } | null;
    plantation?: { reference: string; culture?: { nom: string } | null } | null;
    motif?: ActionMotif | null;
    intervenants: Array<{
        id: number;
        role: string;
        user?: { id: number; name: string } | null;
    }>;
    evenements: Array<{
        id: number;
        resume: string;
        user_nom: string;
        created_at: string;
    }>;
};
type Props = {
    task: Task;
    canAct: boolean;
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
const approvalLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    soumise: 'À approuver',
    approuvee: 'Approuvée',
    refusee: 'Refusée',
};
const sourceLabels: Record<string, string> = {
    calendrier_cultural: 'Calendrier cultural',
    entretien: 'Plan d’entretien',
    epi: 'Renouvellement EPI',
    inventaire: 'Seuil de magasin',
    requisition: 'Réquisition',
    maternite: 'Maternité',
    dar: 'Délai avant récolte',
    smp: 'Plan de sécurité',
    incident: 'Incident',
    enquete: 'Enquête',
    manuelle: 'Créée à la main',
};

export default function TaskShow({
    task,
    canAct,
    motifs,
    openWorkOrders,
    units,
}: Props) {
    const [completeOpen, setCompleteOpen] = useState(false);
    const [justifyOpen, setJustifyOpen] = useState(false);
    const isOpen = task.statut === 'a_faire';
    const executable =
        canAct &&
        isOpen &&
        (!task.statut_approbation || task.statut_approbation === 'approuvee');

    return (
        <>
            <Head title={task.titre} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/registre-ferme"
                            className="hover:text-emerald-600"
                        >
                            Tâches
                        </Link>
                        <span className="mx-2">›</span>
                        {task.titre}
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {task.titre}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            {executable && (
                                <button
                                    type="button"
                                    onClick={() => setCompleteOpen(true)}
                                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Exécuter
                                </button>
                            )}
                            {canAct && isOpen && (
                                <button
                                    type="button"
                                    onClick={() => setJustifyOpen(true)}
                                    className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Justifier la non-exécution
                                </button>
                            )}
                            <Link
                                href={`/registre-ferme/${task.id}/edit`}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900"
                            >
                                Modifier
                            </Link>
                        </div>
                    </header>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-xl font-semibold">
                                {task.titre}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {task.reference} ·{' '}
                                {sourceLabels[task.source] ?? task.source}
                            </p>
                            {task.description && (
                                <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
                                    {task.description}
                                </p>
                            )}
                            {task.instruction && (
                                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-500/10">
                                    <h3 className="flex items-center gap-2 font-semibold">
                                        <Lightbulb
                                            size={18}
                                            className="text-amber-600"
                                        />
                                        Instruction
                                    </h3>
                                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                                        {task.instruction}
                                    </p>
                                </div>
                            )}
                            <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">
                                <Info
                                    label="Échéance"
                                    value={`${new Intl.DateTimeFormat('fr-FR').format(new Date(`${task.date_due.slice(0, 10)}T00:00:00`))}${task.heure_due ? ` ${task.heure_due.slice(0, 5)}` : ''}`}
                                />
                                <Info
                                    label="Lieu"
                                    value={`${task.lieu ?? '—'}${task.plantation ? ` · ${task.plantation.reference} (${task.plantation.culture?.nom ?? ''})` : ''}`}
                                />
                                <Info
                                    label="Statut"
                                    value={
                                        statusLabels[task.statut] ?? task.statut
                                    }
                                    badge
                                />
                                <Info
                                    label="Approbation"
                                    value={
                                        approvalLabels[
                                            task.statut_approbation ?? ''
                                        ] ??
                                        task.statut_approbation ??
                                        'Approuvée'
                                    }
                                    badge
                                />
                                {task.motif && (
                                    <div className="col-span-2">
                                        <dt className="text-slate-500">
                                            Motif de non-exécution
                                        </dt>
                                        <dd className="mt-1 font-medium">
                                            {task.motif.libelle}
                                            {task.motif_precision
                                                ? ` — ${task.motif_precision}`
                                                : ''}
                                        </dd>
                                    </div>
                                )}
                                {task.dde_reference && (
                                    <div className="col-span-2">
                                        <dt className="text-slate-500">
                                            Suite disciplinaire
                                        </dt>
                                        <dd className="mt-1 font-medium text-red-600">
                                            {task.dde_reference} (
                                            {task.dde_statut})
                                        </dd>
                                    </div>
                                )}
                                {task.quantite && (
                                    <Info
                                        label="Quantité réalisée"
                                        value={`${task.quantite} ${task.unite ?? ''}`}
                                    />
                                )}
                                <Info
                                    label="Département"
                                    value={task.departement?.nom ?? '—'}
                                />
                                <Info
                                    label="Site"
                                    value={task.site?.nom ?? '—'}
                                />
                            </dl>
                            {task.photo_chemin && (
                                <img
                                    src={`/storage/${task.photo_chemin}`}
                                    className="mt-6 max-h-64 rounded-lg"
                                    alt="Preuve"
                                />
                            )}
                        </section>

                        <aside className="space-y-6">
                            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="font-semibold">Intervenants</h2>
                                <ul className="mt-4 space-y-3 text-sm">
                                    {task.intervenants.length > 0 ? (
                                        task.intervenants.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex items-center justify-between gap-2"
                                            >
                                                <span className="font-medium">
                                                    {item.user?.name ?? '—'}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
                                                    {{
                                                        responsable:
                                                            'Responsable',
                                                        appui: 'Appui',
                                                        informe: 'Informé',
                                                    }[item.role] ?? item.role}
                                                </span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="flex items-center justify-between">
                                            <span>
                                                {task.responsable?.name ?? '—'}
                                            </span>
                                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                                                Responsable
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </section>
                            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <h2 className="font-semibold">Historique</h2>
                                <ol className="mt-4 space-y-4 text-xs">
                                    {task.evenements.map((event) => (
                                        <li key={event.id}>
                                            <div className="font-medium">
                                                {event.resume}
                                            </div>
                                            <div className="mt-1 text-slate-500">
                                                {event.user_nom} ·{' '}
                                                {new Intl.DateTimeFormat(
                                                    'fr-FR',
                                                    {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short',
                                                    },
                                                ).format(
                                                    new Date(event.created_at),
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </aside>
                    </div>
                </div>
            </main>
            <TaskActionDialogs
                completeTask={completeOpen ? task : null}
                justifyTask={justifyOpen ? task : null}
                motifs={motifs}
                openWorkOrders={openWorkOrders}
                units={units}
                onCloseComplete={() => setCompleteOpen(false)}
                onCloseJustify={() => setJustifyOpen(false)}
            />
        </>
    );
}

function Info({
    label,
    value,
    badge,
}: {
    label: string;
    value: string;
    badge?: boolean;
}) {
    return (
        <div>
            <dt className="text-slate-500">{label}</dt>
            <dd
                className={`mt-1 font-medium ${badge ? 'inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}
