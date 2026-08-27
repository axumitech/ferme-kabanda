import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    Check,
    ClipboardCheck,
    FileClock,
    Lock,
    MapPin,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { offlineQueue } from '@/lib/offline-queue';

type Motif = {
    id: number;
    code: string;
    libelle: string;
    recevable: boolean;
    preuve_requise: string;
};
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
    priorite: string;
    statut: string;
    quantite?: string | null;
    unite?: string | null;
    commentaire?: string | null;
    motif_precision?: string | null;
    dde_reference?: string | null;
    site?: { id: number; code: string; nom: string } | null;
    departement?: { id: number; code: string; nom: string } | null;
    motif?: Pick<Motif, 'id' | 'code' | 'libelle' | 'recevable'> | null;
    evenements: Array<{ id: number; type: string; resume: string; user_nom: string; created_at: string }>;
};
type Closure = {
    id: number;
    date: string;
    site?: { code: string } | null;
    departement?: { code: string } | null;
};
type Props = {
    tasks: Task[];
    motifs: Motif[];
    closures: Closure[];
    stats: {
        assigned: number;
        open: number;
        late: number;
        doneToday: number;
    };
};

const today = new Date().toISOString().slice(0, 10);

const statusText: Record<string, string> = {
    a_faire: 'À faire',
    faite: 'Faite',
    non_faite_justifiee: 'Justifiée',
    non_faite_non_justifiee: 'Non recevable',
    reportee: 'Reportée',
    annulee: 'Annulée',
};

const taskTone = (task: Task) => {
    if (task.statut === 'faite') return 'border-emerald-200 bg-emerald-50/60';
    if (task.statut === 'non_faite_non_justifiee') return 'border-red-200 bg-red-50/70';
    if (task.statut === 'non_faite_justifiee') return 'border-amber-200 bg-amber-50/70';
    if (task.date_due < today) return 'border-red-200 bg-white';

    return 'border-[#ded8ca] bg-white';
};

