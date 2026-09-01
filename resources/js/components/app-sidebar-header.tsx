import { Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronRight, ClipboardCheck, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLogo from '@/components/app-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';

type SearchDestination = {
    label: string;
    group: string;
    href: string;
    keywords?: string;
};

const normalizeSearch = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('fr');

export function AppSidebarHeader() {
    const { auth, fkn } = usePage().props;
    const { state } = useSidebar();
    const getInitials = useInitials();
    const pendingActions =
        (fkn as { actionsPending?: number } | undefined)?.actionsPending ?? 0;
    const isAdmin = Boolean(
        (auth.user as { is_admin?: boolean } | null)?.is_admin,
    );
    const searchInput = useRef<HTMLInputElement>(null);
    const searchContainer = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeResult, setActiveResult] = useState(0);
    const destinations = useMemo<SearchDestination[]>(
        () => [
            { label: 'Tableau de bord', group: 'Pilotage', href: '/dashboard' },
            { label: 'Ma journée', group: 'Pilotage', href: '/journee' },
            {
                label: 'Journal de la ferme',
                group: 'Pilotage',
                href: '/journal-ferme',
            },
            {
                label: 'Registre partagé',
                group: 'Pilotage',
                href: '/registre-ferme',
            },
            {
                label: 'Carnet de ferme',
                group: 'BT Agri',
                href: '/terrain',
                keywords: 'parcellaire terrain',
            },
            {
                label: 'Plantations',
                group: 'BT Agri',
                href: '/plantations',
                keywords: 'cultures semis récoltes',
            },
            {
                label: 'Référentiel cultures',
                group: 'BT Agri',
                href: '/cultures',
                keywords: 'culture famille rotation maturité',
            },
            {
                label: 'Matières actives',
                group: 'BT Agri',
                href: '/matieres-actives',
                keywords: 'produits traitements frac irac hrac pesticide',
            },
            {
                label: 'Registre animal',
                group: 'BT Animal',
                href: '/animaux',
                keywords: 'animaux porcs bovins volailles poissons carnet',
            },
            {
                label: 'Ordres de travail',
                group: 'Maintenance',
                href: '/maintenance?resource=orders',
            },
            {
                label: "Parc d'équipements",
                group: 'Équipements & Travaux',
                href: '/maintenance?resource=equipment',
            },
            {
                label: 'Infrastructures',
                group: 'Maintenance',
                href: '/maintenance?resource=infrastructures',
            },
            { label: 'Version', group: 'Pilotage', href: '/version' },
            ...(isAdmin
                ? [
                      {
                          label: 'Référentiels',
                          group: 'Administration',
                          href: '/admin',
                      },
                      {
                          label: 'Processus',
                          group: 'Administration',
                          href: '/admin/processes',
                      },
                      {
                          label: 'Magasin et stocks',
                          group: 'Administration',
                          href: '/magasin',
                      },
                      {
                          label: 'Emplacements',
                          group: 'Magasin & Logistique',
                          href: '/emplacements',
                          keywords: 'adresse casier palette cuve chambre froide',
                      },
                      {
                          label: 'Réquisitions',
                          group: 'Magasin & Logistique',
                          href: '/requisitions',
                          keywords: 'demande stock achat fonds',
                      },
                      {
                          label: 'Inventaires',
                          group: 'Magasin & Logistique',
                          href: '/inventaires',
                          keywords: 'comptage stock abc campagne',
                      },
                      {
                          label: 'Ventes / Bons de livraison',
                          group: 'Ventes & Livraisons',
                          href: '/ventes',
                          keywords: 'client bon vente livrer encaisser',
                      },
                      {
                          label: 'Clients & canaux',
                          group: 'Ventes & Livraisons',
                          href: '/clients',
                          keywords: 'client canal premium ezhl marché export',
                      },
                      {
                          label: 'Taux de change',
                          group: 'Ventes & Livraisons',
                          href: '/taux-change',
                          keywords: 'devise cdf usd taux historique',
                      },
                      {
                          label: 'Rapports',
                          group: 'Administration',
                          href: '/admin/reports',
                      },
                      {
                          label: 'Carte de la ferme',
                          group: 'Administration',
                          href: '/admin/map',
                      },
                      {
                          label: 'Membres',
                          group: 'Administration',
                          href: '/admin/members',
                      },
                  ]
                : []),
        ],
        [isAdmin],
    );
    const results = useMemo(() => {
        const needle = normalizeSearch(search.trim());

        if (!needle) {
            return destinations.slice(0, 6);
        }

        return destinations
            .filter((destination) =>
                normalizeSearch(
                    `${destination.label} ${destination.group} ${destination.keywords ?? ''}`,
                ).includes(needle),
            )
            .slice(0, 7);
    }, [destinations, search]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLocaleLowerCase() === 'k'
            ) {
                event.preventDefault();
                searchInput.current?.focus();
                setSearchOpen(true);
            }
        };
        const handleOutsideClick = (event: PointerEvent) => {
            if (
                searchContainer.current &&
                !searchContainer.current.contains(event.target as Node)
            ) {
                setSearchOpen(false);
            }
        };

        document.addEventListener('keydown', handleShortcut);
        document.addEventListener('pointerdown', handleOutsideClick);

        return () => {
            document.removeEventListener('keydown', handleShortcut);
            document.removeEventListener('pointerdown', handleOutsideClick);
        };
    }, []);

    const navigateTo = (destination: SearchDestination) => {
        setSearchOpen(false);
        setSearch('');
        router.visit(destination.href);
    };

    return (
        <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-zinc-200 bg-white text-zinc-950">
            <div
                className={`flex min-w-0 flex-1 items-center gap-2 border-zinc-200 px-3 transition-[width] duration-200 md:flex-none md:border-r md:px-4 ${state === 'collapsed' ? 'md:w-12 md:px-0' : 'md:w-80'}`}
            >
                <SidebarTrigger className="size-9 shrink-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 md:hidden" />
                <Link
                    href="/dashboard"
                    prefetch
                    aria-label="Accueil FKN"
                    className={`min-w-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#1A5632]/30 ${state === 'collapsed' ? 'flex md:hidden' : 'flex'}`}
                >
                    <AppLogo />
                </Link>
            </div>

            <div className="flex h-full shrink-0 items-center gap-1.5 px-3 md:flex-1 md:gap-2 md:px-5">
                <SidebarTrigger className="mr-auto hidden size-9 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 md:inline-flex" />

                <div
                    ref={searchContainer}
                    role="search"
                    className="relative hidden w-full max-w-xs lg:block"
                >
                    <label htmlFor="fkn-global-search" className="sr-only">
                        Rechercher dans FKN
                    </label>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        ref={searchInput}
                        id="fkn-global-search"
                        type="search"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={searchOpen}
                        aria-controls="fkn-search-results"
                        aria-activedescendant={
                            searchOpen && results[activeResult]
                                ? `fkn-search-result-${activeResult}`
                                : undefined
                        }
                        autoComplete="off"
                        value={search}
                        onFocus={() => setSearchOpen(true)}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setActiveResult(0);
                            setSearchOpen(true);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown' && results.length) {
                                event.preventDefault();
                                setActiveResult(
                                    (current) => (current + 1) % results.length,
                                );
                            } else if (
                                event.key === 'ArrowUp' &&
                                results.length
                            ) {
                                event.preventDefault();
                                setActiveResult(
                                    (current) =>
                                        (current - 1 + results.length) %
                                        results.length,
                                );
                            } else if (
                                event.key === 'Enter' &&
                                results[activeResult]
                            ) {
                                event.preventDefault();
                                navigateTo(results[activeResult]);
                            } else if (event.key === 'Escape') {
                                event.preventDefault();
                                setSearchOpen(false);
                                searchInput.current?.blur();
                            }
                        }}
                        placeholder="Rechercher"
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-white pr-12 pl-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[#1A5632] focus:ring-2 focus:ring-[#1A5632]/10"
                    />
                    <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px] text-zinc-400">
                        ⌘K
                    </kbd>
                    {searchOpen && (
                        <div
                            id="fkn-search-results"
                            role="listbox"
                            aria-label="Résultats de recherche"
                            className="absolute top-full right-0 z-[60] mt-2 w-full min-w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10"
                        >
                            {results.map((destination, index) => (
                                <button
                                    key={destination.href}
                                    id={`fkn-search-result-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={activeResult === index}
                                    onMouseEnter={() => setActiveResult(index)}
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => navigateTo(destination)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none ${activeResult === index ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
                                >
                                    <Search className="size-4 shrink-0 text-zinc-400" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-zinc-900">
                                            {destination.label}
                                        </span>
                                        <span className="block truncate text-[11px] text-zinc-400">
                                            {destination.group}
                                        </span>
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-zinc-300" />
                                </button>
                            ))}
                            {results.length === 0 && (
                                <p className="px-3 py-6 text-center text-sm text-zinc-500">
                                    Aucun résultat
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={
                                pendingActions
                                    ? `${pendingActions} action${pendingActions > 1 ? 's' : ''} en attente`
                                    : 'Notifications — aucune action en attente'
                            }
                            className="relative inline-flex size-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[#1A5632]/30 focus-visible:outline-none"
                        >
                            <Bell className="size-5 stroke-[1.7]" />
                            {pendingActions > 0 && (
                                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#1A5632] ring-2 ring-white" />
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-72 rounded-xl p-2"
                        align="end"
                        sideOffset={8}
                    >
                        <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold text-zinc-900">
                            Notifications
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="rounded-lg p-0">
                            <Link
                                href="/journee"
                                className="flex w-full items-center gap-3 px-2 py-2.5"
                            >
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-[#1A5632]">
                                    <ClipboardCheck className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-zinc-900">
                                        Ma journée
                                    </span>
                                    <span className="block text-xs text-zinc-500">
                                        {pendingActions > 0
                                            ? `${pendingActions} action${pendingActions > 1 ? 's' : ''} à traiter`
                                            : 'Aucune action en attente'}
                                    </span>
                                </span>
                                <ChevronRight className="size-4 text-zinc-400" />
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Menu de ${auth.user.name}`}
                                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1A5632]/35 focus-visible:ring-offset-2"
                            >
                                <Avatar className="size-8 border border-zinc-200">
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt={auth.user.name}
                                    />
                                    <AvatarFallback className="bg-zinc-950 text-[11px] font-semibold text-white">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64 rounded-xl"
                            align="end"
                            sideOffset={8}
                        >
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
