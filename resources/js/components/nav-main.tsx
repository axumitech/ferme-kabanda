import { Link, usePage } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export type NavigationGroup = {
    label: string;
    items: NavItem[];
};

function isActive(item: NavItem, pageUrl: string): boolean {
    if (item.isActive !== undefined) {
        return item.isActive;
    }

    const current = new URL(pageUrl, 'http://localhost');
    const target = new URL(String(item.href), 'http://localhost');

    if (current.pathname !== target.pathname) {
        return false;
    }

    if (
        target.pathname === '/maintenance' &&
        target.searchParams.get('resource') === 'orders' &&
        !current.searchParams.has('resource')
    ) {
        return true;
    }

    for (const [key, value] of target.searchParams.entries()) {
        if (current.searchParams.get(key) !== value) {
            return false;
        }
    }

    return target.searchParams.size > 0 || current.searchParams.size === 0;
}

export function NavMain({ groups = [] }: { groups: NavigationGroup[] }) {
    const { url } = usePage();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <nav aria-label="Navigation principale" className="pb-5">
            {groups.map((group) => (
                <SidebarGroup className="px-3 py-2" key={group.label}>
                    <SidebarGroupLabel className="h-7 px-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) => (
                            <SidebarMenuItem
                                key={`${group.label}-${item.title}`}
                            >
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive(item, url)}
                                    tooltip={{ children: item.title }}
                                    className="h-10 rounded-lg px-2.5 text-[13px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 data-[active=true]:bg-zinc-100 data-[active=true]:font-semibold data-[active=true]:text-[#1A5632] [&>svg]:size-[18px] [&>svg]:stroke-[1.7]"
                                >
                                    <Link
                                        href={item.href}
                                        prefetch
                                        onClick={() => {
                                            if (isMobile) {
                                                setOpenMobile(false);
                                            }
                                        }}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.badge !== null &&
                                    item.badge !== undefined && (
                                        <SidebarMenuBadge className="bg-zinc-200 text-zinc-700 peer-data-[active=true]/menu-button:bg-[#1A5632] peer-data-[active=true]/menu-button:text-white">
                                            {item.badge}
                                        </SidebarMenuBadge>
                                    )}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </nav>
    );
}
