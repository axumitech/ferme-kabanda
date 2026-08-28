import { Link, usePage } from '@inertiajs/react';
import { ClipboardCheck, LayoutGrid, Settings, Sprout } from 'lucide-react';
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
import type { NavItem } from '@/types';
import { useI18n } from '@/lib/i18n';

export function AppSidebar() {
    const { auth } = usePage().props;
    const { t } = useI18n();
    const user = auth.user as { is_admin?: boolean } | null;
    const mainNavItems: NavItem[] = [
        { title: t('cockpit'), href: '/dashboard', icon: LayoutGrid },
        { title: t('myDay'), href: '/journee', icon: ClipboardCheck },
        { title: t('field'), href: '/terrain', icon: Sprout },
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
