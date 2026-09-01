import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { Breadcrumbs } from '@/components/breadcrumbs';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebarHeader />
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="min-w-0 overflow-x-clip bg-zinc-50 pt-16 text-zinc-950"
            >
                {breadcrumbs.length > 0 && (
                    <div className="px-4 pt-5 sm:px-6 lg:px-8">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                )}
                {children}
            </AppContent>
        </AppShell>
    );
}
