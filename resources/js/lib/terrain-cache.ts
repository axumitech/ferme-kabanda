/**
 * FKN — Carnet terrain P6
 *
 * Le cache est séparé de la file générique de l'application : une saisie de
 * terrain possède son UUID métier, indispensable pour un rejeu sans doublon.
 * IndexedDB garde le paquet de référence, le journal du jour et la file même
 * après la fermeture complète du navigateur.
 */

export type TerrainTask = {
    id: number;
    reference: string;
    titre: string;
    lieu: string | null;
    instruction: string | null;
    date_due: string | null;
    heure_due: string | null;
    statut: string;
    responsable: string | null;
    site: { code: string; nom: string } | null;
    departement: { code: string; nom: string } | null;
    mienne: boolean;
    can_act: boolean;
    saisie_locale?: {
        uuid: string;
        type: TerrainRecordType;
        erreur?: string;
    };
};

export type TerrainJournalEntry = {
    heure: string | null;
    categorie: string;
    titre: string;
    detail: string | null;
    par: string;
};

export type TerrainReference = {
    sites: Array<{ id: number; libelle: string }>;
    plantations: Array<{ id: number; libelle: string; unite: string }>;
    motifs: Array<{
        id: number;
        code: string;
        libelle: string;
        recevable: boolean;
        preuve_requise: string;
    }>;
    canaux_recolte: string[];
    natures_incident: Array<{ value: string; label: string }>;
};

export type TerrainSnapshot = {
    jeton: string;
    reference: TerrainReference;
    taches: TerrainTask[];
    journee: TerrainJournalEntry[];
    synchroniseLe: string;
};

export type TerrainRecordType =
    'tache_faite' | 'tache_non_faite' | 'recolte' | 'incident';

export type TerrainQueueItem = {
    uuid: string;
    type: TerrainRecordType;
    donnees: Record<string, unknown>;
    appareil: string;
    saisi_le: string;
    gps: { lat: number; lon: number } | null;
    essais: number;
    erreur?: string;
};

const DATABASE_PREFIX = 'fkn-carnet-terrain-v2';
const VERSION = 1;
const SNAPSHOT_STORE = 'snapshot';
const OUTBOX_STORE = 'outbox';

const canUseIndexedDb = () =>
    typeof window !== 'undefined' && 'indexedDB' in window;

/**
 * Le navigateur est souvent partagé sur le terrain. Les données hors ligne
 * doivent donc appartenir à une session utilisateur précise, et non au
 * navigateur entier. Les anciennes clés v1 ne sont volontairement jamais
 * relues : elles ne portaient aucun propriétaire vérifiable.
 */
const userScope = (userId: number): string => {
    if (!Number.isSafeInteger(userId) || userId < 1) {
        throw new Error('Identifiant utilisateur terrain invalide.');
    }

    return `u${userId}`;
};

const parseJson = <T>(value: string | null, fallback: T): T => {
    try {
        return value ? (JSON.parse(value) as T) : fallback;
    } catch {
        return fallback;
    }
};

const fallbackGet = <T>(key: string, fallback: T): T => {
    try {
        return parseJson<T>(localStorage.getItem(key), fallback);
    } catch {
        return fallback;
    }
};

const fallbackSet = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Les modes privés peuvent interdire le stockage. Le carnet reste
        // utilisable pendant la session, mais le navigateur l'indiquera alors.
    }
};

