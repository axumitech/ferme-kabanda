import { router } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarClock,
    Check,
    CheckCircle2,
    ChevronDown,
    ClipboardCheck,
    LockKeyhole,
    Play,
    ShieldCheck,
    Wrench,
    X,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type UserOption = { id: number; name: string };
type Order = {
    id: number;
    reference: string;
    objet: string;
    statut: string;
    demandeur_id?: number | null;
    responsable_id?: number | null;
    consignation_requise: boolean;
    recurrent: boolean;
    planifie_le?: string | null;
    echeance?: string | null;
};
type Permissions = {
    canManage: boolean;
    userId?: number | null;
    canExecute: boolean;
    executedByCurrentUser: boolean;
};
type Action =
    'approve' | 'refuse' | 'plan' | 'start' | 'finish' | 'verify' | 'close';
const config: Record<
    Exclude<Action, 'refuse'>,
    { label: string; eyebrow: string; icon: typeof Check; endpoint: string }
> = {
    approve: {
        label: 'Approuver et continuer',
        eyebrow: 'Étape suivante : planification',
        icon: Check,
        endpoint: 'approve',
    },
    plan: {
        label: 'Planifier l’intervention',
        eyebrow: 'Choisir qui intervient et quand',
        icon: CalendarClock,
        endpoint: 'plan',
    },
    start: {
        label: 'Démarrer l’exécution',
        eyebrow: 'Confirmer le début des travaux',
        icon: Play,
        endpoint: 'start',
    },
    finish: {
        label: 'Terminer l’exécution',
        eyebrow: 'Documenter précisément les travaux',
        icon: Wrench,
        endpoint: 'finish',
    },
    verify: {
        label: 'Vérifier',
        eyebrow: 'Contrôler la conformité avant clôture',
        icon: ShieldCheck,
        endpoint: 'verify',
    },
    close: {
        label: 'Clôturer l’ordre',
        eyebrow: 'Dernière étape du workflow',
        icon: LockKeyhole,
        endpoint: 'close',
    },
};

