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
import { useI18n } from '@/lib/i18n';

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
    evenements: Array<{
        id: number;
        type: string;
        resume: string;
        user_nom: string;
        created_at: string;
    }>;
    can_act: boolean;
    responsable_nom?: string | null;
    mon_departement: boolean;
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
    vueParDefaut: string;
};

const today = new Date().toISOString().slice(0, 10);

const taskTone = (task: Task) => {
    if (task.statut === 'faite') return 'border-emerald-200 bg-emerald-50/60';
    if (task.statut === 'non_faite_non_justifiee')
        return 'border-red-200 bg-red-50/70';
    if (task.statut === 'non_faite_justifiee')
        return 'border-amber-200 bg-amber-50/70';
    if (task.date_due < today) return 'border-red-200 bg-white';

    return 'border-[#ded8ca] bg-white';
};

export default function MyDay({
    tasks,
    motifs,
    closures,
    stats,
    vueParDefaut,
}: Props) {
    const { tr } = useI18n();
    const statusText: Record<string, string> = {
        a_faire: tr('À faire'),
        faite: tr('Faite'),
        non_faite_justifiee: tr('Justifiée'),
        non_faite_non_justifiee: tr('Non recevable'),
        reportee: tr('Reportée'),
        annulee: tr('Annulée'),
    };
    const [selected, setSelected] = useState<Task | null>(
        tasks.find((task) => task.statut === 'a_faire') ?? tasks[0] ?? null,
    );
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<'open' | 'done' | 'all'>('open');
    const [scope, setScope] = useState<'mine' | 'department' | 'team'>(
        vueParDefaut === 'tout' ? 'team' : 'mine',
    );
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
                const matchesQuery =
                    `${task.titre} ${task.reference} ${task.lieu ?? ''} ${task.site?.code ?? ''}`
                        .toLowerCase()
                        .includes(query.toLowerCase());

                const matchesScope =
                    scope === 'team' ||
                    (scope === 'department'
                        ? task.mon_departement
                        : task.can_act);
                return matchesMode && matchesQuery && matchesScope;
            }),
        [tasks, mode, query, scope],
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
            onSuccess: () =>
                completeForm.reset('quantite', 'unite', 'commentaire'),
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
            <Head title={tr('Ma journée')} />
            <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-800 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="bg-glass relative overflow-hidden rounded-2xl border border-emerald-950/5 p-6 shadow-sm">
                        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/2 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent p-12 blur-3xl"></div>
                        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                                    {tr('Poste terrain')}
                                </p>
                                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                                    {tr('Ma journée')}
                                </h1>
                                <p className="mt-2 text-sm font-medium text-slate-500">
                                    {tr(
                                        'Chaque tâche reçoit une réponse: faite ou justifiée.',
                                    )}
                                </p>
                            </div>
                            {closures.length > 0 && (
                                <div className="flex items-center rounded-xl border border-emerald-200/50 bg-emerald-50/50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur-md">
                                    <Lock className="mr-2.5" size={16} />
                                    {closures.length}{' '}
                                    {tr("clôture(s) aujourd'hui")}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-4">
                        {[
                            {
                                label: tr('Assignées'),
                                value: stats.assigned,
                                icon: ClipboardCheck,
                            },
                            {
                                label: tr('Ouvertes'),
                                value: stats.open,
                                icon: CalendarDays,
                            },
                            {
                                label: tr('En retard'),
                                value: stats.late,
                                icon: AlertTriangle,
                                danger: stats.late > 0,
                            },
                            {
                                label: tr('Faites'),
                                value: stats.doneToday,
                                icon: Check,
                            },
                        ].map(({ label, value, icon: Icon, danger }) => (
                            <div
                                key={label}
                                className={`bg-glass hover-lift rounded-2xl border p-5 shadow-sm transition-all duration-300 ${danger ? 'border-red-200 shadow-red-100' : 'border-emerald-950/5'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                                        {label}
                                    </span>
                                    <span
                                        className={`grid size-10 place-items-center rounded-xl shadow-sm ${danger ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-600' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600'}`}
                                    >
                                        <Icon size={18} strokeWidth={2.5} />
                                    </span>
                                </div>
                                <div
                                    className={`mt-5 text-4xl font-extrabold ${danger ? 'text-red-600' : 'text-slate-800'}`}
                                >
                                    {value}
                                </div>
                            </div>
                        ))}
                    </section>

                    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,.95fr)_minmax(320px,1.05fr)]">
                        <div className="space-y-4">
                            <div className="bg-glass rounded-2xl border border-emerald-950/5 p-4 shadow-sm">
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {[
                                        ['mine', tr('Mes tâches')],
                                        ['department', tr('Mon département')],
                                        ['team', tr('Toute la ferme')],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                setScope(
                                                    value as
                                                        | 'mine'
                                                        | 'department'
                                                        | 'team',
                                                )
                                            }
                                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 ${scope === value ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mb-4 text-xs font-medium text-slate-500">
                                    {scope === 'team'
                                        ? tr(
                                              'Registre de toute la ferme : vous voyez les tâches sans pouvoir agir à la place d’un collègue.',
                                          )
                                        : scope === 'department'
                                          ? tr(
                                                'Les tâches de votre département, y compris celles de vos collègues.',
                                            )
                                          : tr(
                                                'Vos tâches et celles auxquelles vous participez.',
                                            )}
                                </p>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {[
                                        ['open', tr('À faire')],
                                        ['done', tr('Traitées')],
                                        ['all', tr('Toutes')],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                setMode(
                                                    value as
                                                        'open' | 'done' | 'all',
                                                )
                                            }
                                            className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 ${mode === value ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-emerald-200' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500">
                                    <Search
                                        size={18}
                                        className="text-slate-400"
                                    />
                                    <input
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        className="h-12 w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                        placeholder={tr(
                                            'Chercher une tâche...',
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {filtered.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => setSelected(task)}
                                        className={`hover-lift relative overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 ${taskTone(task)} ${selected?.id === task.id ? 'scale-[1.02] border-emerald-500 ring-2 ring-emerald-500' : 'hover:border-emerald-200'}`}
                                    >
                                        {selected?.id === task.id && (
                                            <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl bg-emerald-500"></div>
                                        )}
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="line-clamp-2 text-base font-bold text-slate-800">
                                                    {task.titre}
                                                </div>
                                                <div className="mt-2 text-xs font-medium tracking-wide text-slate-500">
                                                    {task.reference} &bull;{' '}
                                                    {task.date_due}
                                                    {task.heure_due
                                                        ? ` &bull; ${task.heure_due}`
                                                        : ''}
                                                </div>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tracking-wider uppercase ${task.statut === 'a_faire' ? 'bg-amber-100 text-amber-700' : task.statut === 'faite' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                {statusText[task.statut] ??
                                                    task.statut}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                                            <MapPin
                                                size={16}
                                                className="text-slate-400"
                                            />{' '}
                                            {task.lieu ||
                                                task.site?.nom ||
                                                tr('Lieu libre')}
                                            {!task.can_act && (
                                                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                                    Responsable :{' '}
                                                    {task.responsable_nom ??
                                                        tr('Non assignée')}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                {filtered.length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-5 py-12 text-center text-sm font-medium text-slate-500 shadow-sm backdrop-blur-sm">
                                        {tr(
                                            'Aucune tâche ne correspond à vos critères.',
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <aside className="bg-glass sticky top-6 self-start overflow-hidden rounded-2xl border border-emerald-950/5 shadow-sm">
                            <div className="border-b border-emerald-950/5 bg-white/50 p-6">
                                {selected ? (
                                    <>
                                        <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">
                                            {selected.reference}
                                        </p>
                                        <h2 className="mt-3 text-2xl leading-tight font-extrabold text-slate-800">
                                            {selected.titre}
                                        </h2>
                                        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-500">
                                            <MapPin size={14} />{' '}
                                            {selected.site?.code ??
                                                tr('Site libre')}{' '}
                                            &bull;{' '}
                                            {selected.departement?.code ??
                                                tr('Dépt libre')}{' '}
                                            &bull;{' '}
                                            {selected.lieu ?? tr('Lieu libre')}
                                        </p>
                                    </>
                                ) : (
                                    <h2 className="py-4 text-center text-xl font-bold text-slate-400">
                                        {tr('Aucune tâche sélectionnée')}
                                    </h2>
                                )}
                            </div>

                            {selected && (
                                <div className="space-y-6 bg-slate-50/30 p-6">
                                    {selected.instruction && (
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm leading-relaxed font-medium text-emerald-900 shadow-inner">
                                            <div className="mb-2 text-xs font-bold tracking-wider text-emerald-600 uppercase">
                                                {tr('Instructions')}
                                            </div>
                                            {selected.instruction}
                                        </div>
                                    )}

                                    {selected.statut === 'a_faire' &&
                                    selected.can_act ? (
                                        <div className="grid gap-5 xl:grid-cols-2">
                                            <form
                                                onSubmit={complete}
                                                className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                <div className="mb-4 flex items-center gap-2.5 text-lg font-bold text-emerald-700">
                                                    <div className="rounded-lg bg-emerald-100 p-1.5">
                                                        <Check
                                                            size={18}
                                                            strokeWidth={3}
                                                        />
                                                    </div>{' '}
                                                    {tr('Faite')}
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <label className="grid gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                        {tr('Quantité')}
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.0001"
                                                            value={
                                                                completeForm
                                                                    .data
                                                                    .quantite
                                                            }
                                                            onChange={(event) =>
                                                                completeForm.setData(
                                                                    'quantite',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <span className="text-[11px] font-medium tracking-normal text-slate-400 normal-case">
                                                            {tr(
                                                                'Facultatif : volume réellement exécuté.',
                                                            )}
                                                        </span>
                                                    </label>
                                                    <label className="grid gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                        {tr('Unité')}
                                                        <input
                                                            value={
                                                                completeForm
                                                                    .data.unite
                                                            }
                                                            onChange={(event) =>
                                                                completeForm.setData(
                                                                    'unite',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                                        />
                                                        <span className="text-[11px] font-medium tracking-normal text-slate-400 normal-case">
                                                            {tr(
                                                                'Ex : planches, kg, litres, passage.',
                                                            )}
                                                        </span>
                                                    </label>
                                                </div>
                                                <label className="mt-4 grid gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                    {tr('Commentaire')}
                                                    <textarea
                                                        rows={3}
                                                        value={
                                                            completeForm.data
                                                                .commentaire
                                                        }
                                                        onChange={(event) =>
                                                            completeForm.setData(
                                                                'commentaire',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                                    />
                                                    <span className="text-[11px] font-medium tracking-normal text-slate-400 normal-case">
                                                        {tr(
                                                            'Ajoutez ce qui aide l’admin à comprendre le résultat.',
                                                        )}
                                                    </span>
                                                </label>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        completeForm.processing
                                                    }
                                                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70"
                                                >
                                                    {tr('Enregistrer')}
                                                </button>
                                            </form>

                                            <form
                                                onSubmit={justify}
                                                className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                <div className="mb-4 flex items-center gap-2.5 text-lg font-bold text-amber-700">
                                                    <div className="rounded-lg bg-amber-100 p-1.5">
                                                        <FileClock
                                                            size={18}
                                                            strokeWidth={2.5}
                                                        />
                                                    </div>{' '}
                                                    {tr('Justifiée')}
                                                </div>
                                                <label className="grid gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                    {tr('Motif')}
                                                    <select
                                                        value={
                                                            justifyForm.data
                                                                .motif_id
                                                        }
                                                        onChange={(event) =>
                                                            justifyForm.setData(
                                                                'motif_id',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                                    >
                                                        {motifs.map((motif) => (
                                                            <option
                                                                key={motif.id}
                                                                value={motif.id}
                                                            >
                                                                {motif.libelle}
                                                                {motif.recevable
                                                                    ? ''
                                                                    : ' (RH)'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <span className="text-[11px] font-medium tracking-normal text-slate-400 normal-case">
                                                        {tr(
                                                            'Choisissez la raison réelle de non-exécution.',
                                                        )}
                                                    </span>
                                                </label>
                                                <label className="mt-4 grid gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                                    {tr('Preuve / Détails')}
                                                    <input
                                                        value={
                                                            justifyForm.data
                                                                .motif_precision
                                                        }
                                                        onChange={(event) =>
                                                            justifyForm.setData(
                                                                'motif_precision',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 transition-all outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                                                    />
                                                    <span className="text-[11px] font-medium tracking-normal text-slate-400 normal-case">
                                                        {tr(
                                                            'Ex : bon de travail, responsable consulté, incident, article manquant.',
                                                        )}
                                                    </span>
                                                </label>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        justifyForm.processing
                                                    }
                                                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold text-white shadow-sm transition-all hover:from-amber-600 hover:to-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-70"
                                                >
                                                    {tr('Justifier')}
                                                </button>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                                            <div className="mb-3 inline-block rounded-full bg-slate-100 p-3">
                                                <Check
                                                    size={24}
                                                    className="text-emerald-500"
                                                    strokeWidth={3}
                                                />
                                            </div>
                                            <div className="text-lg font-bold text-slate-800">
                                                {selected.statut === 'a_faire'
                                                    ? tr('Tâche d’un collègue')
                                                    : (statusText[
                                                          selected.statut
                                                      ] ?? selected.statut)}
                                            </div>
                                            <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm font-medium text-slate-500">
                                                {selected.statut ===
                                                    'a_faire' &&
                                                !selected.can_act
                                                    ? `${tr('Visible pour coordination. Responsable :')} ${selected.responsable_nom ?? tr('Non assignée')}.`
                                                    : selected.commentaire ||
                                                      selected.motif?.libelle ||
                                                      selected.motif_precision ||
                                                      tr(
                                                          'Traitement enregistré avec succès.',
                                                      )}
                                            </div>
                                        </div>
                                    )}

                                    {selected.evenements.length > 0 && (
                                        <div className="border-t border-emerald-950/5 pt-4">
                                            <div className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
                                                {tr('Historique des actions')}
                                            </div>
                                            <div className="relative space-y-3 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent md:before:mx-auto md:before:translate-x-0">
                                                {selected.evenements.map(
                                                    (event) => (
                                                        <div
                                                            key={event.id}
                                                            className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
                                                        >
                                                            <div className="w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm transition-shadow hover:shadow-md md:w-[calc(50%-1.5rem)]">
                                                                <div className="font-bold text-slate-800">
                                                                    {
                                                                        event.resume
                                                                    }
                                                                </div>
                                                                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                                                                    <span>
                                                                        {
                                                                            event.user_nom
                                                                        }
                                                                    </span>
                                                                    <span>
                                                                        {
                                                                            event.created_at
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
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
