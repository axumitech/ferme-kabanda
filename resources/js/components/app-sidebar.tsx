import { Link, usePage } from '@inertiajs/react';
import {
    ClipboardCheck,
    LayoutGrid,
    Newspaper,
    Settings,
    Share2,
    Smartphone,
    Sprout,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useI18n } from '@/lib/i18n';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth, fkn } = usePage().props;
    const { t } = useI18n();
    const user = auth.user as { is_admin?: boolean } | null;
    const mainNavItems: NavItem[] = [
        { title: t('cockpit'), href: '/dashboard', icon: LayoutGrid },
        {
            title: `${t('myDay')}${(fkn as { actionsPending?: number } | undefined)?.actionsPending ? ` (${(fkn as { actionsPending: number }).actionsPending})` : ''}`,
            href: '/journee',
            icon: ClipboardCheck,
        },
        {
            title: 'Journal de la ferme',
            href: '/journal-ferme',
            icon: Newspaper,
        },
        { title: 'Registre partagé', href: '/registre-ferme', icon: Share2 },
        { title: t('field'), href: '/terrain', icon: Sprout },
        { title: 'Carnet terrain', href: '/terrain/carnet', icon: Smartphone },
    ];
    const navItems = user?.is_admin
        ? [
              ...mainNavItems,
              {
                  title: t('administration'),
                  href: '/admin/operations',
                  icon: Settings,
              },
          ]
        : mainNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
