import { toast } from 'sonner';

type QueuedRequest = {
    id: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    payload?: unknown;
    createdAt: string;
    label: string;
};

const STORAGE_KEY = 'fkn.offline.queue.v1';

const csrfToken = () =>
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

const readQueue = (): QueuedRequest[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as QueuedRequest[];
    } catch {
        return [];
    }
};

const writeQueue = (queue: QueuedRequest[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('fkn-offline-queue-changed', { detail: { count: queue.length } }));
};

export const offlineQueue = {
    count(): number {
        return readQueue().length;
    },

    all(): QueuedRequest[] {
        return readQueue();
    },

    enqueue(request: Omit<QueuedRequest, 'id' | 'createdAt'>): QueuedRequest {
        const item: QueuedRequest = {
            ...request,
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            createdAt: new Date().toISOString(),
        };
        writeQueue([...readQueue(), item]);
        toast.info(`${request.label} gardé hors ligne. Synchronisation au retour du réseau.`);

        return item;
    },

    async flush(): Promise<void> {
        if (!navigator.onLine) {
            return;
        }

        const queue = readQueue();
        if (queue.length === 0) {
            return;
        }

        const remaining: QueuedRequest[] = [];
        let synced = 0;

        for (const item of queue) {
            try {
                const response = await fetch(item.url, {
                    method: item.method,
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                        'X-Offline-Replay': '1',
                    },
                    body: item.payload === undefined ? undefined : JSON.stringify(item.payload),
                });

                if (!response.ok) {
                    remaining.push(item);
                    continue;
                }

                synced++;
            } catch {
                remaining.push(item);
            }
        }

        writeQueue(remaining);

        if (synced > 0) {
            toast.success(`${synced} opération(s) hors ligne synchronisée(s).`);
        }
    },
};

export function registerPwaRuntime(): void {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Non bloquant : l'app reste utilisable sans service worker.
            });
        });
    }

    window.addEventListener('online', () => {
        void offlineQueue.flush();
    });

    void offlineQueue.flush();
}
