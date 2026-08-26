import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Boxes,
    Database,
    FileText,
    Leaf,
    Map,
    Pencil,
    Plus,
    Search,
    UserCheck,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';

type Item = {
    id: number;
    category: string;
    label: string;
    description?: string | null;
    sort_order: number;
    active: boolean;
    member_account?: { id: number; name: string } | null;
};

type Props = {
    categories: Record<string, string>;
    items: Item[];
    stats: {
        users: number;
        records: number;
        reports: number;
        references: number;
        activeReferences: number;
    };
};

export default function ReferencesAdmin({ categories, items, stats }: Props) {
    const { auth } = usePage().props;
    const [category, setCategory] = useState(Object.keys(categories)[0]);
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<Item | null>(null);
    const form = useForm({
        category,
        label: '',
        description: '',
        sort_order: 0,
        active: true,
    });
    const isTeamCategory = ['agents_agri', 'agents_ani'].includes(category);
    const fieldHints: Record<string, { label: string; placeholder: string }> = {
        agents_agri: {
            label: 'Nom de la personne / fonction',
            placeholder: 'Ex. Jean Kabeya — chef d’équipe',
        },
        agents_ani: {
            label: 'Nom de la personne / fonction',
            placeholder: 'Ex. Marie Mbuyi — vétérinaire',
        },
        unites: {
            label: 'Unité de mesure',
            placeholder: 'Ex. Kilogramme (kg)',
        },
        produits: {
            label: 'Produit ou intrant',
            placeholder: 'Ex. Engrais NPK',
        },
    };
    const currentHint = fieldHints[category] ?? {
        label: category.startsWith('taches_') ? 'Nom de la tâche' : 'Libellé',
        placeholder: category.startsWith('taches_')
            ? 'Ex. Nettoyage et contrôle quotidien'
            : `Ajouter dans « ${categories[category]} »`,
    };

    const visible = useMemo(
        () =>
            items.filter(
                (item) =>
                    item.category === category &&
                    item.label.toLowerCase().includes(query.toLowerCase()),
            ),
        [items, category, query],
    );
    const statCards = [
        { icon: Users, label: 'Utilisateurs', value: stats.users },
        { icon: Database, label: 'Données enregistrées', value: stats.records },
        { icon: FileText, label: 'Rapports générés', value: stats.reports },
        {
            icon: Leaf,
            label: 'Références actives',
            value: stats.activeReferences,
        },
        {
            icon: Database,
            label: 'Références totales',
            value: stats.references,
        },
    ];

    const selectCategory = (next: string) => {
        setCategory(next);
        setEditing(null);
        form.setData({
            category: next,
            label: '',
            description: '',
            sort_order: 0,
            active: true,
        });
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (editing) {
            form.put(`/admin/references/${editing.id}`, {
                preserveScroll: true,
                onSuccess: reset,
            });
        } else {
            form.post('/admin/references', {
                preserveScroll: true,
                onSuccess: reset,
            });
        }
    };

    const reset = () => {
        setEditing(null);
        form.reset('label', 'description', 'sort_order');
        form.setData('category', category);
    };

    const edit = (item: Item) => {
        setEditing(item);
        form.setData({
            category: item.category,
            label: item.label,
            description: item.description || '',
            sort_order: item.sort_order,
            active: item.active,
        });
    };

    const remove = (item: Item) => {
        if (window.confirm(`Supprimer « ${item.label} » du référentiel ?`)) {
            router.delete(`/admin/references/${item.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <AdminLayout
            title="Référentiels opérationnels"
            subtitle="Les modifications faites ici alimentent directement les listes de la homepage."
        >
            <Head title="Administration des référentiels" />
            
            <div className="admin-animate-in">
                <div className="admin-stats-grid">
                    {statCards.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="admin-stat-card">
                            <div className="admin-stat-header">
                                <span className="admin-stat-label">{label}</span>
                                <div className="admin-stat-icon">
                                    <Icon size={16} />
                                </div>
                            </div>
                            <div className="admin-stat-value">{value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
                    <aside className="admin-sidebar-nav">
                        <div className="admin-sidebar-nav-inner">
                            <Link
                                href="/admin/members"
                                className="admin-sidebar-item admin-sidebar-item--featured"
                            >
                                <span className="flex items-center gap-2">
                                    <UserPlus size={16} /> Comptes membres
                                </span>
                                <span className="admin-sidebar-count">{stats.users}</span>
                            </Link>
                            
                            <div className="admin-sidebar-section-label">CATÉGORIES</div>
                            
                            {Object.entries(categories).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => selectCategory(key)}
                                    className={`admin-sidebar-item ${category === key ? 'admin-sidebar-item--active' : ''}`}
                                >
                                    <span>{label}</span>
                                    <span className="admin-sidebar-count">
                                        {items.filter((i) => i.category === key).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <section className="space-y-6">
                        <form onSubmit={submit} className="admin-form-panel">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="grid size-10 place-items-center rounded-xl bg-[#edf3ed] text-[#174a31]">
                                    {editing ? <Pencil size={20} /> : <Plus size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[15px] text-[#17352a]">
                                        {editing ? 'Modifier cet élément' : 'Ajouter un élément'}
                                    </h3>
                                    <p className="text-[13px] text-[#637069]">
                                        {categories[category]}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="admin-field mb-5">
                                <label>Que voulez-vous ajouter ?</label>
                                <select
                                    value={category}
                                    onChange={(event) => selectCategory(event.target.value)}
                                >
                                    {Object.entries(categories).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="admin-form-grid md:grid-cols-[1fr_120px]">
                                <div className="admin-field">
                                    <label>{currentHint.label}</label>
                                    <input
                                        value={form.data.label}
                                        onChange={(e) => form.setData('label', e.target.value)}
                                        required
                                        placeholder={currentHint.placeholder}
                                    />
                                    {form.errors.label && (
                                        <span className="text-[11px] text-[#c0392b] font-medium">{form.errors.label}</span>
                                    )}
                                </div>
                                <div className="admin-field">
                                    <label>Ordre</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            
                            <div className="admin-field mt-4">
                                <label>Description <span className="text-[#9aaa9f] font-normal lowercase">(facultative)</span></label>
                                <input
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    placeholder="Information utile pour l’équipe"
                                />
                            </div>
                            
                            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                                <label className="flex items-center gap-2.5 text-[13px] font-medium text-[#17352a] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.data.active}
                                        onChange={(e) => form.setData('active', e.target.checked)}
                                        className="size-4.5 rounded text-[#174a31] focus:ring-[#174a31]/20 cursor-pointer"
                                    />
                                    Visible dans l’application
                                </label>
                                <div className="flex gap-2">
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={reset}
                                            className="admin-btn-secondary"
                                        >
                                            Annuler
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="admin-btn-submit"
                                    >
                                        {editing ? 'Enregistrer' : 'Ajouter au référentiel'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="admin-card">
                            <div className="flex flex-col justify-between gap-3 border-b border-[#e5e1d8] p-5 sm:flex-row sm:items-center">
                                <div>
                                    <h3 className="font-semibold text-[15px] text-[#17352a]">{categories[category]}</h3>
                                    <p className="text-[12.5px] text-[#637069]">{visible.length} élément(s)</p>
                                </div>
                                <div className="admin-search mb-0 w-full sm:w-auto">
                                    <Search size={16} />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Rechercher…"
                                    />
                                </div>
                            </div>
                            
                            <div className="divide-y divide-[#e5e1d8]">
                                {visible.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#f9f8f5] transition-colors">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-[13.5px] text-[#17352a]">{item.label}</span>
                                                {isTeamCategory && (
                                                    item.member_account ? (
                                                        <span className="admin-badge admin-badge--green">
                                                            <UserCheck size={12} />
                                                            Compte : {item.member_account.name}
                                                        </span>
                                                    ) : (
                                                        <span className="admin-badge admin-badge--gold">
                                                            SANS COMPTE
                                                        </span>
                                                    )
                                                )}
                                                <span className={`admin-badge ${item.active ? 'admin-badge--gray' : ''}`} style={!item.active ? { background: '#eeeae2', color: '#797a73' } : {}}>
                                                    {item.active ? 'ACTIF' : 'MASQUÉ'}
                                                </span>
                                            </div>
                                            {item.description && (
                                                <p className="mt-1 truncate text-[12.5px] text-[#637069]">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            {isTeamCategory && !item.member_account && (
                                                <Link
                                                    href={`/admin/members?reference_item_id=${item.id}`}
                                                    className="admin-btn-icon"
                                                    aria-label={`Créer un compte pour ${item.label}`}
                                                    title="Créer le compte de connexion"
                                                >
                                                    <UserPlus size={15} />
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => edit(item)}
                                                className="admin-btn-icon"
                                                aria-label="Modifier"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => remove(item)}
                                                className="admin-btn-icon hover:!bg-[#fdf2f1] hover:!text-[#c0392b] hover:!border-[#f5c6c2]"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!visible.length && (
                                    <div className="admin-empty">
                                        Aucun élément dans cette catégorie.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