const openDatabase = (databaseName: string): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName, VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
                database.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
            }

            if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
                database.createObjectStore(OUTBOX_STORE, { keyPath: 'uuid' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const idbGet = async <T>(
    databaseName: string,
    storeName: string,
    key: IDBValidKey,
): Promise<T | null> => {
    const database = await openDatabase(databaseName);

    return new Promise((resolve, reject) => {
        const request = database
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .get(key);
        request.onsuccess = () =>
            resolve((request.result as T | undefined) ?? null);
        request.onerror = () => reject(request.error);
    });
};

const idbGetAll = async <T>(
    databaseName: string,
    storeName: string,
): Promise<T[]> => {
    const database = await openDatabase(databaseName);

    return new Promise((resolve, reject) => {
        const request = database
            .transaction(storeName, 'readonly')
            .objectStore(storeName)
            .getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
    });
};

const idbPut = async (
    databaseName: string,
    storeName: string,
    value: unknown,
): Promise<void> => {
    const database = await openDatabase(databaseName);

    await new Promise<void>((resolve, reject) => {
        const request = database
            .transaction(storeName, 'readwrite')
            .objectStore(storeName)
            .put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const idbDelete = async (
    databaseName: string,
    storeName: string,
    key: IDBValidKey,
): Promise<void> => {
    const database = await openDatabase(databaseName);

    await new Promise<void>((resolve, reject) => {
        const request = database
            .transaction(storeName, 'readwrite')
            .objectStore(storeName)
            .delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export type TerrainCache = {
    readSnapshot: () => Promise<TerrainSnapshot | null>;
    writeSnapshot: (snapshot: TerrainSnapshot) => Promise<void>;
    enqueue: (item: TerrainQueueItem) => Promise<void>;
    listPending: () => Promise<TerrainQueueItem[]>;
    removePending: (uuid: string) => Promise<void>;
    updatePending: (
        uuid: string,
        changes: Partial<Pick<TerrainQueueItem, 'essais' | 'erreur'>>,
    ) => Promise<void>;
    markTaskPending: (
        uuid: string,
        taskId: number,
        type: TerrainRecordType,
    ) => Promise<TerrainSnapshot | null>;
    updateTaskPendingError: (
        uuid: string,
        erreur: string,
    ) => Promise<TerrainSnapshot | null>;
    clearTaskPending: (uuid: string) => Promise<TerrainSnapshot | null>;
};

export const createTerrainCache = (userId: number): TerrainCache => {
    const scope = userScope(userId);
    const databaseName = `${DATABASE_PREFIX}-${scope}`;
    const snapshotKey = 'reference-du-jour';
    const fallbackSnapshotKey = `fkn.carnet.${scope}.snapshot.v2`;
    const fallbackOutboxKey = `fkn.carnet.${scope}.outbox.v2`;

    const listPending = async (): Promise<TerrainQueueItem[]> => {
        const fallback = fallbackGet<TerrainQueueItem[]>(fallbackOutboxKey, []);

        if (!canUseIndexedDb()) {
            return fallback;
        }

        try {
            const indexed = await idbGetAll<TerrainQueueItem>(
                databaseName,
                OUTBOX_STORE,
            );
            const items = fallback.length > 0 ? fallback : indexed;

            return items.sort((left, right) =>
                left.saisi_le.localeCompare(right.saisi_le),
            );
        } catch {
            return fallback;
        }
    };

    const writeSnapshot = async (snapshot: TerrainSnapshot): Promise<void> => {
        fallbackSet(fallbackSnapshotKey, snapshot);

        if (!canUseIndexedDb()) {
            return;
        }

        try {
            await idbPut(databaseName, SNAPSHOT_STORE, {
                key: snapshotKey,
                value: snapshot,
            });
        } catch {
            // La copie localStorage déjà écrite sert de repli.
        }
    };

    return {
        async readSnapshot(): Promise<TerrainSnapshot | null> {
            const fallback = fallbackGet<TerrainSnapshot | null>(
                fallbackSnapshotKey,
                null,
            );

            if (!canUseIndexedDb()) {
                return fallback;
            }

            try {
                const record = await idbGet<{
                    key: string;
                    value: TerrainSnapshot;
                }>(databaseName, SNAPSHOT_STORE, snapshotKey);

                return fallback ?? record?.value ?? null;
            } catch {
                return fallback;
            }
        },

        writeSnapshot,

        async enqueue(item: TerrainQueueItem): Promise<void> {
            const items = await listPending();
            const next = [
                ...items.filter((pending) => pending.uuid !== item.uuid),
                item,
            ];
            fallbackSet(fallbackOutboxKey, next);

            if (!canUseIndexedDb()) {
                return;
            }

            try {
                await idbPut(databaseName, OUTBOX_STORE, item);
            } catch {
                // La copie localStorage déjà écrite sert de repli.
            }
        },

        listPending,

        async removePending(uuid: string): Promise<void> {
            const next = (await listPending()).filter(
                (item) => item.uuid !== uuid,
            );
            fallbackSet(fallbackOutboxKey, next);

            if (!canUseIndexedDb()) {
                return;
            }

            try {
                await idbDelete(databaseName, OUTBOX_STORE, uuid);
            } catch {
                // La copie localStorage déjà écrite sert de repli.
            }
        },

        async updatePending(
            uuid: string,
            changes: Partial<Pick<TerrainQueueItem, 'essais' | 'erreur'>>,
        ): Promise<void> {
            const item = (await listPending()).find(
                (pending) => pending.uuid === uuid,
            );

            if (!item) {
                return;
            }

            const next = { ...item, ...changes };
            const items = await listPending();
            fallbackSet(fallbackOutboxKey, [
                ...items.filter((pending) => pending.uuid !== uuid),
                next,
            ]);

            if (!canUseIndexedDb()) {
                return;
            }

            try {
                await idbPut(databaseName, OUTBOX_STORE, next);
            } catch {
                // La copie localStorage déjà écrite sert de repli.
            }
        },

        async markTaskPending(
            uuid: string,
            taskId: number,
            type: TerrainRecordType,
        ): Promise<TerrainSnapshot | null> {
            const snapshot = await this.readSnapshot();

            if (!snapshot) {
                return null;
            }

            const next: TerrainSnapshot = {
                ...snapshot,
                taches: snapshot.taches.map((task) =>
                    task.id === taskId
                        ? { ...task, saisie_locale: { uuid, type } }
                        : task,
                ),
            };
            await writeSnapshot(next);

            return next;
        },

        async updateTaskPendingError(
            uuid: string,
            erreur: string,
        ): Promise<TerrainSnapshot | null> {
            const snapshot = await this.readSnapshot();

            if (!snapshot) {
                return null;
            }

            const next: TerrainSnapshot = {
                ...snapshot,
                taches: snapshot.taches.map((task) =>
                    task.saisie_locale?.uuid === uuid
                        ? {
                              ...task,
                              saisie_locale: { ...task.saisie_locale, erreur },
                          }
                        : task,
                ),
            };
            await writeSnapshot(next);

            return next;
        },

        async clearTaskPending(uuid: string): Promise<TerrainSnapshot | null> {
            const snapshot = await this.readSnapshot();

            if (!snapshot) {
                return null;
            }

            const next: TerrainSnapshot = {
                ...snapshot,
                taches: snapshot.taches.map((task) => {
                    if (task.saisie_locale?.uuid !== uuid) {
                        return task;
                    }

                    const cleanTask = { ...task };
                    delete cleanTask.saisie_locale;

                    return cleanTask;
                }),
            };
            await writeSnapshot(next);

            return next;
        },
    };
};

export const createTerrainUuid = (): string => {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letter) => {
        const random = Math.floor(Math.random() * 16);

        return (letter === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
};

export const terrainDeviceId = (userId: number): string => {
    const key = `fkn.carnet.${userScope(userId)}.appareil.v2`;

    try {
        const existing = localStorage.getItem(key);

        if (existing) {
            return existing;
        }

        const created = createTerrainUuid();
        localStorage.setItem(key, created);

        return created;
    } catch {
        return createTerrainUuid();
    }
};
