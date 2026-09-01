import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, Flag, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Patrol = {
    id: number;
    reference: string;
    date: string;
    tour: string;
    agent_nom: string;
    site?: { code: string; nom: string } | null;
    debut: string;
    fin?: string | null;
    points_prevus: number;
    points_faits: number;
    couverture: number;
    ras: boolean;
    statut: string;
};

const statusLabels: Record<string, string> = {
    en_cours: 'En cours',
    terminee: 'Terminée',
    incomplete: 'Incomplète',
};

export default function PatrolsIndex({ patrols }: { patrols: Patrol[] }) {
    const [closing, setClosing] = useState<Patrol | null>(null);
    const closeForm = useForm({ observations: '' });

    return (
        <>
            <Head title="Patrouilles" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                                Sécurité &amp; QHSE
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                Patrouilles
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Rondes de sécurité, couverture des postes et
                                anomalies constatées.
                            </p>
                        </div>
                        <Link
                            href="/patrouilles/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                            <Plus size={18} /> Ouvrir une patrouille
                        </Link>
                    </header>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Référence</th>
                                        <th className="px-4 py-3">
                                            Date / tour
                                        </th>
                                        <th className="px-4 py-3">Agent</th>
                                        <th className="px-4 py-3">Site</th>
                                        <th className="px-4 py-3">Horaire</th>
                                        <th className="px-4 py-3">
                                            Points couverts
                                        </th>
                                        <th className="px-4 py-3">Constat</th>
                                        <th className="px-4 py-3">Statut</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {patrols.map((patrol) => (
                                        <tr
                                            key={patrol.id}
                                            className="hover:bg-slate-50/80"
                                        >
                                            <td className="px-5 py-4 font-bold">
                                                {patrol.reference}
                                            </td>
                                            <td className="px-4 py-4">
                                                <b>{formatDate(patrol.date)}</b>
                                                <span className="mt-1 block text-xs text-slate-500">
                                                    {patrol.tour === 'nuit'
                                                        ? 'Tour de nuit'
                                                        : 'Tour de jour'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {patrol.agent_nom}
                                            </td>
                                            <td className="px-4 py-4">
                                                {patrol.site
                                                    ? `${patrol.site.code} — ${patrol.site.nom}`
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600">
                                                {formatTime(patrol.debut)} →{' '}
                                                {patrol.fin
                                                    ? formatTime(patrol.fin)
                                                    : 'en cours'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${patrol.couverture >= 100 ? 'bg-emerald-100 text-emerald-800' : patrol.couverture >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}
                                                >
                                                    {patrol.points_faits} /{' '}
                                                    {patrol.points_prevus} (
                                                    {patrol.couverture} %)
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${patrol.ras ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                                                >
                                                    {patrol.ras
                                                        ? 'RAS'
                                                        : 'ANOMALIE'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                    {statusLabels[
                                                        patrol.statut
                                                    ] ?? patrol.statut}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/patrouilles/${patrol.id}`}
                                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Eye size={14} />{' '}
                                                        Pointages
                                                    </Link>
                                                    {patrol.statut ===
                                                        'en_cours' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                closeForm.reset();
                                                                setClosing(
                                                                    patrol,
                                                                );
                                                            }}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                                                        >
                                                            <Flag size={14} />{' '}
                                                            Clôturer
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {patrols.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <ShieldCheck
                                                    className="mx-auto mb-3 text-slate-300"
                                                    size={38}
                                                />
                                                Aucune patrouille enregistrée.
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
                open={closing !== null}
                onOpenChange={(open) => !open && setClosing(null)}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Clôturer</DialogTitle>
                        <DialogDescription>
                            {closing?.reference} — confirmez la fin de la ronde.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (closing) {
                                closeForm.post(
                                    `/patrouilles/${closing.id}/cloturer`,
                                    { onSuccess: () => setClosing(null) },
                                );
                            }
                        }}
                        className="space-y-5"
                    >
                        <label className="block text-sm font-semibold text-slate-700">
                            Observations de fin de tour
                            <textarea
                                rows={4}
                                value={closeForm.data.observations}
                                onChange={(event) =>
                                    closeForm.setData(
                                        'observations',
                                        event.target.value,
                                    )
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                            />
                        </label>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setClosing(null)}
                                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={closeForm.processing}
                                className="min-h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                Clôturer
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('fr-FR').format(
        new Date(`${value}T00:00:00`),
    );
}
function formatTime(value: string) {
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
