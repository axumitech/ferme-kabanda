/**
 * FKN — Carnet terrain P6.
 *
 * Le carnet est délibérément compact pour l'écran d'un téléphone : les données
 * sont d'abord gardées dans IndexedDB, puis synchronisées au retour du réseau.
 * Voir le registre de l'équipe ne donne jamais le droit d'agir à sa place.
 */

import {
    AlertTriangle,
    Check,
    CheckCircle2,
    ClipboardList,
    CloudOff,
    CloudUpload,
    Leaf,
    LoaderCircle,
    MapPin,
    RefreshCw,
    ShieldAlert,
    Sprout,
    Users,
    Wifi,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    createTerrainUuid,
    createTerrainCache,
    terrainDeviceId,
} from '@/lib/terrain-cache';
import type {
    TerrainJournalEntry,
    TerrainQueueItem,
    TerrainRecordType,
    TerrainSnapshot,
    TerrainTask,
} from '@/lib/terrain-cache';

type Tab = 'taches' | 'ferme' | 'recolte' | 'incident';
type TaskFilter = 'moi' | 'equipe';
type TaskAction = {
    task: TerrainTask;
    type: 'tache_faite' | 'tache_non_faite';
} | null;
type SyncResult = { uuid: string; accepte: boolean; message: string };
type ReferenceResponse = Omit<TerrainSnapshot, 'synchroniseLe'>;

const tabs: Array<{ key: Tab; label: string; Icon: LucideIcon }> = [
    { key: 'taches', label: 'Tâches', Icon: ClipboardList },
    { key: 'ferme', label: 'La ferme', Icon: Users },
    { key: 'recolte', label: 'Récolte', Icon: Leaf },
    { key: 'incident', label: 'Problème', Icon: ShieldAlert },
];

const currentDate = (): string => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

    return local.toISOString().slice(0, 10);
};

const currentDateTime = (): string => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

    return local.toISOString().slice(0, 16);
};

const formatDate = (value: string | null): string => {
    if (!value) {
        return 'Date non précisée';
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
    }).format(new Date(`${value}T12:00:00`));
};

const formatTime = (value: string): string =>
    new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));

const csrfToken = (): string =>
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.content ?? '';

const taskStatus = (task: TerrainTask): string => {
    if (task.saisie_locale?.erreur) {
        return 'À corriger';
    }

    if (task.saisie_locale) {
        return 'En attente d’envoi';
    }

    return task.date_due && task.date_due < currentDate()
        ? 'En retard'
        : 'À faire';
};

const taskTone = (task: TerrainTask): string => {
    if (task.saisie_locale?.erreur) {
        return 'border-red-200 bg-red-50';
    }

    if (task.saisie_locale) {
        return 'border-amber-200 bg-amber-50';
    }

    return task.date_due && task.date_due < currentDate()
        ? 'border-red-200 bg-red-50/40'
        : 'border-emerald-100 bg-white';
};

const pendingForTask = (
    task: TerrainTask,
    items: TerrainQueueItem[],
): TerrainTask => {
    const pending = items.find(
        (item) =>
            (item.type === 'tache_faite' || item.type === 'tache_non_faite') &&
            Number(item.donnees.tache_id) === task.id,
    );

    if (!pending) {
        return task;
    }

    return {
        ...task,
        saisie_locale: {
            uuid: pending.uuid,
            type: pending.type,
            erreur: pending.erreur,
        },
    };
};

const snapshotWithPending = (
    snapshot: TerrainSnapshot,
    items: TerrainQueueItem[],
): TerrainSnapshot => ({
    ...snapshot,
    taches: snapshot.taches.map((task) => pendingForTask(task, items)),
});

