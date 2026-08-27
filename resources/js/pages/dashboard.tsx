import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Boxes,
    CalendarCheck,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    Lock,
    Map,
    Sprout,
} from 'lucide-react';

type Task = {
    id: number;
    reference: string;
    titre: string;
    date_due: string;
    statut: string;
    priorite: string;
    responsable?: { id: number; name: string } | null;
    site?: { id: number; code: string; nom: string } | null;
    departement?: { id: number; code: string; nom: string } | null;
};
type Closure = {
    id: number;
    date: string;
    dues: number;
    faites: number;
    justifiees: number;
    non_justifiees: number;
    site?: { code: string } | null;
    departement?: { code: string } | null;
};
type InventoryItem = {
    id: number;
    code: string;
    name: string;
    unit: string;
    quantity_on_hand: string;
    minimum_quantity?: string | null;
};
type MapFeature = {
    id: number;
    name: string;
    feature_type: string;
    area_ha: string | null;
    area_m2: number | null;
};
type Props = {
    stats: {
        tasksToday: number;
        openTasks: number;
        lateTasks: number;
        doneToday: number;
        lowInventory: number;
        lowProducts: number;
        reportsToday: number;
        closedToday: number;
    };
    tasks: Task[];
    closures: Closure[];
    lowInventoryItems: InventoryItem[];
    mapFeatures: MapFeature[];
    referencesCount: number;
};

const statusClass = (task: Task) => {
    if (task.statut === 'faite') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    if (task.statut === 'non_faite_non_justifiee') return 'bg-red-50 text-red-700 ring-red-200';
    if (task.statut === 'non_faite_justifiee') return 'bg-amber-50 text-amber-700 ring-amber-200';

    return 'bg-stone-100 text-stone-700 ring-stone-200';
};

