import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type ActionTask = { id: number; reference: string; titre: string };
export type ActionMotif = {
    id: number;
    code: string;
    libelle: string;
    recevable: boolean;
};
export type ActionWorkOrder = { id: number; reference: string; objet: string };
export type ActionUnit = { id: number; code: string; nom: string };

const fieldClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export function TaskActionDialogs({
    completeTask,
    justifyTask,
    motifs,
    openWorkOrders,
    units,
    onCloseComplete,
    onCloseJustify,
}: {
    completeTask: ActionTask | null;
    justifyTask: ActionTask | null;
    motifs: ActionMotif[];
    openWorkOrders: ActionWorkOrder[];
    units: ActionUnit[];
    onCloseComplete: () => void;
    onCloseJustify: () => void;
}) {
    const completeForm = useForm<{
        quantite: string;
        unite: string;
        commentaire: string;
        photo: File | null;
    }>({ quantite: '', unite: '', commentaire: '', photo: null });
    const justifyForm = useForm({
        motif_id: motifs[0] ? String(motifs[0].id) : '',
        ordre_travail_id: '',
        precision: '',
    });
    const selectedMotif = motifs.find(
        (motif) => String(motif.id) === justifyForm.data.motif_id,
    );
    const needsWorkOrder = selectedMotif?.code.trim().toUpperCase() === 'PANNE';

    const submitComplete = (event: FormEvent) => {
        event.preventDefault();

        if (!completeTask) {
            return;
        }

        completeForm.post(`/registre-ferme/${completeTask.id}/complete`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                completeForm.reset();
                onCloseComplete();
            },
        });
    };

    const submitJustify = (event: FormEvent) => {
        event.preventDefault();

        if (!justifyTask) {
            return;
        }

        justifyForm.post(`/registre-ferme/${justifyTask.id}/justify`, {
            preserveScroll: true,
            onSuccess: () => {
                justifyForm.reset('ordre_travail_id', 'precision');
                onCloseJustify();
            },
        });
    };

    return (
        <>
            <Dialog
                open={completeTask !== null}
                onOpenChange={(open) => !open && onCloseComplete()}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Exécuter</DialogTitle>
                        <DialogDescription>
                            {completeTask?.reference} · {completeTask?.titre}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitComplete} className="space-y-5">
                        <label className="block text-sm font-medium">
                            Quantité réalisée
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
                        <label className="block text-sm font-medium">
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
                        <label className="block text-sm font-medium">
                            Commentaire
                            <textarea
                                rows={2}
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
                        <label className="block text-sm font-medium">
                            Photo (preuve)
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                    completeForm.setData(
                                        'photo',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className={fieldClass}
                            />
                        </label>
                        <DialogFooter className="sm:justify-start">
                            <button
                                type="submit"
                                disabled={completeForm.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={onCloseComplete}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Cancel
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={justifyTask !== null}
                onOpenChange={(open) => !open && onCloseJustify()}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Justifier la non-exécution</DialogTitle>
                        <DialogDescription>
                            {justifyTask?.reference} · {justifyTask?.titre}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitJustify} className="space-y-5">
                        <label className="block text-sm font-medium">
                            Motif <span className="text-red-500">*</span>
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
                                <option value="">Select an option</option>
                                {motifs.map((motif) => (
                                    <option key={motif.id} value={motif.id}>
                                        {motif.recevable
                                            ? ''
                                            : '⚠ NON RECEVABLE — '}
                                        {motif.libelle}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {needsWorkOrder && (
                            <label className="block text-sm font-medium">
                                Ordre de travail
                                <select
                                    value={justifyForm.data.ordre_travail_id}
                                    onChange={(event) =>
                                        justifyForm.setData(
                                            'ordre_travail_id',
                                            event.target.value,
                                        )
                                    }
                                    className={fieldClass}
                                >
                                    <option value="">Select an option</option>
                                    {openWorkOrders.map((order) => (
                                        <option key={order.id} value={order.id}>
                                            {order.reference} — {order.objet}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="block text-sm font-medium">
                            Preuve du motif
                            <input
                                value={justifyForm.data.precision}
                                onChange={(event) =>
                                    justifyForm.setData(
                                        'precision',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                            <span className="mt-1 block text-xs text-slate-500">
                                Selon le motif : n° de bon de travail, code
                                article, nom du donneur de consigne ou référence
                                incident.
                            </span>
                        </label>
                        <DialogFooter className="sm:justify-start">
                            <button
                                type="submit"
                                disabled={justifyForm.processing}
                                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={onCloseJustify}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Cancel
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