function StatusBadge({ task }: { task: TerrainTask }) {
    const label = taskStatus(task);
    const style = task.saisie_locale?.erreur
        ? 'bg-red-100 text-red-700'
        : task.saisie_locale
          ? 'bg-amber-100 text-amber-800'
          : task.date_due && task.date_due < currentDate()
            ? 'bg-red-100 text-red-700'
            : 'bg-emerald-100 text-emerald-800';

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${style}`}
        >
            {label}
        </span>
    );
}

function JournalLine({ entry }: { entry: TerrainJournalEntry }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <span>{entry.categorie}</span>
                <span>{entry.heure ?? '—'}</span>
            </div>
            <p className="mt-2 font-bold text-slate-900">{entry.titre}</p>
            {entry.detail && (
                <p className="mt-1 text-sm text-slate-600">{entry.detail}</p>
            )}
            <p className="mt-3 text-xs font-medium text-slate-500">
                Consigné par {entry.par || '—'}
            </p>
        </article>
    );
}

export default function TerrainNotebook({ userId }: { userId: number }) {
    const cache = useMemo(() => createTerrainCache(userId), [userId]);
    const [snapshot, setSnapshot] = useState<TerrainSnapshot | null>(null);
    const [pending, setPending] = useState<TerrainQueueItem[]>([]);
    const [online, setOnline] = useState(() => navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('taches');
    const [filter, setFilter] = useState<TaskFilter>('moi');
    const [action, setAction] = useState<TaskAction>(null);
    const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
    const syncLock = useRef(false);
    const [completion, setCompletion] = useState({
        quantite: '',
        unite: '',
        commentaire: '',
    });
    const [justification, setJustification] = useState({
        motif_id: '',
        motif_precision: '',
    });
    const [harvest, setHarvest] = useState({
        plantation_id: '',
        date: currentDate(),
        quantite: '',
        unite: '',
        qualite: '',
        canal_commercial: '',
        pertes: '',
    });
    const [incident, setIncident] = useState({
        nature: 'securite',
        survenu_le: currentDateTime(),
        site_id: '',
        lieu: '',
        description: '',
        actions_immediates: '',
    });

    const refreshReference =
        useCallback(async (): Promise<TerrainSnapshot | null> => {
            if (!navigator.onLine) {
                return null;
            }

            const response = await fetch('/terrain/carnet/api/reference', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(
                    'Le registre de la ferme est momentanément indisponible.',
                );
            }

            const data = (await response.json()) as ReferenceResponse;
            const items = await cache.listPending();
            const next = snapshotWithPending(
                {
                    ...data,
                    synchroniseLe: new Date().toISOString(),
                },
                items,
            );
            await cache.writeSnapshot(next);
            setSnapshot(next);
            setPending(items);

            return next;
        }, [cache]);

    const synchronise = useCallback(async (): Promise<void> => {
        if (syncLock.current) {
            return;
        }

        if (!navigator.onLine) {
            setNotice(
                'Hors réseau : vos saisies restent en sécurité sur cet appareil.',
            );

            return;
        }

        const items = await cache.listPending();

        if (items.length === 0) {
            try {
                await refreshReference();
                setNotice('Le carnet est à jour.');
            } catch (error) {
                setNotice(
                    error instanceof Error
                        ? error.message
                        : 'Actualisation impossible.',
                );
            }

            return;
        }

        syncLock.current = true;
        setSyncing(true);
        setNotice(null);

        try {
            for (let position = 0; position < items.length; position += 200) {
                const batch = items.slice(position, position + 200);
                const response = await fetch(
                    '/terrain/carnet/api/synchroniser',
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken(),
                        },
                        body: JSON.stringify({ enregistrements: batch }),
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        'Le serveur n’a pas pu recevoir les saisies. Elles restent dans le carnet.',
                    );
                }

                const body = (await response.json()) as {
                    resultats?: SyncResult[];
                };

                for (const result of body.resultats ?? []) {
                    if (result.accepte) {
                        await cache.removePending(result.uuid);
                        const next = await cache.clearTaskPending(result.uuid);

                        if (next) {
                            setSnapshot(next);
                        }
                    } else {
                        const previous = (await cache.listPending()).find(
                            (item) => item.uuid === result.uuid,
                        );
                        await cache.updatePending(result.uuid, {
                            essais: (previous?.essais ?? 0) + 1,
                            erreur: result.message,
                        });
                        const next = await cache.updateTaskPendingError(
                            result.uuid,
                            result.message,
                        );

                        if (next) {
                            setSnapshot(next);
                        }
                    }
                }
            }

            const remaining = await cache.listPending();
            setPending(remaining);
            await refreshReference();
            setNotice(
                remaining.length === 0
                    ? 'Toutes les saisies ont été partagées avec la ferme.'
                    : `${remaining.length} saisie(s) demandent votre attention avant envoi.`,
            );
        } catch (error) {
            setPending(await cache.listPending());
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Synchronisation impossible pour le moment.',
            );
        } finally {
            syncLock.current = false;
            setSyncing(false);
        }
    }, [cache, refreshReference]);

    useEffect(() => {
        let mounted = true;

        const load = async (): Promise<void> => {
            const [cached, queued] = await Promise.all([
                cache.readSnapshot(),
                cache.listPending(),
            ]);

            if (!mounted) {
                return;
            }

            if (cached) {
                setSnapshot(snapshotWithPending(cached, queued));
            }

            setPending(queued);
            setLoading(false);

            if (navigator.onLine) {
                try {
                    await refreshReference();
                } catch {
                    // La copie locale, si elle existe, reste parfaitement lisible.
                }
            }
        };

        void load();

        return () => {
            mounted = false;
        };
    }, [cache, refreshReference]);

    useEffect(() => {
        const goOnline = () => {
            setOnline(true);
            void synchronise();
        };
        const goOffline = () => setOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [synchronise]);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) =>
                setGps({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                }),
            () => undefined,
            { timeout: 8000, maximumAge: 600_000 },
        );
    }, []);

    const queue = useCallback(
        async (
            type: TerrainRecordType,
            donnees: Record<string, unknown>,
            taskId?: number,
        ): Promise<void> => {
            const item: TerrainQueueItem = {
                uuid: createTerrainUuid(),
                type,
                donnees,
                appareil: terrainDeviceId(userId),
                saisi_le: new Date().toISOString(),
                gps,
                essais: 0,
            };
            await cache.enqueue(item);

            if (taskId) {
                const next = await cache.markTaskPending(
                    item.uuid,
                    taskId,
                    type,
                );

                if (next) {
                    setSnapshot(next);
                }
            }

            setPending(await cache.listPending());
            setNotice(
                'Saisie gardée dans le carnet : elle sera visible aux collègues après synchronisation.',
            );

            if (navigator.onLine) {
                void synchronise();
            }
        },
        [cache, gps, synchronise, userId],
    );

    const visibleTasks = useMemo(() => {
        if (!snapshot) {
            return [];
        }

        return snapshot.taches.filter(
            (task) => filter === 'equipe' || task.mienne,
        );
    }, [filter, snapshot]);

    const submitCompletion = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (!action || action.type !== 'tache_faite') {
            return;
        }

        await queue(
            'tache_faite',
            {
                tache_id: action.task.id,
                quantite:
                    completion.quantite === ''
                        ? null
                        : Number(completion.quantite),
                unite: completion.unite || null,
                commentaire: completion.commentaire || null,
            },
            action.task.id,
        );
        setCompletion({ quantite: '', unite: '', commentaire: '' });
        setAction(null);
    };

    const submitJustification = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (
            !action ||
            action.type !== 'tache_non_faite' ||
            !justification.motif_id
        ) {
            return;
        }

        await queue(
            'tache_non_faite',
            {
                tache_id: action.task.id,
                motif_id: Number(justification.motif_id),
                motif_precision: justification.motif_precision || null,
            },
            action.task.id,
        );
        setJustification({ motif_id: '', motif_precision: '' });
        setAction(null);
    };

    const submitHarvest = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (
            !harvest.plantation_id ||
            !harvest.quantite ||
            !harvest.canal_commercial
        ) {
            setNotice(
                'Choisissez la plantation, la quantité et la destination de la récolte.',
            );

            return;
        }

        await queue('recolte', {
            plantation_id: Number(harvest.plantation_id),
            date: harvest.date,
            quantite: Number(harvest.quantite),
            unite: harvest.unite || null,
            qualite: harvest.qualite || null,
            canal_commercial: harvest.canal_commercial,
            pertes: harvest.pertes === '' ? null : Number(harvest.pertes),
        });
        setHarvest({
            plantation_id: '',
            date: currentDate(),
            quantite: '',
            unite: '',
            qualite: '',
            canal_commercial: '',
            pertes: '',
        });
        setTab('ferme');
    };

    const submitIncident = async (
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault();

        if (!incident.description.trim()) {
            setNotice('Décrivez le problème pour pouvoir le signaler.');

            return;
        }

        await queue('incident', {
            nature: incident.nature,
            survenu_le: incident.survenu_le,
            site_id: incident.site_id ? Number(incident.site_id) : null,
            lieu: incident.lieu || null,
            description: incident.description.trim(),
            actions_immediates: incident.actions_immediates || null,
        });
        setIncident({
            nature: 'securite',
            survenu_le: currentDateTime(),
            site_id: '',
            lieu: '',
            description: '',
            actions_immediates: '',
        });
        setTab('ferme');
    };

    const selectPlantation = (plantationId: string): void => {
        const plantation = snapshot?.reference.plantations.find(
            (item) => item.id === Number(plantationId),
        );
        setHarvest((current) => ({
            ...current,
            plantation_id: plantationId,
            unite: plantation?.unite ?? current.unite,
        }));
    };

    const taskCounts = useMemo(() => {
        const tasks = snapshot?.taches ?? [];

        return {
            mine: tasks.filter((task) => task.mienne).length,
            team: tasks.length,
        };
    }, [snapshot]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f5f7f4] p-5 text-slate-800">
                <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
                    <LoaderCircle className="size-5 animate-spin text-emerald-700" />
                    <span className="font-semibold">
                        Ouverture du carnet terrain…
                    </span>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f5f7f4] pb-10 text-slate-800">
            <header className="bg-[#174a31] px-4 pt-6 pb-5 text-white shadow-lg sm:px-6">
                <div className="mx-auto max-w-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/15">
                                <Sprout className="size-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold tracking-[0.18em] text-emerald-100 uppercase">
                                    Ferme Kabanda Naweza
                                </p>
                                <h1 className="mt-1 text-xl font-extrabold">
                                    Carnet terrain
                                </h1>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => void synchronise()}
                            disabled={syncing}
                            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-bold transition hover:bg-white/20 disabled:opacity-60"
                        >
                            {syncing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <RefreshCw className="size-4" />
                            )}
                            Sync
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-50">
                        {online ? (
                            <Wifi className="size-4" />
                        ) : (
                            <CloudOff className="size-4" />
                        )}
                        <span>
                            {online
                                ? 'Connecté — les nouvelles saisies seront envoyées.'
                                : 'Hors réseau — la saisie continue normalement.'}
                        </span>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
                {notice && (
                    <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <p>{notice}</p>
                    </div>
                )}

                <nav
                    aria-label="Sections du carnet"
                    className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-2 shadow-sm"
                >
                    {tabs.map(({ key, label, Icon }) => {
                        const active = tab === key;

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTab(key)}
                                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition ${active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Icon className="size-4" />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </nav>

                {!snapshot ? (
                    <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                        <CloudOff className="mx-auto size-8 text-slate-400" />
                        <h2 className="mt-3 font-bold text-slate-800">
                            Aucune copie locale disponible
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Connectez-vous une fois pour charger le carnet, puis
                            il restera lisible hors ligne.
                        </p>
                    </section>
                ) : (
                    <>
                        {tab === 'taches' && (
                            <section className="mt-5">
                                <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
                                    <p className="font-bold">
                                        Le registre est partagé.
                                    </p>
                                    <p className="mt-1">
                                        Vous voyez les tâches de l’équipe.
                                        Seules les vôtres ont des boutons
                                        d’exécution.
                                    </p>
                                </div>

                                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setFilter('moi')}
                                        className={`min-h-11 rounded-xl text-sm font-bold ${filter === 'moi' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Mes tâches ({taskCounts.mine})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilter('equipe')}
                                        className={`min-h-11 rounded-xl text-sm font-bold ${filter === 'equipe' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        Toute l’équipe ({taskCounts.team})
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {visibleTasks.map((task) => (
                                        <article
                                            key={task.id}
                                            className={`rounded-2xl border p-4 shadow-sm ${taskTone(task)}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                                        {task.reference}
                                                    </p>
                                                    <h2 className="mt-1 font-extrabold text-slate-900">
                                                        {task.titre}
                                                    </h2>
                                                </div>
                                                <StatusBadge task={task} />
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                                                <span>
                                                    {formatDate(task.date_due)}
                                                    {task.heure_due
                                                        ? ` · ${task.heure_due}`
                                                        : ''}
                                                </span>
                                                {(task.lieu ||
                                                    task.site?.nom) && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="size-3.5" />
                                                        {task.lieu ||
                                                            task.site?.nom}
                                                    </span>
                                                )}
                                            </div>
                                            {task.instruction && (
                                                <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm leading-relaxed text-slate-700">
                                                    <strong>Consigne :</strong>{' '}
                                                    {task.instruction}
                                                </p>
                                            )}

                                            {!task.can_act ? (
                                                <p className="mt-3 text-sm font-medium text-slate-600">
                                                    Responsable :{' '}
                                                    <strong>
                                                        {task.responsable ??
                                                            'Non attribuée'}
                                                    </strong>{' '}
                                                    — vous la voyez, cette
                                                    personne la clôture.
                                                </p>
                                            ) : task.saisie_locale ? (
                                                <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-sm text-amber-950">
                                                    <p className="font-bold">
                                                        Votre réponse est gardée
                                                        sur cet appareil.
                                                    </p>
                                                    {task.saisie_locale
                                                        .erreur ? (
                                                        <p className="mt-1">
                                                            À corriger :{' '}
                                                            {
                                                                task
                                                                    .saisie_locale
                                                                    .erreur
                                                            }
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1">
                                                            Elle sera visible
                                                            par les autres dès
                                                            la synchronisation.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-4 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setAction({
                                                                task,
                                                                type: 'tache_faite',
                                                            })
                                                        }
                                                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                                                    >
                                                        <Check className="size-4" />{' '}
                                                        C’est fait
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setAction({
                                                                task,
                                                                type: 'tache_non_faite',
                                                            })
                                                        }
                                                        className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Pas fait
                                                    </button>
                                                </div>
                                            )}

                                            {action?.task.id === task.id &&
                                                action.type ===
                                                    'tache_faite' && (
                                                    <form
                                                        onSubmit={
                                                            submitCompletion
                                                        }
                                                        className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-white p-4"
                                                    >
                                                        <p className="font-bold text-emerald-900">
                                                            Confirmer
                                                            l’exécution
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <label className="grid gap-1 text-xs font-bold text-slate-600">
                                                                Quantité
                                                                <input
                                                                    inputMode="decimal"
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.0001"
                                                                    value={
                                                                        completion.quantite
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setCompletion(
                                                                            {
                                                                                ...completion,
                                                                                quantite:
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="min-h-11 rounded-xl border border-slate-300 px-3 text-base"
                                                                />
                                                            </label>
                                                            <label className="grid gap-1 text-xs font-bold text-slate-600">
                                                                Unité
                                                                <input
                                                                    value={
                                                                        completion.unite
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setCompletion(
                                                                            {
                                                                                ...completion,
                                                                                unite: event
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    placeholder="kg, planches…"
                                                                    className="min-h-11 rounded-xl border border-slate-300 px-3 text-base"
                                                                />
                                                            </label>
                                                        </div>
                                                        <label className="grid gap-1 text-xs font-bold text-slate-600">
                                                            Commentaire
                                                            <textarea
                                                                rows={2}
                                                                value={
                                                                    completion.commentaire
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setCompletion(
                                                                        {
                                                                            ...completion,
                                                                            commentaire:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded-xl border border-slate-300 p-3 text-base"
                                                            />
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                className="min-h-11 flex-1 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white"
                                                            >
                                                                Enregistrer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setAction(
                                                                        null,
                                                                    )
                                                                }
                                                                className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-600"
                                                            >
                                                                Annuler
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}

                                            {action?.task.id === task.id &&
                                                action.type ===
                                                    'tache_non_faite' && (
                                                    <form
                                                        onSubmit={
                                                            submitJustification
                                                        }
                                                        className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-white p-4"
                                                    >
                                                        <p className="font-bold text-amber-900">
                                                            Justifier la
                                                            non-exécution
                                                        </p>
                                                        <label className="grid gap-1 text-xs font-bold text-slate-600">
                                                            Motif
                                                            <select
                                                                required
                                                                value={
                                                                    justification.motif_id
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setJustification(
                                                                        {
                                                                            ...justification,
                                                                            motif_id:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                className="min-h-11 rounded-xl border border-slate-300 px-3 text-base"
                                                            >
                                                                <option value="">
                                                                    Choisir un
                                                                    motif
                                                                </option>
                                                                {snapshot.reference.motifs.map(
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
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </label>
                                                        <label className="grid gap-1 text-xs font-bold text-slate-600">
                                                            Précision / preuve
                                                            <textarea
                                                                rows={2}
                                                                value={
                                                                    justification.motif_precision
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setJustification(
                                                                        {
                                                                            ...justification,
                                                                            motif_precision:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded-xl border border-slate-300 p-3 text-base"
                                                            />
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                className="min-h-11 flex-1 rounded-xl bg-amber-600 px-3 text-sm font-bold text-white"
                                                            >
                                                                Enregistrer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setAction(
                                                                        null,
                                                                    )
                                                                }
                                                                className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-600"
                                                            >
                                                                Annuler
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                        </article>
                                    ))}
                                    {visibleTasks.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-600">
                                            Aucune tâche ouverte dans cette vue.
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {tab === 'ferme' && (
                            <section className="mt-5">
                                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                                    <p className="font-bold">
                                        Aujourd’hui à la ferme
                                    </p>
                                    <p className="mt-1">
                                        Mis à jour à{' '}
                                        {formatTime(snapshot.synchroniseLe)}.{' '}
                                        {pending.length > 0
                                            ? `${pending.length} de vos saisies ne sont pas encore visibles par les autres.`
                                            : 'Toutes vos saisies ont été envoyées.'}
                                    </p>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {snapshot.journee.map((entry, index) => (
                                        <JournalLine
                                            key={`${entry.heure}-${entry.titre}-${index}`}
                                            entry={entry}
                                        />
                                    ))}
                                    {snapshot.journee.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-600">
                                            Rien de consigné aujourd’hui pour
                                            l’instant. Synchronisez pour voir le
                                            travail de l’équipe.
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {tab === 'recolte' && (
                            <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                                        <Leaf className="size-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-extrabold text-slate-900">
                                            Enregistrer une récolte
                                        </h2>
                                        <p className="text-sm text-slate-600">
                                            La destination est obligatoire pour
                                            garder la marge traçable.
                                        </p>
                                    </div>
                                </div>
                                <form
                                    onSubmit={submitHarvest}
                                    className="mt-5 space-y-4"
                                >
                                    <label className="grid gap-1 text-sm font-bold text-slate-700">
                                        Plantation
                                        <select
                                            required
                                            value={harvest.plantation_id}
                                            onChange={(event) =>
                                                selectPlantation(
                                                    event.target.value,
                                                )
                                            }
                                            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
                                        >
                                            <option value="">
                                                Choisir une plantation
                                            </option>
                                            {snapshot.reference.plantations.map(
                                                (plantation) => (
                                                    <option
                                                        key={plantation.id}
                                                        value={plantation.id}
                                                    >
                                                        {plantation.libelle}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Date
                                            <input
                                                required
                                                type="date"
                                                value={harvest.date}
                                                onChange={(event) =>
                                                    setHarvest({
                                                        ...harvest,
                                                        date: event.target
                                                            .value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Quantité
                                            <input
                                                required
                                                inputMode="decimal"
                                                min="0.01"
                                                step="0.01"
                                                type="number"
                                                value={harvest.quantite}
                                                onChange={(event) =>
                                                    setHarvest({
                                                        ...harvest,
                                                        quantite:
                                                            event.target.value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Unité
                                            <input
                                                value={harvest.unite}
                                                onChange={(event) =>
                                                    setHarvest({
                                                        ...harvest,
                                                        unite: event.target
                                                            .value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Qualité
                                            <input
                                                value={harvest.qualite}
                                                onChange={(event) =>
                                                    setHarvest({
                                                        ...harvest,
                                                        qualite:
                                                            event.target.value,
                                                    })
                                                }
                                                placeholder="A, B…"
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                    </div>
                                    <label className="grid gap-1 text-sm font-bold text-slate-700">
                                        Destination
                                        <select
                                            required
                                            value={harvest.canal_commercial}
                                            onChange={(event) =>
                                                setHarvest({
                                                    ...harvest,
                                                    canal_commercial:
                                                        event.target.value,
                                                })
                                            }
                                            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
                                        >
                                            <option value="">
                                                Choisir une destination
                                            </option>
                                            {snapshot.reference.canaux_recolte.map(
                                                (canal) => (
                                                    <option
                                                        key={canal}
                                                        value={canal}
                                                    >
                                                        {canal}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <label className="grid gap-1 text-sm font-bold text-slate-700">
                                        Pertes éventuelles
                                        <input
                                            inputMode="decimal"
                                            min="0"
                                            step="0.01"
                                            type="number"
                                            value={harvest.pertes}
                                            onChange={(event) =>
                                                setHarvest({
                                                    ...harvest,
                                                    pertes: event.target.value,
                                                })
                                            }
                                            className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                                    >
                                        <CloudUpload className="size-4" />{' '}
                                        Enregistrer la récolte
                                    </button>
                                </form>
                            </section>
                        )}

                        {tab === 'incident' && (
                            <section className="mt-5 rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-800">
                                        <ShieldAlert className="size-5" />
                                    </div>
                                    <div>
                                        <h2 className="font-extrabold text-slate-900">
                                            Signaler un problème
                                        </h2>
                                        <p className="text-sm text-slate-600">
                                            Décrivez les faits et les premières
                                            mesures prises.
                                        </p>
                                    </div>
                                </div>
                                <form
                                    onSubmit={submitIncident}
                                    className="mt-5 space-y-4"
                                >
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Nature
                                            <select
                                                value={incident.nature}
                                                onChange={(event) =>
                                                    setIncident({
                                                        ...incident,
                                                        nature: event.target
                                                            .value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
                                            >
                                                {snapshot.reference.natures_incident.map(
                                                    (nature) => (
                                                        <option
                                                            key={nature.value}
                                                            value={nature.value}
                                                        >
                                                            {nature.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Moment
                                            <input
                                                required
                                                type="datetime-local"
                                                value={incident.survenu_le}
                                                onChange={(event) =>
                                                    setIncident({
                                                        ...incident,
                                                        survenu_le:
                                                            event.target.value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Site
                                            <select
                                                value={incident.site_id}
                                                onChange={(event) =>
                                                    setIncident({
                                                        ...incident,
                                                        site_id:
                                                            event.target.value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-base"
                                            >
                                                <option value="">
                                                    Non précisé
                                                </option>
                                                {snapshot.reference.sites.map(
                                                    (site) => (
                                                        <option
                                                            key={site.id}
                                                            value={site.id}
                                                        >
                                                            {site.libelle}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                        <label className="grid gap-1 text-sm font-bold text-slate-700">
                                            Lieu
                                            <input
                                                value={incident.lieu}
                                                onChange={(event) =>
                                                    setIncident({
                                                        ...incident,
                                                        lieu: event.target
                                                            .value,
                                                    })
                                                }
                                                className="min-h-12 rounded-xl border border-slate-300 px-3 text-base"
                                            />
                                        </label>
                                    </div>
                                    <label className="grid gap-1 text-sm font-bold text-slate-700">
                                        Que s’est-il passé ?
                                        <textarea
                                            required
                                            rows={4}
                                            value={incident.description}
                                            onChange={(event) =>
                                                setIncident({
                                                    ...incident,
                                                    description:
                                                        event.target.value,
                                                })
                                            }
                                            className="rounded-xl border border-slate-300 p-3 text-base"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-sm font-bold text-slate-700">
                                        Actions immédiates
                                        <textarea
                                            rows={3}
                                            value={incident.actions_immediates}
                                            onChange={(event) =>
                                                setIncident({
                                                    ...incident,
                                                    actions_immediates:
                                                        event.target.value,
                                                })
                                            }
                                            className="rounded-xl border border-slate-300 p-3 text-base"
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-800"
                                    >
                                        <ShieldAlert className="size-4" />{' '}
                                        Signaler le problème
                                    </button>
                                </form>
                            </section>
                        )}
                    </>
                )}

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600 shadow-sm">
                    <div className="flex items-start gap-2">
                        {pending.length > 0 ? (
                            <CloudOff className="mt-0.5 size-4 shrink-0 text-amber-700" />
                        ) : (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                        )}
                        <p>
                            <strong>
                                {pending.length > 0
                                    ? `${pending.length} saisie(s) privée(s) en attente.`
                                    : 'Carnet synchronisé.'}
                            </strong>{' '}
                            Une saisie hors réseau n’est visible que sur votre
                            téléphone tant qu’elle n’est pas envoyée. Le journal
                            « La ferme » est la dernière copie synchronisée de
                            l’équipe.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}
