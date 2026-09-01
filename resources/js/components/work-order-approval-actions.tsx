import { router } from '@inertiajs/react';
import { Check, ChevronDown, X, XCircle } from 'lucide-react';
import { useState } from 'react';

type Order = { id: number; reference: string; objet: string };

export default function WorkOrderApprovalActions({
    order,
    canApprove,
    canRefuse,
    compact = false,
}: {
    order: Order;
    canApprove: boolean;
    canRefuse: boolean;
    compact?: boolean;
}) {
    const [dialog, setDialog] = useState<'approve' | 'refuse' | null>(null);
    const [note, setNote] = useState('');
    const [motif, setMotif] = useState('');
    const [processing, setProcessing] = useState(false);

    const submit = () => {
        if (!dialog || (dialog === 'refuse' && !motif.trim())) {
            return;
        }

        setProcessing(true);
        router.post(
            `/maintenance/orders/${order.id}/${dialog}`,
            dialog === 'approve' ? { note } : { motif },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setDialog(null);
                    setNote('');
                    setMotif('');
                },
            },
        );
    };

    return (
        <>
            <div
                className={`flex items-center ${compact ? 'gap-1' : 'flex-wrap gap-3'}`}
            >
                {canApprove && (
                    <button
                        type="button"
                        onClick={() => setDialog('approve')}
                        className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition ${compact ? 'bg-white px-3 py-2 text-xs text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-400' : 'bg-emerald-600 px-4 py-2.5 text-sm text-white shadow-sm hover:bg-emerald-700'}`}
                    >
                        <Check size={compact ? 14 : 16} />
                        Approuver
                    </button>
                )}
                {canRefuse && (
                    <details className="group relative">
                        <summary
                            className={`flex cursor-pointer list-none items-center gap-1.5 rounded-lg font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 ${compact ? 'px-3 py-2 text-xs' : 'border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'}`}
                        >
                            More actions
                            <ChevronDown
                                size={14}
                                className="transition group-open:rotate-180"
                            />
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                            <button
                                type="button"
                                onClick={() => setDialog('refuse')}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                                <XCircle size={15} />
                                Refuser
                            </button>
                        </div>
                    </details>
                )}
            </div>
            {dialog && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
                    role="dialog"
                    aria-modal="true"
                >
                    <section className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900">
                        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold">
                                    {dialog === 'approve'
                                        ? 'Approuver la demande'
                                        : 'Refuser la demande'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {order.reference} — {order.objet}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDialog(null)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={18} />
                                <span className="sr-only">Fermer</span>
                            </button>
                        </header>
                        <div className="p-5">
                            {dialog === 'approve' ? (
                                <label className="block">
                                    <span className="text-sm font-medium">
                                        Note d’approbation{' '}
                                        <span className="font-normal text-slate-500">
                                            (facultative)
                                        </span>
                                    </span>
                                    <textarea
                                        rows={3}
                                        value={note}
                                        onChange={(e) =>
                                            setNote(e.target.value)
                                        }
                                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        placeholder="Précision ou condition éventuelle…"
                                    />
                                </label>
                            ) : (
                                <label className="block">
                                    <span className="text-sm font-medium">
                                        Motif du refus
                                        <span className="text-red-600">*</span>
                                    </span>
                                    <textarea
                                        required
                                        autoFocus
                                        rows={4}
                                        value={motif}
                                        onChange={(e) =>
                                            setMotif(e.target.value)
                                        }
                                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                        placeholder="Expliquez pourquoi cet ordre est refusé…"
                                    />
                                </label>
                            )}
                        </div>
                        <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setDialog(null)}
                                className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={
                                    processing ||
                                    (dialog === 'refuse' && !motif.trim())
                                }
                                onClick={submit}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${dialog === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {processing
                                    ? 'Traitement…'
                                    : dialog === 'approve'
                                      ? 'Confirmer l’approbation'
                                      : 'Confirmer le refus'}
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
