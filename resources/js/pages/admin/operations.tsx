import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    Check,
    ClipboardCheck,
    Clock,
    FileClock,
    FileText,
    Lock,
    Plus,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useI18n } from '@/lib/i18n';

type Option = { value: string; label: string };
type User = { id: number; name: string; niveau_hierarchie?: number };
type Site = { id: number; code: string; nom: string };
type Departement = { id: number; code: string; nom: string };
type Motif = {
    id: number;
    code: string;
    libelle: string;
    recevable: boolean;
    preuve_requise: string;
    article_reglement?: string | null;
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
    dde_statut?: string | null;
    responsable?: User | null;
    intervenants?: Array<{ id: number; role: string; user: User }>;
    createur?: User | null;
    site?: Site | null;
    departement?: Departement | null;
    motif?: Pick<Motif, 'id' | 'code' | 'libelle' | 'recevable'> | null;
    evenements: Array<{
        id: number;
        type: string;
        resume: string;
        user_nom: string;
        created_at: string;
    }>;
};
type AuditEntry = {
    id: number;
    action: string;
    user_nom: string;
    resume?: string | null;
    created_at: string;
};
type Props = {
    tasks: Task[];
    sites: Site[];
    departements: Departement[];
    motifs: Motif[];
    users: User[];
    audit: AuditEntry[];
    stats: {
        today: number;
        open: number;
        late: number;
        done: number;
        disciplinary: number | null;
    };
    visibility: {
        dossiersDisciplinaires: boolean;
        journalAudit: boolean;
    };
    options: {
        sources: Option[];
        priorities: Option[];
        statuses: Option[];
    };
};

const today = new Date().toISOString().slice(0, 10);

const formatDateTime = (value: string): string =>
    new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));

const badgeClass = (task: Task) => {
    if (task.statut === 'faite') return 'admin-badge admin-badge--green';
    if (task.statut === 'non_faite_non_justifiee')
        return 'admin-badge admin-badge--red';
    if (task.statut === 'non_faite_justifiee')
        return 'admin-badge admin-badge--gold';
    if (task.date_due < today) return 'admin-badge admin-badge--red';
    return 'admin-badge admin-badge--gray';
};