export default function MyDay({ tasks, motifs, closures, stats }: Props) {
    const [selected, setSelected] = useState<Task | null>(tasks.find((task) => task.statut === 'a_faire') ?? tasks[0] ?? null);
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'open' | 'done' | 'all'>('open');
    const completeForm = useForm({ quantite: '', unite: '', commentaire: '' });
    const justifyForm = useForm({
        motif_id: motifs[0]?.id ? String(motifs[0].id) : '',
        motif_precision: '',
    });

    const filtered = useMemo(
        () =>
            tasks.filter((task) => {
                const matchesMode =
                    mode === 'all' ||
                    (mode === 'open' && task.statut === 'a_faire') ||
                    (mode === 'done' && task.statut !== 'a_faire');
                const matchesQuery = `${task.titre} ${task.reference} ${task.lieu ?? ''} ${task.site?.code ?? ''}`
                    .toLowerCase()
                    .includes(query.toLowerCase());

                return matchesMode && matchesQuery;
            }),
        [tasks, mode, query],
    );

    const complete = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;

        if (!navigator.onLine) {
            offlineQueue.enqueue({
                method: 'POST',
                url: `/journee/taches/${selected.id}/complete`,
                payload: completeForm.data,
                label: `Tâche faite : ${selected.reference}`,
            });
            completeForm.reset('quantite', 'unite', 'commentaire');
            return;
        }

        completeForm.post(`/journee/taches/${selected.id}/complete`, {
            preserveScroll: true,
            onSuccess: () => completeForm.reset('quantite', 'unite', 'commentaire'),
        });
    };

    const justify = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;

        if (!navigator.onLine) {
            offlineQueue.enqueue({
                method: 'POST',
                url: `/journee/taches/${selected.id}/justify`,
                payload: justifyForm.data,
                label: `Justification : ${selected.reference}`,
            });
            justifyForm.reset('motif_precision');
            return;
        }

        justifyForm.post(`/journee/taches/${selected.id}/justify`, {
            preserveScroll: true,
            onSuccess: () => justifyForm.reset('motif_precision'),
        });
    };

    return (
        <>
            <Head title="Ma journée" />
            <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-800 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="bg-glass rounded-2xl border border-emerald-950/5 p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 bg-gradient-to-br from-emerald-400/20 to-transparent blur-3xl rounded-full w-96 h-96 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                        <div className="relative flex flex-wrap items-start justify-between gap-4 z-10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Poste terrain</p>
                                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Ma journée</h1>
                                <p className="mt-2 text-sm text-slate-500 font-medium">Chaque tâche reçoit une réponse: faite ou justifiée.</p>
                            </div>
                            {closures.length > 0 && (
                                <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 backdrop-blur-md px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm flex items-center">
                                    <Lock className="mr-2.5" size={16} />
                                    {closures.length} clôture(s) aujourd'hui
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-4">
                        {[
                            { label: 'Assignées', value: stats.assigned, icon: ClipboardCheck },
                            { label: 'Ouvertes', value: stats.open, icon: CalendarDays },
                            { label: 'En retard', value: stats.late, icon: AlertTriangle, danger: stats.late > 0 },
                            { label: 'Faites', value: stats.doneToday, icon: Check },
                        ].map(({ label, value, icon: Icon, danger }) => (
                            <div key={label} className={`bg-glass hover-lift rounded-2xl border p-5 shadow-sm transition-all duration-300 ${danger ? 'border-red-200 shadow-red-100' : 'border-emerald-950/5'}`}>
                                <div className="flex items-start justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                                    <span className={`grid size-10 place-items-center rounded-xl shadow-sm ${danger ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-600' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600'}`}>
                                        <Icon size={18} strokeWidth={2.5} />
                                    </span>
                                </div>
                                <div className={`mt-5 text-4xl font-extrabold ${danger ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
                            </div>
                        ))}
                    </section>

                    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,.95fr)_minmax(320px,1.05fr)]">
                        <div className="space-y-4">
                            <div className="bg-glass rounded-2xl border border-emerald-950/5 p-4 shadow-sm">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {[
                                        ['open', 'À faire'],
                                        ['done', 'Traitées'],
                                        ['all', 'Toutes'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setMode(value as 'open' | 'done' | 'all')}
                                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm ${mode === value ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-emerald-200' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                                    <Search size={18} className="text-slate-400" />
                                    <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        className="h-12 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 text-slate-800"
                                        placeholder="Chercher une tâche..."
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {filtered.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => setSelected(task)}
                                        className={`rounded-2xl border p-5 text-left shadow-sm hover-lift transition-all duration-200 relative overflow-hidden ${taskTone(task)} ${selected?.id === task.id ? 'ring-2 ring-emerald-500 border-emerald-500 scale-[1.02]' : 'hover:border-emerald-200'}`}
                                    >
                                        {selected?.id === task.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl"></div>}
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-base text-slate-800 line-clamp-2">{task.titre}</div>
                                                <div className="mt-2 text-xs font-medium text-slate-500 tracking-wide">{task.reference} &bull; {task.date_due}{task.heure_due ? ` &bull; ${task.heure_due}` : ''}</div>
                                            </div>
                                            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider shrink-0 ${task.statut === 'a_faire' ? 'bg-amber-100 text-amber-700' : task.statut === 'faite' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {statusText[task.statut] ?? task.statut}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                                            <MapPin size={16} className="text-slate-400" /> {task.lieu || task.site?.nom || 'Lieu libre'}
                                        </div>
                                    </button>
                                ))}
                                {filtered.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-5 py-12 text-center text-sm font-medium text-slate-500 shadow-sm backdrop-blur-sm">
                                        Aucune tâche ne correspond à vos critères.
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="bg-glass rounded-2xl border border-emerald-950/5 shadow-sm self-start sticky top-6 overflow-hidden">
                            <div className="border-b border-emerald-950/5 bg-white/50 p-6">
                                {selected ? (
                                    <>
                                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{selected.reference}</p>
                                        <h2 className="mt-3 text-2xl font-extrabold text-slate-800 leading-tight">{selected.titre}</h2>
                                        <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5">
                                            <MapPin size={14}/> {selected.site?.code ?? 'Site libre'} &bull; {selected.departement?.code ?? 'Dépt libre'} &bull; {selected.lieu ?? 'Lieu libre'}
                                        </p>
                                    </>
                                ) : (
                                    <h2 className="text-xl font-bold text-slate-400 py-4 text-center">Aucune tâche sélectionnée</h2>
                                )}
                            </div>

                            {selected && (
                                <div className="space-y-6 p-6 bg-slate-50/30">
                                    {selected.instruction && (
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm leading-relaxed text-emerald-900 shadow-inner font-medium">
                                            <div className="text-xs font-bold uppercase text-emerald-600 mb-2 tracking-wider">Instructions</div>
                                            {selected.instruction}
                                        </div>
                                    )}

                                    {selected.statut === 'a_faire' ? (
                                        <div className="grid gap-5 xl:grid-cols-2">
                                            <form onSubmit={complete} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="mb-4 flex items-center gap-2.5 font-bold text-emerald-700 text-lg">
                                                    <div className="p-1.5 bg-emerald-100 rounded-lg"><Check size={18} strokeWidth={3} /></div> Faite
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Quantité
                                                        <input type="number" min="0" step="0.0001" value={completeForm.data.quantite} onChange={(event) => completeForm.setData('quantite', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                                        <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">Facultatif : volume réellement exécuté.</span>
                                                    </label>
                                                    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Unité
                                                        <input value={completeForm.data.unite} onChange={(event) => completeForm.setData('unite', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                                                        <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">Ex : planches, kg, litres, passage.</span>
                                                    </label>
                                                </div>
                                                <label className="mt-4 grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Commentaire
                                                    <textarea rows={3} value={completeForm.data.commentaire} onChange={(event) => completeForm.setData('commentaire', event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none" />
                                                    <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">Ajoutez ce qui aide l’admin à comprendre le résultat.</span>
                                                </label>
                                                <button type="submit" disabled={completeForm.processing} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-sm font-bold text-white shadow-sm hover:from-emerald-700 hover:to-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all disabled:opacity-70">
                                                    Enregistrer
                                                </button>
                                            </form>

                                            <form onSubmit={justify} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="mb-4 flex items-center gap-2.5 font-bold text-amber-700 text-lg">
                                                    <div className="p-1.5 bg-amber-100 rounded-lg"><FileClock size={18} strokeWidth={2.5} /></div> Justifiée
                                                </div>
                                                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Motif
                                                    <select value={justifyForm.data.motif_id} onChange={(event) => justifyForm.setData('motif_id', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all">
                                                        {motifs.map((motif) => (
                                                            <option key={motif.id} value={motif.id}>
                                                                {motif.libelle}{motif.recevable ? '' : ' (RH)'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">Choisissez la raison réelle de non-exécution.</span>
                                                </label>
                                                <label className="mt-4 grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Preuve / Détails
                                                    <input value={justifyForm.data.motif_precision} onChange={(event) => justifyForm.setData('motif_precision', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" />
                                                    <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">Ex : bon de travail, responsable consulté, incident, article manquant.</span>
                                                </label>
                                                <button type="submit" disabled={justifyForm.processing} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold text-white shadow-sm hover:from-amber-600 hover:to-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all disabled:opacity-70">
                                                    Justifier
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                                            <div className="inline-block p-3 rounded-full bg-slate-100 mb-3"><Check size={24} className="text-emerald-500" strokeWidth={3}/></div>
                                            <div className="font-bold text-lg text-slate-800">{statusText[selected.statut] ?? selected.statut}</div>
                                            <div className="mt-2 text-sm font-medium text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                {selected.commentaire || selected.motif?.libelle || selected.motif_precision || 'Traitement enregistré avec succès.'}
                                            </div>
                                        </div>
                                    )}

                                    {selected.evenements.length > 0 && (
                                        <div className="pt-4 border-t border-emerald-950/5">
                                            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Historique des actions</div>
                                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                                {selected.evenements.map((event) => (
                                                    <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] hover:shadow-md transition-shadow">
                                                            <div className="font-bold text-slate-800">{event.resume}</div>
                                                            <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                <span>{event.user_nom}</span>
                                                                <span>{event.created_at}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </aside>
                    </section>
                </div>
            </main>
        </>
    );
}
