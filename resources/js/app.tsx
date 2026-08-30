import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { OfflineStatus } from '@/components/offline-status';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { registerPwaRuntime } from '@/lib/offline-queue';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Certains aperçus mobiles intégrés émettent exceptionnellement un événement
// scroll sans cible. Inertia attend une cible DOM et s'arrête sinon.
if (typeof document !== 'undefined') {
    document.addEventListener(
        'scroll',
        (event) => {
            if (event.target === null) {
                event.stopImmediatePropagation();
            }
        },
        true,
    );
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome' ||
                name === 'dashboard' ||
                name.startsWith('admin/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <OfflineStatus />
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
registerPwaRuntime();
