import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    Flag,
    MapPin,
    Moon,
    ShieldCheck,
    Sun,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Passage = {
    id: number;
    passe_le: string;
    etat: string;
    constat?: string | null;
    photo_url?: string | null;
    poste?: { code: string; nom: string } | null;
};
type Patrol = {
    id: number;
    reference: string;
    date: string;
    tour: string;
    agent_nom: string;
    equipe?: string | null;
    site?: { code: string; nom: string } | null;
    debut: string;
    fin?: string | null;
    points_prevus: number;
    points_faits: number;
    couverture: number;
    ras: boolean;
    observations?: string | null;
    statut: string;
    passages: Passage[];
};
type Post = { id: number; code: string; nom: string };
const control =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15';

export default function PatrolShow({
    patrol,
    posts,
}: {
    patrol: Patrol;
    posts: Post[];
}) {
    const [pointing, setPointing] = useState(false);
    const [closing, setClosing] = useState(false);
    const pointForm = useForm<{
        poste_controle_id: string;
        etat: string;
        constat: string;
        photo: File | null;
    }>({ poste_controle_id: '', etat: 'conforme', constat: '', photo: null });
    const closeForm = useForm({ observations: patrol.observations ?? '' });
    const open = patrol.statut === 'en_cours';

    return (
        <>
            <Head title={patrol.reference} />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <Link
                        href="/patrouilles"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Patrouilles
                    </Link>
                    <header className="flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <ShieldCheck size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.16em] text-emerald-200 uppercase">
                                    Patrouille
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    {patrol.reference}
                                </h1>
                                <p className="mt-2 text-sm text-slate-300">
                                    {patrol.agent_nom} ·{' '}
                                    {patrol.site
                                        ? `${patrol.site.code} — ${patrol.site.nom}`
                                        : 'Tous sites'}
                                </p>
                            </div>
                        </div>
                        {open && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPointing(true)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-emerald-900 hover:bg-emerald-50"
                                >
                                    <MapPin size={17} /> Pointer un poste
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setClosing(true)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-500"
                                >
                                    <Flag size={17} /> Clôturer
                                </button>
                            </div>
                        )}
                    </header>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Stat
                            label="Date / tour"
                            value={`${formatDate(patrol.date)} · ${patrol.tour === 'nuit' ? 'Nuit' : 'Jour'}`}
                            icon={
                                patrol.tour === 'nuit' ? (
                                    <Moon size={18} />
                                ) : (
                                    <Sun size={18} />
                                )
                            }
                        />
                        <Stat
                            label="Horaire"
                            value={`${formatTime(patrol.debut)} → ${patrol.fin ? formatTime(patrol.fin) : 'en cours'}`}
                            icon={<ShieldCheck size={18} />}
                        />
                        <Stat
                            label="Couverture"
                            value={`${patrol.points_faits} / ${patrol.points_prevus} (${patrol.couverture} %)`}
                            icon={<MapPin size={18} />}
                        />
                        <Stat
                            label="Constat"
                            value={patrol.ras ? 'RAS' : 'Anomalie'}
                            icon={
                                patrol.ras ? (
                                    <CheckCircle2 size={18} />
                                ) : (
                                    <TriangleAlert size={18} />
                                )
                            }
                        />
                        <Stat
                            label="Statut"
                            value={
                                patrol.statut === 'en_cours'
                                    ? 'En cours'
                                    : patrol.statut === 'terminee'
                                      ? 'Terminée'
                                      : 'Incomplète'
                            }
                            icon={<Flag size={18} />}
                        />
                    </section>

                    {(patrol.equipe || patrol.observations) && (
                        <section className="grid gap-4 md:grid-cols-2">
                            <Info
                                label="Accompagnement"
                                value={patrol.equipe || '—'}
                            />
                            <Info
                                label="Observations de fin de tour"
                                value={patrol.observations || '—'}
                            />
                        </section>
                    )}

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <div>
                                <h2 className="font-bold">
                                    Pointages aux postes de contrôle
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Chaque passage est horodaté par le serveur.
                                </p>
                            </div>
                            {open && (
                                <button
                                    type="button"
                                    onClick={() => setPointing(true)}
                                    className="hidden min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 sm:inline-flex"
                                >
                                    <MapPin size={16} /> Pointer un poste
                                </button>
                            )}
                        </header>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-white text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Heure</th>
                                        <th className="px-4 py-3">Poste</th>
                                        <th className="px-4 py-3">État</th>
                                        <th className="px-4 py-3">Constat</th>
                                        <th className="px-5 py-3">Photo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {patrol.passages.map((passage) => (
                                        <tr key={passage.id}>
                                            <td className="px-5 py-4 font-mono font-semibold">
                                                {formatTimeWithSeconds(
                                                    passage.passe_le,
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <b>{passage.poste?.code}</b>
                                                <span className="ml-2 text-slate-500">
                                                    {passage.poste?.nom}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${passage.etat === 'conforme' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                                                >
                                                    {passage.etat === 'conforme'
                                                        ? 'Conforme'
                                                        : 'ANOMALIE'}
                                                </span>
                                            </td>
                                            <td className="max-w-md px-4 py-4 text-slate-600">
                                                {passage.constat || '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                {passage.photo_url ? (
                                                    <a
                                                        href={passage.photo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
                                                    >
                                                        <Camera size={15} />{' '}
                                                        Voir
                                                    </a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {patrol.passages.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-5 py-14 text-center text-slate-500"
                                            >
                                                Aucun poste pointé pour le
                                                moment.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>

            <Dialog open={pointing} onOpenChange={setPointing}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pointer un poste</DialogTitle>
                        <DialogDescription>
                            Le passage sera horodaté automatiquement à la
                            soumission.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            pointForm.post(
                                `/patrouilles/${patrol.id}/pointages`,
                                {
                                    forceFormData: true,
                                    onSuccess: () => {
                                        setPointing(false);
                                        pointForm.reset();
                                    },
                                },
                            );
                        }}
                        className="space-y-5"
                    >
                        <Field
                            label="Poste de contrôle"
                            required
                            error={pointForm.errors.poste_controle_id}
                        >
                            <select
                                required
                                className={control}
                                value={pointForm.data.poste_controle_id}
                                onChange={(event) =>
                                    pointForm.setData(
                                        'poste_controle_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Select an option</option>
                                {posts.map((post) => (
                                    <option key={post.id} value={post.id}>
                                        {post.code} — {post.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="État constaté"
                            required
                            error={pointForm.errors.etat}
                        >
                            <select
                                required
                                className={control}
                                value={pointForm.data.etat}
                                onChange={(event) =>
                                    pointForm.setData(
                                        'etat',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="conforme">
                                    Conforme — rien à signaler
                                </option>
                                <option value="anomalie">
                                    Anomalie constatée
                                </option>
                            </select>
                        </Field>
                        {pointForm.data.etat === 'anomalie' && (
                            <Field
                                label="Description de l'anomalie"
                                required
                                error={pointForm.errors.constat}
                            >
                                <textarea
                                    required
                                    rows={4}
                                    className={control}
                                    value={pointForm.data.constat}
                                    onChange={(event) =>
                                        pointForm.setData(
                                            'constat',
                                            event.target.value,
                                        )
                                    }
                                />
                            </Field>
                        )}
                        <Field label="Photo" error={pointForm.errors.photo}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className={control}
                                onChange={(event) =>
                                    pointForm.setData(
                                        'photo',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                            />
                        </Field>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setPointing(false)}
                                className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={pointForm.processing}
                                className="min-h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={closing} onOpenChange={setClosing}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Clôturer</DialogTitle>
                        <DialogDescription>
                            Une couverture incomplète classera automatiquement
                            la patrouille comme incomplète.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            closeForm.post(
                                `/patrouilles/${patrol.id}/cloturer`,
                                { onSuccess: () => setClosing(false) },
                            );
                        }}
                        className="space-y-5"
                    >
                        <Field
                            label="Observations de fin de tour"
                            error={closeForm.errors.observations}
                        >
                            <textarea
                                rows={4}
                                className={control}
                                value={closeForm.data.observations}
                                onChange={(event) =>
                                    closeForm.setData(
                                        'observations',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setClosing(false)}
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

function Stat({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                {icon}
                {label}
            </span>
            <p className="mt-2 font-bold text-slate-950">{value}</p>
        </div>
    );
}
function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                {label}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
        </div>
    );
}
function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block text-sm font-semibold text-slate-700">
            {label}
            {required && <span className="text-red-600">*</span>}
            {children}
            {error && (
                <span className="mt-1.5 block text-xs text-red-600">
                    {error}
                </span>
            )}
        </label>
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
function formatTimeWithSeconds(value: string) {
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(new Date(value));
}