export default function Dashboard({
    stats,
    tasks,
    closures,
    lowInventoryItems,
    mapFeatures,
    referencesCount,
}: Props) {
    const { auth } = usePage().props;
    const user = auth.user as { is_admin?: boolean } | null;
    const isAdmin = !!user?.is_admin;
    const cards = [
        { label: "Aujourd'hui", value: stats.tasksToday, icon: CalendarCheck, href: '/journee' },
        { label: 'Ouvertes', value: stats.openTasks, icon: ClipboardCheck, href: '/journee' },
        { label: 'En retard', value: stats.lateTasks, icon: AlertTriangle, href: isAdmin ? '/admin/operations' : '/journee', danger: stats.lateTasks > 0 },
        { label: 'Faites ce jour', value: stats.doneToday, icon: CheckCircle2, href: '/journee' },
        { label: 'Stock bas', value: stats.lowInventory + stats.lowProducts, icon: Boxes, href: isAdmin ? '/admin/inventory' : '/terrain', danger: stats.lowInventory + stats.lowProducts > 0 },
        { label: 'Clôtures', value: stats.closedToday, icon: Lock, href: isAdmin ? '/admin/operations' : '/journee' },
    ];

    return (
        <AppLayout>
            <Head title="Cockpit ferme" />
            <main className="min-h-screen dashboard-gradient-bg px-4 py-8 text-[#17352a] sm:px-6 lg:px-8 animate-fade-in-up">
                <div className="mx-auto max-w-7xl space-y-8">
                    <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
                        <div className="dashboard-stat-card p-6 md:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a16f26]">Ferme Kabanda Naweza</p>
                                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#17352a] sm:text-3xl">Cockpit opérationnel</h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#637069]">
                                        {isAdmin
                                            ? 'Pilotez les tâches, stocks, rapports et clôtures au même endroit.'
                                            : 'Retrouvez vos tâches du jour, les alertes utiles et les informations terrain sans passer par l’administration.'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Link href="/journee" className="hover-lift inline-flex h-11 items-center gap-2 rounded-xl bg-[#174a31] px-5 text-sm font-semibold text-white shadow-md">
                                        <ClipboardCheck size={18} /> Ma journée
                                    </Link>
                                    <Link href="/terrain" className="hover-lift inline-flex h-11 items-center gap-2 rounded-xl border border-[#ded8ca] bg-[#fbfaf7] px-5 text-sm font-semibold text-[#425047]">
                                        <Sprout size={18} /> Terrain
                                    </Link>
                                    {isAdmin && (
                                        <Link href="/admin/operations" className="hover-lift inline-flex h-11 items-center gap-2 rounded-xl border border-[#ded8ca] bg-[#fbfaf7] px-5 text-sm font-semibold text-[#425047]">
                                            <FileText size={18} /> Admin
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[20px] bg-glass-dark p-6 md:p-8 text-white shadow-lg hover-lift">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8a84e]">État du socle</p>
                            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold">{referencesCount}</div>
                                    <div className="text-xs text-[#c9d8d0]">références</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{stats.reportsToday}</div>
                                    <div className="text-xs text-[#c9d8d0]">rapports</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold">{mapFeatures.length}</div>
                                    <div className="text-xs text-[#c9d8d0]">zones</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-3">
                        <ActionCard
                            title={isAdmin ? '1. Planifier le travail' : '1. Traiter mes tâches'}
                            text={isAdmin ? 'Créez ou ouvrez une tâche, choisissez un responsable, puis suivez son statut.' : 'Ouvrez une tâche, puis choisissez “faite” ou “justifiée”.'}
                            href={isAdmin ? '/admin/operations' : '/journee'}
                            cta={isAdmin ? 'Ouvrir les opérations' : 'Ouvrir ma journée'}
                        />
                        <ActionCard
                            title={isAdmin ? '2. Gérer le magasin' : '2. Remonter le terrain'}
                            text={isAdmin ? 'Ajoutez un article, faites une entrée/sortie, puis consultez l’historique.' : 'Consultez les zones et utilisez les écrans terrain prévus pour l’exécution.'}
                            href={isAdmin ? '/admin/inventory' : '/terrain'}
                            cta={isAdmin ? 'Ouvrir le magasin' : 'Ouvrir terrain'}
                        />
                        <ActionCard
                            title={isAdmin ? '3. Clôturer la journée' : '3. Suivre mon statut'}
                            text={isAdmin ? 'La clôture bloque les tâches non traitées et prépare la traçabilité.' : 'Les tâches créées par l’admin apparaissent ici quand elles vous sont assignées.'}
                            href={isAdmin ? '/admin/operations' : '/journee'}
                            cta="Voir quoi faire"
                        />
                    </section>

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        {cards.map(({ label, value, icon: Icon, href, danger }) => (
                            <Link key={label} href={href} className={`dashboard-stat-card p-5 ${danger ? 'danger' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#637069]">{label}</span>
                                    <span className={`grid size-9 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-700' : 'bg-[#edf3ed] text-[#174a31]'}`}>
                                        <Icon size={18} />
                                    </span>
                                </div>
                                <div className={`mt-5 text-4xl font-extrabold tracking-tight ${danger ? 'text-red-700' : 'text-[#17352a]'}`}>{value}</div>
                            </Link>
                        ))}
                    </section>

                    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
                        <div className="dashboard-stat-card">
                            <div className="border-b border-[#e7e1d4] px-6 py-5">
                                <h2 className="text-lg font-bold tracking-tight text-[#17352a]">File opérationnelle</h2>
                            </div>
                            <div className="divide-y divide-[#eee8dd]">
                                {tasks.map((task) => (
                                    <div key={task.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                                        <div>
                                            <div className="font-semibold">{task.titre}</div>
                                            <div className="mt-1 text-sm text-[#637069]">{task.reference} · {task.site?.code ?? 'Site libre'} · {task.departement?.code ?? 'Département libre'} · {task.responsable?.name ?? 'Non assignée'}</div>
                                        </div>
                                        <div className="flex items-center gap-2 md:justify-end">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(task)}`}>{task.statut.replaceAll('_', ' ')}</span>
                                            <span className="text-sm font-semibold text-[#637069]">{task.date_due}</span>
                                        </div>
                                    </div>
                                ))}
                                {tasks.length === 0 && <div className="px-5 py-10 text-center text-sm text-[#7a857e]">Aucune tâche opérationnelle.</div>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="dashboard-stat-card">
                                <div className="border-b border-[#e7e1d4] px-6 py-5">
                                    <h2 className="text-lg font-bold tracking-tight text-[#17352a]">Alertes magasin</h2>
                                </div>
                                <div className="divide-y divide-[#eee8dd]">
                                    {lowInventoryItems.map((item) => (
                                        <div key={item.id} className="px-5 py-4">
                                            <div className="font-semibold">{item.name}</div>
                                            <div className="mt-1 text-sm text-[#637069]">{item.code} · {item.quantity_on_hand} {item.unit} · seuil {item.minimum_quantity}</div>
                                        </div>
                                    ))}
                                    {lowInventoryItems.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#7a857e]">Aucune alerte stock.</div>}
                                </div>
                            </div>

                            <div className="dashboard-stat-card">
                                <div className="border-b border-[#e7e1d4] px-6 py-5">
                                    <h2 className="text-lg font-bold tracking-tight text-[#17352a]">Clôtures récentes</h2>
                                </div>
                                <div className="divide-y divide-[#eee8dd]">
                                    {closures.map((closure) => (
                                        <div key={closure.id} className="px-5 py-4">
                                            <div className="font-semibold">{closure.site?.code} · {closure.departement?.code} · {closure.date}</div>
                                            <div className="mt-1 text-sm text-[#637069]">{closure.faites}/{closure.dues} faites · {closure.justifiees} justifiées · {closure.non_justifiees} RH</div>
                                        </div>
                                    ))}
                                    {closures.length === 0 && <div className="px-5 py-8 text-center text-sm text-[#7a857e]">Aucune clôture récente.</div>}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="dashboard-stat-card">
                        <div className="flex items-center gap-3 border-b border-[#e7e1d4] px-6 py-5 text-[#17352a]">
                            <Map size={20} />
                            <h2 className="text-lg font-bold tracking-tight text-[#17352a]">Zones actives</h2>
                        </div>
                        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                            {mapFeatures.map((feature) => (
                                <div key={feature.id} className="rounded-lg border border-[#e7e1d4] bg-[#fbfaf7] p-4">
                                    <div className="font-semibold">{feature.name}</div>
                                    <div className="mt-1 text-sm text-[#637069]">{feature.feature_type} · {feature.area_ha ?? `${feature.area_m2 ?? 0} m²`}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </AppLayout>
    );
}

function ActionCard({
    title,
    text,
    href,
    cta,
}: {
    title: string;
    text: string;
    href: string;
    cta: string;
}) {
    return (
        <Link href={href} className="dashboard-stat-card p-5 hover-lift">
            <h2 className="text-sm font-bold text-[#17352a]">{title}</h2>
            <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-[#637069]">{text}</p>
            <div className="mt-5 text-sm font-bold text-[#174a31] group-hover:text-[#c9963a] transition-colors">{cta} →</div>
        </Link>
    );
}
