import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Check, FileCheck2, Rocket, X } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ImportLine = {
    id: number;
    numero_ligne: number;
    cle: string;
    difference: string;
    current_values?: Record<string, unknown> | null;
    imported_values?: Record<string, unknown> | null;
    changed_fields?: string[] | null;
    error?: string | null;
    accepted: boolean | null;
    comment?: string | null;
};
type PlanImport = {
    id: number;
    created_at: string;
    code_plan: string;
    fichier: string;
    statut: string;
    lignes_lues: number;
    lignes_ajout: number;
    lignes_modif: number;
    lignes_suppr: number;
    lignes_identiques: number;
    lignes_erreur: number;
    pending_count: number;
    lines: ImportLine[];
};
const differenceLabels: Record<string, string> = {
    ajout: 'AJOUT',
    modification: 'MODIFICATION',
    suppression: 'SUPPRESSION',
    identique: 'Identique',
    erreur: 'ERREUR',
};

export default function PlanImportShow({
    import: planImport,
    canApply,
}: {
    import: PlanImport;
    canApply: boolean;
}) {
    const [rejecting, setRejecting] = useState<ImportLine | null>(null);
    const [applying, setApplying] = useState(false);
    const decision = useForm({ accepted: true, comment: '' });
    const application = useForm({ note: '' });
    const decide = (line: ImportLine, accepted: boolean) => {
        decision.transform(() => ({
            accepted,
            comment: accepted ? '' : decision.data.comment,
        }));
        decision.post(
            `/imports-plans/${planImport.id}/lignes/${line.id}/decision`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejecting(null);
                    decision.reset();
                },
            },
        );
    };

    return (
        <>
            <Head title={`Import ${planImport.code_plan}`} />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <Link
                        href="/imports-plans"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Imports de plan
                    </Link>
                    <header className="flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <FileCheck2 size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.16em] text-emerald-200 uppercase">
                                    Analyse du plan
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    {planImport.code_plan}
                                </h1>
                                <p className="mt-2 text-sm text-slate-300">
                                    {planImport.fichier} ·{' '}
                                    {planImport.lignes_lues} ligne(s)
                                </p>
                            </div>
                        </div>
                        {planImport.statut === 'analyse' && canApply && (
                            <button
                                type="button"
                                onClick={() => setApplying(true)}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-500"
                            >
                                <Rocket size={17} /> Appliquer — version n+1
                            </button>
                        )}
                    </header>
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                        <Stat
                            label="À trancher"
                            value={planImport.pending_count}
                            tone="amber"
                        />
                        <Stat
                            label="Ajouts"
                            value={planImport.lignes_ajout}
                            tone="emerald"
                        />
                        <Stat
                            label="Modifications"
                            value={planImport.lignes_modif}
                            tone="amber"
                        />
                        <Stat
                            label="Suppressions"
                            value={planImport.lignes_suppr}
                            tone="red"
                        />
                        <Stat
                            label="Identiques"
                            value={planImport.lignes_identiques}
                            tone="slate"
                        />
                        <Stat
                            label="Erreurs"
                            value={planImport.lignes_erreur}
                            tone="red"
                        />
                    </section>
                    {planImport.statut === 'analyse' &&
                        planImport.pending_count > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                                <b>Application impossible :</b> chaque ajout,
                                modification, suppression ou erreur doit être
                                tranché avant la création de la nouvelle
                                version.
                            </div>
                        )}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <h2 className="font-bold">
                                Différences — à trancher une par une
                            </h2>
                        </header>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">N°</th>
                                        <th className="px-4 py-3">
                                            Clé / tâche
                                        </th>
                                        <th className="px-4 py-3">Écart</th>
                                        <th className="px-4 py-3">Détail</th>
                                        <th className="px-4 py-3">Décision</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {planImport.lines.map((line) => {
                                        const actionable =
                                            planImport.statut === 'analyse' &&
                                            [
                                                'ajout',
                                                'modification',
                                                'suppression',
                                            ].includes(line.difference);

                                        return (
                                            <tr
                                                key={line.id}
                                                className="align-top"
                                            >
                                                <td className="px-5 py-4 font-mono text-xs">
                                                    {line.numero_ligne || '—'}
                                                </td>
                                                <td className="max-w-sm px-4 py-4">
                                                    <b>
                                                        {String(
                                                            line.imported_values
                                                                ?.tache ??
                                                                line
                                                                    .current_values
                                                                    ?.tache ??
                                                                line.cle,
                                                        )}
                                                    </b>
                                                    <span className="mt-1 block truncate text-xs text-slate-500">
                                                        {line.cle}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <DifferenceBadge
                                                        difference={
                                                            line.difference
                                                        }
                                                    />
                                                </td>
                                                <td className="max-w-md px-4 py-4 text-xs leading-5 text-slate-600">
                                                    {line.error ??
                                                        (line.changed_fields
                                                            ?.length
                                                            ? `Champs modifiés : ${line.changed_fields.join(', ')}`
                                                            : '—')}
                                                    {line.comment && (
                                                        <span className="mt-1 block italic">
                                                            Commentaire :{' '}
                                                            {line.comment}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <DecisionBadge
                                                        value={line.accepted}
                                                    />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        {actionable && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        decision.processing
                                                                    }
                                                                    onClick={() =>
                                                                        decide(
                                                                            line,
                                                                            true,
                                                                        )
                                                                    }
                                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                                                                >
                                                                    <Check
                                                                        size={
                                                                            14
                                                                        }
                                                                    />{' '}
                                                                    Accepter
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        decision.reset();
                                                                        setRejecting(
                                                                            line,
                                                                        );
                                                                    }}
                                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                                                                >
                                                                    <X
                                                                        size={
                                                                            14
                                                                        }
                                                                    />{' '}
                                                                    Refuser
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>

            <Dialog
                open={rejecting !== null}
                onOpenChange={(open) => !open && setRejecting(null)}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Refuser cet écart</DialogTitle>
                        <DialogDescription>
                            L'existant sera conservé. Ajoutez un commentaire
                            pour documenter la décision.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (rejecting) {
                                decide(rejecting, false);
                            }
                        }}
                        className="space-y-5"
                    >
                        <label className="block text-sm font-semibold text-slate-700">
                            Commentaire
                            <textarea
                                rows={4}
                                value={decision.data.comment}
                                onChange={(event) =>
                                    decision.setData(
                                        'comment',
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                            />
                        </label>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setRejecting(null)}
                                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={decision.processing}
                                className="min-h-10 rounded-lg bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700"
                            >
                                Refuser
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={applying} onOpenChange={setApplying}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Appliquer — version n+1 en vigueur
                        </DialogTitle>
                        <DialogDescription>
                            L'ancienne version sera archivée. L'application est
                            refusée tant qu'un écart n'est pas tranché.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            application.post(
                                `/imports-plans/${planImport.id}/appliquer`,
                                { onSuccess: () => setApplying(false) },
                            );
                        }}
                        className="space-y-5"
                    >
                        <label className="block text-sm font-semibold text-slate-700">
                            Note de version
                            <input
                                value={application.data.note}
                                onChange={(event) =>
                                    application.setData(
                                        'note',
                                        event.target.value,
                                    )
                                }
                                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-700"
                            />
                        </label>
                        {Object.values(application.errors)[0] && (
                            <p className="text-sm font-semibold text-red-600">
                                {Object.values(application.errors)[0]}
                            </p>
                        )}
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setApplying(false)}
                                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={
                                    application.processing ||
                                    planImport.pending_count > 0
                                }
                                className="min-h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Appliquer
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'amber' | 'emerald' | 'red' | 'slate';
}) {
    const colors = {
        amber: 'border-amber-200 bg-amber-50 text-amber-900',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        red: 'border-red-200 bg-red-50 text-red-900',
        slate: 'border-slate-200 bg-white text-slate-900',
    };

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${colors[tone]}`}>
            <p className="text-xs font-bold tracking-wide uppercase opacity-70">
                {label}
            </p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
    );
}
function DifferenceBadge({ difference }: { difference: string }) {
    const colors: Record<string, string> = {
        ajout: 'bg-emerald-100 text-emerald-800',
        modification: 'bg-amber-100 text-amber-800',
        suppression: 'bg-red-100 text-red-800',
        erreur: 'bg-red-100 text-red-800',
        identique: 'bg-slate-100 text-slate-700',
    };

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors[difference] ?? colors.identique}`}
        >
            {differenceLabels[difference] ?? difference}
        </span>
    );
}
function DecisionBadge({ value }: { value: boolean | null }) {
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${value === null ? 'bg-amber-100 text-amber-800' : value ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
        >
            {value === null ? 'À trancher' : value ? 'Acceptée' : 'Refusée'}
        </span>
    );
}
