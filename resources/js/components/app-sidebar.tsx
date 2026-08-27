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

const mainNavItems: NavItem[] = [
    {
        title: 'Cockpit',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Ma journée',
        href: '/journee',
        icon: ClipboardCheck,
    },
    {
        title: 'Terrain',
        href: '/terrain',
        icon: Sprout,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const user = auth.user as { is_admin?: boolean } | null;
    const navItems = user?.is_admin
        ? [
              ...mainNavItems,
              {
                  title: 'Administration',
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
