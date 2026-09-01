import { Link, usePage } from '@inertiajs/react';
import {
    Archive,
    ArrowLeftRight,
    BadgeInfo,
    Banknote,
    Beaker,
    BookOpen,
    Building2,
    ClipboardCheck,
    ClipboardList,
    FileCheck2,
    Flag,
    Import,
    LayoutDashboard,
    Map,
    MapPin,
    Newspaper,
    PackageOpen,
    Presentation,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Sprout,
    Sun,
    SwatchBook,
    Tractor,
    UserRoundSearch,
    Users,
    Wrench,
    X,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import type { NavigationGroup } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
    const { auth, fkn } = usePage().props;
    const { setOpenMobile } = useSidebar();
    const user = auth.user as { is_admin?: boolean } | null;
    const counters = fkn as
        | {
              actionsPending?: number;
              registryTasks?: number;
              articleCount?: number;
              requisitionCount?: number;
              inventoryPending?: number;
              salesPending?: number;
              workOrdersPending?: number;
              infrastructuresBad?: number;
              incidentsOpen?: number;
              patrolsOpen?: number;
              dailyLogCount?: number;
              controlPostsActive?: number;
              planImportsPending?: number;
          }
        | undefined;
    const pendingActions = counters?.actionsPending ?? 0;
    const registryTasks = counters?.registryTasks ?? 0;
    const articleCount = counters?.articleCount ?? 0;
    const requisitionCount = counters?.requisitionCount ?? 0;
    const inventoryPending = counters?.inventoryPending ?? 0;
    const salesPending = counters?.salesPending ?? 0;
    const workOrdersPending = counters?.workOrdersPending ?? 0;
    const infrastructuresBad = counters?.infrastructuresBad ?? 0;
    const incidentsOpen = counters?.incidentsOpen ?? 0;
    const patrolsOpen = counters?.patrolsOpen ?? 0;
    const dailyLogCount = counters?.dailyLogCount ?? 0;
    const controlPostsActive = counters?.controlPostsActive ?? 0;
    const planImportsPending = counters?.planImportsPending ?? 0;
    const groups: NavigationGroup[] = [
        {
            label: 'Pilotage',
            items: [
                {
                    title: 'Tableau de bord',
                    href: '/dashboard',
                    icon: LayoutDashboard,
                },
                {
                    title: 'Ma journée',
                    href: '/journee',
                    icon: Sun,
                    badge: pendingActions,
                },
                {
                    title: 'Journal de la ferme',
                    href: '/journal-ferme',
                    icon: Newspaper,
                },
                {
                    title: 'Registre des tâches',
                    href: '/registre-ferme',
                    icon: ClipboardCheck,
                    badge: registryTasks,
                },
                {
                    title: 'Version et points ouverts',
                    href: '/version',
                    icon: BadgeInfo,
                },
            ],
        },
        {
            label: 'BT Agri',
            items: [
                { title: 'Parcellaire', href: '/terrain', icon: Sprout },
                ...(user?.is_admin
                    ? [
                          {
                              title: 'Plantations',
                              href: '/plantations',
                              icon: Sparkles,
                          },
                          {
                              title: 'Référentiel cultures',
                              href: '/cultures',
                              icon: SwatchBook,
                          },
                          {
                              title: 'Matières actives',
                              href: '/matieres-actives',
                              icon: Beaker,
                          },
                      ]
                    : []),
            ],
        },
        {
            label: 'BT Animal',
            items: [
                {
                    title: 'Registre animal',
                    href: '/animaux',
                    icon: UserRoundSearch,
                },
            ],
        },
        ...(user?.is_admin
            ? [
                  {
                      label: 'Magasin & Logistique',
                      items: [
                          {
                              title: 'Magasin',
                              href: '/magasin',
                              icon: Archive,
                              badge: articleCount,
                          },
                          {
                              title: 'Réquisitions',
                              href: '/requisitions',
                              icon: PackageOpen,
                              badge: requisitionCount,
                          },
                          {
                              title: 'Inventaires',
                              href: '/inventaires',
                              icon: ClipboardList,
                              badge: inventoryPending,
                          },
                          {
                              title: 'Emplacements',
                              href: '/emplacements',
                              icon: MapPin,
                          },
                      ],
                  },
                  {
                      label: 'Ventes & Livraisons',
                      items: [
                          {
                              title: 'Ventes / Bons de livraison',
                              href: '/ventes',
                              icon: Banknote,
                              badge: salesPending,
                          },
                          {
                              title: 'Clients & canaux',
                              href: '/clients',
                              icon: Users,
                          },
                          {
                              title: 'Taux de change',
                              href: '/taux-change',
                              icon: ArrowLeftRight,
                          },
                      ],
                  },
              ]
            : []),
        {
            label: 'Équipements & Travaux',
            items: [
                {
                    title: "Parc d'équipements",
                    href: '/maintenance?resource=equipment',
                    icon: Tractor,
                },
            ],
        },
        {
            label: 'Maintenance',
            items: [
                {
                    title: 'Ordres de travail',
                    href: '/ordres-travail',
                    icon: Wrench,
                    badge: workOrdersPending,
                },
                {
                    title: 'Infrastructures',
                    href: '/maintenance?resource=infrastructures',
                    icon: Building2,
                    badge: infrastructuresBad,
                },
            ],
        },
        ...(user?.is_admin
            ? [
                  {
                      label: 'Sécurité & QHSE',
                      items: [
                          {
                              title: 'Incidents HSE',
                              href: '/admin/processes?tab=incidents',
                              icon: ShieldAlert,
                              badge: incidentsOpen,
                          },
                          {
                              title: 'Patrouilles',
                              href: '/patrouilles',
                              icon: ShieldCheck,
                              badge: patrolsOpen,
                          },
                          {
                              title: 'Main courante',
                              href: '/main-courante',
                              icon: BookOpen,
                              badge: dailyLogCount,
                          },
                          {
                              title: 'Postes de contrôle',
                              href: '/postes-controle',
                              icon: Flag,
                              badge: controlPostsActive,
                          },
                      ],
                  },
                  {
                      label: 'Plans & Gouvernance',
                      items: [
                          {
                              title: 'Imports de plan',
                              href: '/imports-plans',
                              icon: Import,
                              badge: planImportsPending,
                          },
                          {
                              title: 'Plans (versions)',
                              href: '/plans',
                              icon: Map,
                          },
                          {
                              title: 'Plan en vigueur — réalisé vs plan',
                              href: '/plans-en-vigueur',
                              icon: Presentation,
                          },
                          {
                              title: 'Politiques & procédures',
                              href: '/documents-reference',
                              icon: FileCheck2,
                          },
                      ],
                  },
                  {
                      label: 'Organisation',
                      items: [
                          {
                              title: 'Membres',
                              href: '/admin/members',
                              icon: Users,
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="fkn-filament-sidebar top-16 h-[calc(100svh-4rem)] border-r border-zinc-200 bg-white p-0"
        >
            <SidebarHeader className="border-b border-zinc-200 p-3 md:hidden">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-1">
                        <SidebarMenuButton size="lg" asChild className="px-2">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                        <button
                            type="button"
                            aria-label="Fermer la navigation"
                            onClick={() => setOpenMobile(false)}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#1A5632]/30 focus-visible:outline-none"
                        >
                            <X className="size-5" />
                        </button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="[scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent] bg-white py-3">
                <NavMain groups={groups} />
            </SidebarContent>
        </Sidebar>
    );
}
