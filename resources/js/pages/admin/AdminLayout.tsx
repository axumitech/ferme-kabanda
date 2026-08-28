import { Link, usePage } from '@inertiajs/react';
import {
    Boxes,
    ClipboardCheck,
    GitBranch,
    FileText,
    LayoutGrid,
    Map,
    Users,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    match?: string[];
};

const navItems = (t: ReturnType<typeof useI18n>['t']): NavItem[] => [
    {
        href: '/admin/processes',
        label: t('processes'),
        icon: GitBranch,
        match: ['/admin/processes'],
    },
    {
        href: '/admin',
        label: t('references'),
        icon: LayoutGrid,
        match: ['/admin'],
    },
    {
        href: '/admin/inventory',
        label: t('inventory'),
        icon: Boxes,
        match: ['/admin/inventory'],
    },
    {
        href: '/admin/operations',
        label: t('operations'),
        icon: ClipboardCheck,
        match: ['/admin/operations'],
    },
    {
        href: '/admin/reports',
        label: t('reports'),
        icon: FileText,
        match: ['/admin/reports'],
    },
    {
        href: '/admin/map',
        label: t('map'),
        icon: Map,
        match: ['/admin/map'],
    },
    {
        href: '/admin/members',
        label: t('members'),
        icon: Users,
        match: ['/admin/members'],
    },
];

type Props = {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
};

export function AdminLayout({ children, title, subtitle }: Props) {
    const { url } = usePage();
    const { t, tr } = useI18n();
    const items = navItems(t);
    const { auth } = usePage().props as {
        auth: { user: { name: string } };
    };

    const isActive = (item: NavItem) => {
        if (item.match) {
            return item.match.some((path) => url === path || url.startsWith(path + '/') || (path === '/admin' && url === '/admin'));
        }
        return url === item.href;
    };

    // Find the active nav item for exact matching
    const activeItem = items.find((item) => {
        if (url.startsWith('/admin/inventory')) return item.href === '/admin/inventory';
        if (url.startsWith('/admin/operations')) return item.href === '/admin/operations';
        if (url.startsWith('/admin/processes')) return item.href === '/admin/processes';
        if (url.startsWith('/admin/reports')) return item.href === '/admin/reports';
        if (url.startsWith('/admin/map')) return item.href === '/admin/map';
        if (url.startsWith('/admin/members')) return item.href === '/admin/members';
        return item.href === '/admin';
    });

    return (
        <div className="admin-screen admin-premium min-h-screen" style={{ background: '#f7f6f2', color: '#17352a' }}>
            {/* Top Header Bar */}
            <header className="admin-header">
                <div className="admin-header-inner">
                    {/* Brand */}
                    <Link href="/admin" className="admin-brand">
                        <div className="admin-brand-logo">
                            <img
                                src="/brand-logo.png"
                                alt="Ferme Kabanda"
                                style={{ width: 28, height: 28, objectFit: 'contain' }}
                            />
                        </div>
                        <div className="admin-brand-text">
                            <span className="admin-brand-eyebrow">FERME KABANDA NAWEZA</span>
                            <span className="admin-brand-name">{tr('Administration')}</span>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="admin-nav">
                        {items.map((item) => {
                            const active = activeItem?.href === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`admin-nav-item${active ? ' admin-nav-item--active' : ''}`}
                                >
                                    <Icon size={15} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User + App link */}
                    <div className="admin-header-end">
                        <span className="admin-user-name">{auth?.user?.name}</span>
                        <Link href="/dashboard" className="admin-farm-link">
                            {tr('Application ferme →')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Page Title Bar */}
            <div className="admin-page-bar">
                <div className="admin-page-bar-inner">
                    <div>
                        <h1 className="admin-page-title">{tr(title)}</h1>
                        {subtitle && <p className="admin-page-subtitle">{tr(subtitle)}</p>}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