export default function WorkOrderWorkflow({
    order,
    permissions,
    users,
    today,
}: {
    order: Order;
    permissions: Permissions;
    users: UserOption[];
    today: string;
}) {
    const [dialog, setDialog] = useState<Action | null>(null);
    const [processing, setProcessing] = useState(false);
    const [note, setNote] = useState('');
    const [motif, setMotif] = useState('');
    const [responsable, setResponsable] = useState('');
    const [prestataire, setPrestataire] = useState('');
    const [planifieLe, setPlanifieLe] = useState(order.planifie_le ?? today);
    const [echeance, setEcheance] = useState(order.echeance ?? '');
    const [consignation, setConsignation] = useState(false);
    const [travaux, setTravaux] = useState('');
    const [cause, setCause] = useState('');
    const [cout, setCout] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [conforme, setConforme] = useState<'1' | '0'>('1');
    const [observation, setObservation] = useState('');
    const [remettre, setRemettre] = useState(true);
    const primary = useMemo<Exclude<Action, 'refuse'> | null>(() => {
        if (order.statut === 'demande') {
            return permissions.canManage &&
                order.demandeur_id !== permissions.userId
                ? 'approve'
                : null;
        }

        if (order.statut === 'approuve') {
            return permissions.canManage ? 'plan' : null;
        }

        if (order.statut === 'planifie') {
            return permissions.canExecute ? 'start' : null;
        }

        if (order.statut === 'en_cours') {
            return permissions.canExecute ? 'finish' : null;
        }

        if (order.statut === 'realise') {
            return permissions.canManage ? 'verify' : null;
        }

        if (order.statut === 'verifie') {
            return permissions.canManage ? 'close' : null;
        }

        return null;
    }, [order, permissions]);
    const canRefuse =
        permissions.canManage && ['demande', 'approuve'].includes(order.statut);
    const submit = () => {
        if (!dialog) {
            return;
        }

        const data = new FormData();

        if (dialog === 'approve' && note) {
            data.append('note', note);
        }

        if (dialog === 'refuse') {
            data.append('motif', motif);
        }

        if (dialog === 'plan') {
            if (responsable) {
                data.append('responsable_id', responsable);
            }

            if (prestataire) {
                data.append('prestataire', prestataire);
            }

            data.append('planifie_le', planifieLe);

            if (echeance) {
                data.append('echeance', echeance);
            }
        }

        if (dialog === 'start') {
            data.append('consignation', consignation ? '1' : '0');
        }

        if (dialog === 'finish') {
            data.append('travaux_realises', travaux);

            if (cause) {
                data.append('cause_racine', cause);
            }

            if (cout) {
                data.append('cout_prestataire', cout);
            }

            if (photo) {
                data.append('photo_apres', photo);
            }
        }

        if (dialog === 'verify') {
            data.append('conforme', conforme);

            if (observation) {
                data.append('observation', observation);
            }
        }

        if (dialog === 'close') {
            data.append('remettre', remettre ? '1' : '0');
        }

        setProcessing(true);
        router.post(
            `/maintenance/orders/${order.id}/${config[dialog as Exclude<Action, 'refuse'>]?.endpoint ?? 'refuse'}`,
            data,
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => setDialog(null),
            },
        );
    };
    const invalid =
        (dialog === 'refuse' && !motif.trim()) ||
        (dialog === 'plan' &&
            (!planifieLe || (!responsable && !prestataire.trim()))) ||
        (dialog === 'start' && order.consignation_requise && !consignation) ||
        (dialog === 'finish' &&
            (!travaux.trim() || (order.recurrent && !cause.trim()))) ||
        (dialog === 'verify' && conforme === '0' && !observation.trim());

    if (!primary && !canRefuse) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                Aucune action n’est attendue de votre part à cette étape.
            </div>
        );
    }

    const current = primary ? config[primary] : null;
    const Icon = current?.icon ?? ClipboardCheck;

    return (
        <>
            <section className="overflow-visible rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-950 to-emerald-800 p-1 shadow-lg shadow-emerald-950/10">
                <div className="flex flex-col gap-4 rounded-[13px] bg-white/5 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15">
                            <Icon size={21} />
                        </span>
                        <div>
                            <p className="text-xs font-bold tracking-wider text-emerald-200 uppercase">
                                {current?.eyebrow ?? 'Gestion de la demande'}
                            </p>
                            <p className="mt-1 text-sm text-white/75">
                                Une action à la fois, dans l’ordre du processus.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {primary && (
                            <button
                                type="button"
                                onClick={() => setDialog(primary)}
                                className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <Icon size={17} />
                                {current?.label}
                                <ArrowRight
                                    size={16}
                                    className="transition group-hover:translate-x-0.5"
                                />
                            </button>
                        )}
                        {canRefuse && (
                            <details className="group relative">
                                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
                                    More actions
                                    <ChevronDown
                                        size={15}
                                        className="transition group-open:rotate-180"
                                    />
                                </summary>
                                <div className="absolute right-0 z-30 mt-2 min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setDialog('refuse')}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                                    >
                                        <XCircle size={16} />
                                        Refuser l’ordre
                                    </button>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </section>
            {dialog && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                >
                    <section className="my-6 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                                    {order.reference}
                                </p>
                                <h2 className="mt-1 text-xl font-bold">
                                    {dialog === 'refuse'
                                        ? 'Refuser l’ordre'
                                        : config[dialog].label}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {order.objet}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDialog(null)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X size={19} />
                            </button>
                        </header>
                        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
                            {dialog === 'approve' && (
                                <Field
                                    label="Note d’approbation"
                                    help="Facultative"
                                >
                                    <textarea
                                        rows={3}
                                        value={note}
                                        onChange={(e) =>
                                            setNote(e.target.value)
                                        }
                                        className="control"
                                        placeholder="Conditions ou précision…"
                                    />
                                </Field>
                            )}
                            {dialog === 'refuse' && (
                                <Field label="Motif du refus" required>
                                    <textarea
                                        autoFocus
                                        rows={4}
                                        value={motif}
                                        onChange={(e) =>
                                            setMotif(e.target.value)
                                        }
                                        className="control"
                                        placeholder="Expliquez précisément le refus…"
                                    />
                                </Field>
                            )}
                            {dialog === 'plan' && (
                                <>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Field label="Responsable interne">
                                            <select
                                                value={responsable}
                                                onChange={(e) =>
                                                    setResponsable(
                                                        e.target.value,
                                                    )
                                                }
                                                className="control"
                                            >
                                                <option value="">
                                                    Select an option
                                                </option>
                                                {users.map((user) => (
                                                    <option
                                                        key={user.id}
                                                        value={user.id}
                                                    >
                                                        {user.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Ou prestataire externe">
                                            <input
                                                value={prestataire}
                                                onChange={(e) =>
                                                    setPrestataire(
                                                        e.target.value,
                                                    )
                                                }
                                                className="control"
                                                placeholder="Entreprise ou technicien"
                                            />
                                        </Field>
                                        <Field
                                            label="Date d’intervention"
                                            required
                                        >
                                            <input
                                                type="date"
                                                min={today}
                                                value={planifieLe}
                                                onChange={(e) =>
                                                    setPlanifieLe(
                                                        e.target.value,
                                                    )
                                                }
                                                className="control"
                                            />
                                        </Field>
                                        <Field label="Échéance impérative">
                                            <input
                                                type="date"
                                                min={planifieLe || today}
                                                value={echeance}
                                                onChange={(e) =>
                                                    setEcheance(e.target.value)
                                                }
                                                className="control"
                                            />
                                        </Field>
                                    </div>
                                    <Info>
                                        Choisissez un responsable interne ou un
                                        prestataire. Une tâche datée sera créée
                                        pour le responsable interne.
                                    </Info>
                                </>
                            )}
                            {dialog === 'start' &&
                                (order.consignation_requise ? (
                                    <CheckRow
                                        checked={consignation}
                                        set={setConsignation}
                                        title="Consignation effectuée"
                                        text="Je confirme la mise hors énergie, l’absence de pression et la sécurisation des pièces en mouvement."
                                        danger
                                    />
                                ) : (
                                    <Info>
                                        Aucune consignation n’est requise. Le
                                        démarrage enregistrera immédiatement le
                                        début réel.
                                    </Info>
                                ))}
                            {dialog === 'finish' && (
                                <>
                                    <Field
                                        label="Travaux réalisés"
                                        required
                                        help="Décrivez ce qui a réellement été réparé, réglé ou remplacé."
                                    >
                                        <textarea
                                            rows={4}
                                            value={travaux}
                                            onChange={(e) =>
                                                setTravaux(e.target.value)
                                            }
                                            className="control"
                                        />
                                    </Field>
                                    <Field
                                        label="Cause racine"
                                        required={order.recurrent}
                                        help={
                                            order.recurrent
                                                ? 'Obligatoire pour cette panne récurrente.'
                                                : 'Pourquoi la panne est arrivée.'
                                        }
                                    >
                                        <textarea
                                            rows={3}
                                            value={cause}
                                            onChange={(e) =>
                                                setCause(e.target.value)
                                            }
                                            className="control"
                                        />
                                    </Field>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <Field label="Coût prestataire (USD)">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={cout}
                                                onChange={(e) =>
                                                    setCout(e.target.value)
                                                }
                                                className="control"
                                            />
                                        </Field>
                                        <Field label="Photo après intervention">
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) =>
                                                    setPhoto(
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                                className="control"
                                            />
                                        </Field>
                                    </div>
                                </>
                            )}
                            {dialog === 'verify' && (
                                <>
                                    <Field
                                        label="Le travail est-il conforme ?"
                                        required
                                    >
                                        <select
                                            value={conforme}
                                            onChange={(e) =>
                                                setConforme(
                                                    e.target.value as '1' | '0',
                                                )
                                            }
                                            className="control"
                                        >
                                            <option value="1">
                                                Conforme — bon pour clôture
                                            </option>
                                            <option value="0">
                                                Non conforme — à reprendre
                                            </option>
                                        </select>
                                    </Field>
                                    <Field
                                        label="Observation"
                                        required={conforme === '0'}
                                    >
                                        <textarea
                                            rows={3}
                                            value={observation}
                                            onChange={(e) =>
                                                setObservation(e.target.value)
                                            }
                                            className="control"
                                            placeholder={
                                                conforme === '0'
                                                    ? 'Précisez ce qui doit être repris…'
                                                    : 'Observation facultative…'
                                            }
                                        />
                                    </Field>
                                </>
                            )}
                            {dialog === 'close' && (
                                <>
                                    <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                                        La clôture termine définitivement le
                                        workflow de cet ordre.
                                    </div>
                                    <CheckRow
                                        checked={remettre}
                                        set={setRemettre}
                                        title="Remettre l’actif en service"
                                        text="L’équipement redevient disponible ou l’infrastructure repasse en bon état."
                                    />
                                </>
                            )}
                        </div>
                        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
                            <button
                                type="button"
                                onClick={() => setDialog(null)}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={processing || invalid}
                                onClick={submit}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45 ${dialog === 'refuse' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                                {processing
                                    ? 'Traitement…'
                                    : dialog === 'refuse'
                                      ? 'Confirmer le refus'
                                      : dialog === 'verify'
                                        ? 'Submit'
                                      : config[dialog].label}
                                <CheckCircle2 size={16} />
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
function Field({
    label,
    required,
    help,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                    {help}
                </span>
            )}
        </label>
    );
}
function Info({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            {children}
        </div>
    );
}
function CheckRow({
    checked,
    set,
    title,
    text,
    danger = false,
}: {
    checked: boolean;
    set: (checked: boolean) => void;
    title: string;
    text: string;
    danger?: boolean;
}) {
    return (
        <label
            className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => set(e.target.checked)}
                className="mt-1 size-4 accent-emerald-600"
            />
            <span>
                <span className="block text-sm font-bold">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {text}
                </span>
            </span>
        </label>
    );
}