export default function OperationsAdmin({
    tasks,
    sites,
    departements,
    motifs,
    users,
    audit,
    stats,
    visibility,
    options,
}: Props) {
    const { tr } = useI18n();
    const statusLabel: Record<string, string> = {
        a_faire: tr('À faire'),
        faite: tr('Faite'),
        non_faite_justifiee: tr('Justifiée'),
        non_faite_non_justifiee: tr('Non recevable'),
        reportee: tr('Reportée'),
        annulee: tr('Annulée'),
    };
    const priorityLabel: Record<string, string> = {
        urgente: tr('Urgente'),
        elevee: tr('Élevée'),
        normale: tr('Normale'),
        planifiee: tr('Planifiée'),
    };
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('open');
    const [selected, setSelected] = useState<Task | null>(tasks[0] ?? null);
    const [showCreate, setShowCreate] = useState(tasks.length === 0);
    const setupMissing =
        sites.length === 0 || departements.length === 0 || motifs.length === 0;

    const createForm = useForm({
        source: 'manuelle',
        titre: '',
        description: '',
        instruction: '',
        site_id: sites[0]?.id ? String(sites[0].id) : '',
        departement_id: departements[0]?.id ? String(departements[0].id) : '',
        lieu: '',
        responsable_id: users[0]?.id ? String(users[0].id) : '',
        appui_ids: [] as string[],
        informe_ids: [] as string[],
        date_due: today,
        heure_due: '',
        priorite: 'normale',
    });
    const completeForm = useForm({ quantite: '', unite: '', commentaire: '' });
    const justifyForm = useForm({
        motif_id: motifs[0]?.id ? String(motifs[0].id) : '',
        motif_precision: '',
    });
    const closeForm = useForm({
        site_id: sites[0]?.id ? String(sites[0].id) : '',
        departement_id: departements[0]?.id ? String(departements[0].id) : '',
        date: today,
        observation: '',
    });
    const ddeForm = useForm({ observation: '' });

    const filtered = useMemo(
        () =>
            tasks.filter((task) => {
                const haystack =
                    `${task.reference} ${task.titre} ${task.lieu ?? ''} ${task.responsable?.name ?? ''} ${task.site?.code ?? ''} ${task.departement?.code ?? ''}`.toLowerCase();
                const matchesQuery =
                    !query || haystack.includes(query.toLowerCase());
                const matchesStatus =
                    status === 'all' ||
                    (status === 'open' && task.statut === 'a_faire') ||
                    (status === 'late' &&
                        task.statut === 'a_faire' &&
                        task.date_due < today) ||
                    task.statut === status;

                return matchesQuery && matchesStatus;
            }),
        [tasks, query, status],
    );

    const submitCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/admin/operations/tasks', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset(
                    'titre',
                    'description',
                    'instruction',
                    'lieu',
                    'heure_due',
                );
                setShowCreate(false);
            },
        });
    };

    const complete = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;

        completeForm.post(`/admin/operations/tasks/${selected.id}/complete`, {
            preserveScroll: true,
            onSuccess: () =>
                completeForm.reset('quantite', 'unite', 'commentaire'),
        });
    };

    const justify = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;

        justifyForm.post(`/admin/operations/tasks/${selected.id}/justify`, {
            preserveScroll: true,
            onSuccess: () => justifyForm.reset('motif_precision'),
        });
    };

    const closeDay = (event: React.FormEvent) => {
        event.preventDefault();
        closeForm.post('/admin/operations/close-day', { preserveScroll: true });
    };

    const validateDde = () => {
        if (!selected) return;
        ddeForm.post(`/admin/operations/tasks/${selected.id}/dde/validate`, {
            preserveScroll: true,
        });
    };

    const requalifyDde = (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        ddeForm.post(`/admin/operations/tasks/${selected.id}/dde/requalify`, {
            preserveScroll: true,
        });
    };

    const reloadSeededReferences = () => {
        router.reload({ only: ['sites', 'departements', 'motifs', 'users'] });
    };

    return (
        <AdminLayout
            title="Opérations"
            subtitle="Pilotez les tâches, les justifications, les clôtures et la traçabilité du socle."
        >
            <Head title={tr('Opérations')} />

            <div className="admin-animate-in">
                <div className="admin-stats-grid">
                    {[
                        {
                            icon: CalendarCheck,
                            label: tr("Tâches aujourd'hui"),
                            value: stats.today,
                        },
                        {
                            icon: ClipboardCheck,
                            label: tr('Ouvertes'),
                            value: stats.open,
                        },
                        {
                            icon: AlertTriangle,
                            label: tr('En retard'),
                            value: stats.late,
                            danger: stats.late > 0,
                        },
                        { icon: Check, label: tr('Faites'), value: stats.done },
                        ...(visibility.dossiersDisciplinaires
                            ? [
                                  {
                                      icon: ShieldCheck,
                                      label: tr('Dossiers RH'),
                                      value: stats.disciplinary ?? 0,
                                      danger: (stats.disciplinary ?? 0) > 0,
                                  },
                              ]
                            : []),
                    ].map(({ icon: Icon, label, value, danger }) => (
                        <div
                            key={label}
                            className={`admin-stat-card${danger ? 'admin-stat-card--danger' : ''}`}
                        >
                            <div className="admin-stat-header">
                                <span className="admin-stat-label">
                                    {label}
                                </span>
                                <div className="admin-stat-icon">
                                    <Icon size={16} />
                                </div>
                            </div>
                            <div className="admin-stat-value">{value}</div>
                        </div>
                    ))}
                </div>

                {setupMissing && (
                    <div className="admin-form-panel mb-6 border-amber-200 bg-amber-50/60">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="admin-section-eyebrow">
                                    {tr('Configuration à compléter')}
                                </div>
                                <h2 className="admin-section-title text-[20px]">
                                    {tr(
                                        'Certaines actions ont besoin des références du socle.',
                                    )}
                                </h2>
                                <p className="admin-section-desc mb-0">
                                    {tr(
                                        'Vérifiez les sites, départements et motifs avant de clôturer une journée ou justifier une tâche.',
                                    )}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={reloadSeededReferences}
                            >
                                {tr('Recharger')}
                            </button>
                        </div>
                    </div>
                )}

                <div className="admin-toolbar">
                    <div className="admin-tabs">
                        {[
                            ['open', 'Ouvertes'],
                            ['late', 'En retard'],
                            ['faite', 'Faites'],
                            ['non_faite_justifiee', 'Justifiées'],
                            ...(visibility.dossiersDisciplinaires
                                ? [['non_faite_non_justifiee', 'RH']]
                                : []),
                            ['all', 'Toutes'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStatus(value)}
                                className={`admin-tab${status === value ? 'admin-tab--active' : ''}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate((value) => !value)}
                        className="admin-btn-primary"
                    >
                        <Plus size={15} /> Tâche
                    </button>
                </div>

                {showCreate && (
                    <form onSubmit={submitCreate} className="admin-form-panel">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[#edf3ed] text-[#174a31]">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-semibold text-[#17352a]">
                                    Créer une tâche opérationnelle
                                </h3>
                                <p className="text-[13px] text-[#637069]">
                                    Elle devient assignable, traçable et
                                    bloquante à la clôture.
                                </p>
                            </div>
                        </div>

                        <div className="admin-form-grid admin-form-grid-4">
                            <div className="admin-field">
                                <label>Titre</label>
                                <input
                                    value={createForm.data.titre}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'titre',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="admin-field">
                                <label>Responsable</label>
                                <select
                                    value={createForm.data.responsable_id}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'responsable_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Non assignée</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Appuis (co-exécutants)</label>
                                <select
                                    multiple
                                    value={createForm.data.appui_ids}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'appui_ids',
                                            Array.from(
                                                event.target.selectedOptions,
                                                (option) => option.value,
                                            ),
                                        )
                                    }
                                >
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Informés (lecture)</label>
                                <select
                                    multiple
                                    value={createForm.data.informe_ids}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'informe_ids',
                                            Array.from(
                                                event.target.selectedOptions,
                                                (option) => option.value,
                                            ),
                                        )
                                    }
                                >
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Site</label>
                                <select
                                    value={createForm.data.site_id}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'site_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Aucun</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.code} - {site.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Département</label>
                                <select
                                    value={createForm.data.departement_id}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'departement_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Aucun</option>
                                    {departements.map((departement) => (
                                        <option
                                            key={departement.id}
                                            value={departement.id}
                                        >
                                            {departement.code} -{' '}
                                            {departement.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={createForm.data.date_due}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'date_due',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="admin-field">
                                <label>Heure</label>
                                <input
                                    type="time"
                                    value={createForm.data.heure_due}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'heure_due',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="admin-field">
                                <label>Priorité</label>
                                <select
                                    value={createForm.data.priorite}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'priorite',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {options.priorities.map((priority) => (
                                        <option
                                            key={priority.value}
                                            value={priority.value}
                                        >
                                            {priority.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="admin-field">
                                <label>Source</label>
                                <select
                                    value={createForm.data.source}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'source',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {options.sources.map((source) => (
                                        <option
                                            key={source.value}
                                            value={source.value}
                                        >
                                            {source.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="admin-form-grid mt-4">
                            <div className="admin-field">
                                <label>Lieu</label>
                                <input
                                    value={createForm.data.lieu}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'lieu',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Parcelle, atelier, poste..."
                                />
                            </div>
                            <div className="admin-field">
                                <label>Instruction</label>
                                <textarea
                                    rows={2}
                                    value={createForm.data.instruction}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'instruction',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => setShowCreate(false)}
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="admin-btn-submit"
                                disabled={createForm.processing}
                            >
                                Créer la tâche
                            </button>
                        </div>
                    </form>
                )}

                <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.9fr)]">
                    <section>
                        <div className="admin-search">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Référence, tâche, lieu, responsable..."
                            />
                        </div>

                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Tâche</th>
                                        <th>Responsable</th>
                                        <th>Échéance</th>
                                        <th>Statut</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((task) => (
                                        <tr key={task.id}>
                                            <td>
                                                <span className="admin-cell-bold">
                                                    {task.titre}
                                                </span>
                                                <span className="admin-cell-sub">
                                                    {task.reference} ·{' '}
                                                    {task.source.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </span>
                                                {task.instruction && (
                                                    <span className="admin-cell-sub">
                                                        {task.instruction}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {task.responsable?.name ??
                                                    'Non assignée'}
                                                {task.intervenants?.filter(
                                                    (intervenant) =>
                                                        intervenant.role !==
                                                        'responsable',
                                                ).length ? (
                                                    <span className="admin-cell-sub">
                                                        +{' '}
                                                        {task.intervenants
                                                            .filter(
                                                                (intervenant) =>
                                                                    intervenant.role !==
                                                                    'responsable',
                                                            )
                                                            .map(
                                                                (intervenant) =>
                                                                    intervenant
                                                                        .user
                                                                        .name,
                                                            )
                                                            .join(', ')}
                                                    </span>
                                                ) : null}
                                                <span className="admin-cell-sub">
                                                    {task.site?.code ??
                                                        'Site libre'}{' '}
                                                    ·{' '}
                                                    {task.departement?.code ??
                                                        'Département libre'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="admin-cell-bold">
                                                    {task.date_due}
                                                </span>
                                                <span className="admin-cell-sub">
                                                    {task.heure_due ??
                                                        'Toute la journée'}{' '}
                                                    ·{' '}
                                                    {priorityLabel[
                                                        task.priorite
                                                    ] ?? task.priorite}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={badgeClass(task)}
                                                >
                                                    {statusLabel[task.statut] ??
                                                        task.statut}
                                                </span>
                                                {visibility.dossiersDisciplinaires &&
                                                    task.dde_reference && (
                                                        <span className="admin-cell-sub">
                                                            DDE{' '}
                                                            {task.dde_reference}
                                                        </span>
                                                    )}
                                                {visibility.dossiersDisciplinaires &&
                                                    task.dde_statut ===
                                                        'a_valider' && (
                                                        <span className="admin-cell-sub">
                                                            DDE à valider
                                                        </span>
                                                    )}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="admin-btn-secondary"
                                                    onClick={() =>
                                                        setSelected(task)
                                                    }
                                                >
                                                    Ouvrir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="admin-empty">
                                    Aucune tâche pour ce filtre.
                                </div>
                            )}
                        </div>
                    </section>

                    <aside className="space-y-5">
                        <div className="admin-card">
                            <div className="admin-card-body">
                                {selected ? (
                                    <>
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div>
                                                <div className="admin-section-eyebrow">
                                                    {selected.reference}
                                                </div>
                                                <h2 className="admin-section-title text-[20px]">
                                                    {selected.titre}
                                                </h2>
                                                <p className="admin-section-desc mb-0">
                                                    {selected.lieu ||
                                                        'Lieu non précisé'}
                                                </p>
                                            </div>
                                            <span
                                                className={badgeClass(selected)}
                                            >
                                                {statusLabel[selected.statut] ??
                                                    selected.statut}
                                            </span>
                                        </div>

                                        {selected.statut === 'a_faire' && (
                                            <div className="grid gap-4">
                                                <form
                                                    onSubmit={complete}
                                                    className="rounded-lg border border-[#dfe6dc] bg-[#fbfaf7] p-4"
                                                >
                                                    <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#17352a]">
                                                        <Check size={16} />{' '}
                                                        Marquer faite
                                                    </div>
                                                    <div className="admin-form-grid">
                                                        <div className="admin-field">
                                                            <label>
                                                                Quantité
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.0001"
                                                                value={
                                                                    completeForm
                                                                        .data
                                                                        .quantite
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    completeForm.setData(
                                                                        'quantite',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <p className="admin-form-hint">
                                                                Facultatif :
                                                                quantité
                                                                réellement
                                                                exécutée.
                                                            </p>
                                                        </div>
                                                        <div className="admin-field">
                                                            <label>Unité</label>
                                                            <input
                                                                value={
                                                                    completeForm
                                                                        .data
                                                                        .unite
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    completeForm.setData(
                                                                        'unite',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <p className="admin-form-hint">
                                                                Ex : planches,
                                                                kg, litres,
                                                                passage.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="admin-field mt-3">
                                                        <label>
                                                            Commentaire
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={
                                                                completeForm
                                                                    .data
                                                                    .commentaire
                                                            }
                                                            onChange={(event) =>
                                                                completeForm.setData(
                                                                    'commentaire',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                        <p className="admin-form-hint">
                                                            Note visible dans
                                                            l’historique de la
                                                            tâche.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        className="admin-btn-submit mt-3"
                                                        disabled={
                                                            completeForm.processing
                                                        }
                                                    >
                                                        Enregistrer
                                                    </button>
                                                </form>

                                                {motifs.length > 0 ? (
                                                    <form
                                                        onSubmit={justify}
                                                        className="rounded-lg border border-[#eadbc0] bg-[#fffaf0] p-4"
                                                    >
                                                        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#8a6020]">
                                                            <FileClock
                                                                size={16}
                                                            />{' '}
                                                            Justifier non faite
                                                        </div>
                                                        <div className="admin-field">
                                                            <label>Motif</label>
                                                            <select
                                                                value={
                                                                    justifyForm
                                                                        .data
                                                                        .motif_id
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    justifyForm.setData(
                                                                        'motif_id',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                required
                                                            >
                                                                {motifs.map(
                                                                    (motif) => (
                                                                        <option
                                                                            key={
                                                                                motif.id
                                                                            }
                                                                            value={
                                                                                motif.id
                                                                            }
                                                                        >
                                                                            {
                                                                                motif.libelle
                                                                            }
                                                                            {motif.recevable
                                                                                ? ''
                                                                                : ' · RH'}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                            <p className="admin-form-hint">
                                                                Les motifs
                                                                marqués RH
                                                                ouvrent une
                                                                référence
                                                                disciplinaire.
                                                            </p>
                                                        </div>
                                                        <div className="admin-field mt-3">
                                                            <label>
                                                                Preuve /
                                                                précision
                                                            </label>
                                                            <input
                                                                value={
                                                                    justifyForm
                                                                        .data
                                                                        .motif_precision
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    justifyForm.setData(
                                                                        'motif_precision',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Bon de travail, article, nom hiérarchie..."
                                                            />
                                                            <p className="admin-form-hint">
                                                                Obligatoire si
                                                                le motif exige
                                                                une preuve.
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            className="admin-btn-submit mt-3"
                                                            disabled={
                                                                justifyForm.processing
                                                            }
                                                        >
                                                            Justifier
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-amber-900">
                                                        Ajoutez d’abord les
                                                        motifs de non-exécution
                                                        pour pouvoir justifier
                                                        une tâche.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {visibility.dossiersDisciplinaires &&
                                            selected.dde_statut ===
                                                'a_valider' && (
                                                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                                                    <div className="text-[13px] font-semibold text-red-900">
                                                        Dossier disciplinaire à
                                                        valider
                                                    </div>
                                                    <p className="mt-1 text-[13px] text-red-800">
                                                        Un supérieur distinct de
                                                        l’intéressé doit
                                                        confirmer ou requalifier
                                                        ce motif.
                                                    </p>
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="admin-btn-submit"
                                                            onClick={
                                                                validateDde
                                                            }
                                                            disabled={
                                                                ddeForm.processing
                                                            }
                                                        >
                                                            Confirmer la DDE
                                                        </button>
                                                    </div>
                                                    <form
                                                        onSubmit={requalifyDde}
                                                        className="mt-3 flex gap-2"
                                                    >
                                                        <input
                                                            className="min-w-0 flex-1 rounded-md border border-red-200 px-3 py-2 text-sm"
                                                            value={
                                                                ddeForm.data
                                                                    .observation
                                                            }
                                                            onChange={(event) =>
                                                                ddeForm.setData(
                                                                    'observation',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Motif de requalification"
                                                            required
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="admin-btn-secondary"
                                                            disabled={
                                                                ddeForm.processing
                                                            }
                                                        >
                                                            Requalifier
                                                        </button>
                                                    </form>
                                                </div>
                                            )}

                                        {selected.evenements.length > 0 && (
                                            <div className="mt-5">
                                                <div className="admin-sidebar-section-label px-0">
                                                    Derniers événements
                                                </div>
                                                <div className="space-y-2">
                                                    {selected.evenements.map(
                                                        (event) => (
                                                            <div
                                                                key={event.id}
                                                                className="rounded-lg border border-[#e5e0d6] bg-[#fbfaf7] p-3 text-[13px]"
                                                            >
                                                                <div className="font-semibold text-[#17352a]">
                                                                    {
                                                                        event.resume
                                                                    }
                                                                </div>
                                                                <div className="mt-1 text-[12px] text-[#7a857e]">
                                                                    {
                                                                        event.user_nom
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {formatDateTime(
                                                                        event.created_at,
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="admin-empty">
                                        Sélectionnez une tâche.
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={closeDay} className="admin-form-panel">
                            <div className="mb-4 flex items-center gap-2 text-[14px] font-semibold text-[#17352a]">
                                <Lock size={17} /> Clôture journalière
                            </div>
                            <div className="admin-form-grid">
                                <div className="admin-field">
                                    <label>Site</label>
                                    <select
                                        value={closeForm.data.site_id}
                                        onChange={(event) =>
                                            closeForm.setData(
                                                'site_id',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    >
                                        {sites.map((site) => (
                                            <option
                                                key={site.id}
                                                value={site.id}
                                            >
                                                {site.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-field">
                                    <label>Département</label>
                                    <select
                                        value={closeForm.data.departement_id}
                                        onChange={(event) =>
                                            closeForm.setData(
                                                'departement_id',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    >
                                        {departements.map((departement) => (
                                            <option
                                                key={departement.id}
                                                value={departement.id}
                                            >
                                                {departement.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="admin-field mt-3">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={closeForm.data.date}
                                    onChange={(event) =>
                                        closeForm.setData(
                                            'date',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                            <div className="admin-field mt-3">
                                <label>Observation</label>
                                <textarea
                                    rows={2}
                                    value={closeForm.data.observation}
                                    onChange={(event) =>
                                        closeForm.setData(
                                            'observation',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            <button
                                type="submit"
                                className="admin-btn-submit mt-3"
                                disabled={
                                    closeForm.processing ||
                                    sites.length === 0 ||
                                    departements.length === 0
                                }
                            >
                                Clôturer
                            </button>
                        </form>

                        {visibility.journalAudit && (
                            <div className="admin-card">
                                <div className="admin-card-body">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="admin-section-eyebrow">
                                                Audit
                                            </div>
                                            <h2 className="admin-section-title text-[20px]">
                                                Traçabilité
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            className="admin-btn-icon"
                                            onClick={reloadSeededReferences}
                                            title="Recharger"
                                        >
                                            <Clock size={15} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {audit.slice(0, 8).map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-lg border border-[#e5e0d6] bg-[#fbfaf7] p-3 text-[13px]"
                                            >
                                                <div className="flex items-center gap-2 font-semibold text-[#17352a]">
                                                    <FileText size={14} />{' '}
                                                    {entry.resume ??
                                                        entry.action}
                                                </div>
                                                <div className="mt-1 text-[12px] text-[#7a857e]">
                                                    {entry.user_nom} ·{' '}
                                                    {formatDateTime(
                                                        entry.created_at,
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {audit.length === 0 && (
                                            <div className="admin-empty py-8">
                                                Aucune entrée d’audit.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </AdminLayout>
    );
}
