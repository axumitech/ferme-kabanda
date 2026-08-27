import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { offlineQueue } from '@/lib/offline-queue';

export function OfflineStatus() {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [queued, setQueued] = useState(() => offlineQueue.count());

    useEffect(() => {
        const updateOnline = () => setOnline(navigator.onLine);
        const updateQueue = () => setQueued(offlineQueue.count());

        window.addEventListener('online', updateOnline);
        window.addEventListener('offline', updateOnline);
        window.addEventListener('fkn-offline-queue-changed', updateQueue);

        return () => {
            window.removeEventListener('online', updateOnline);
            window.removeEventListener('offline', updateOnline);
            window.removeEventListener('fkn-offline-queue-changed', updateQueue);
        };
    }, []);

    if (online && queued === 0) {
        return null;
    }

    return (
        <div className="fixed right-3 bottom-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-lg">
            <WifiOff className="size-4 shrink-0" />
            <span>
                {!online ? 'Mode hors ligne' : 'Synchronisation en attente'}
                {queued > 0 ? ` · ${queued} opération(s)` : ''}
            </span>
        </div>
    );
}
