import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    ChevronDown,
    Pencil,
    Search,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Article = {
    id: number;
    code: string;
    categorie: string;
    libelle: string;
    produit_terrain?: string | null;
    stock_usage: number;
    stock_achat: number;
    sous_seuil: boolean;
    seuil_min?: string | null;
    valeur_stock: number;
    actif: boolean;
    unite_achat: { nom: string };
    unite_usage: { id: number; nom: string; dimension: string };
};
type Unit = { id: number; nom: string; dimension: string };

export default function StoreIndex({
    articles,
    categories,
    unites,
}: {
    articles: Article[];
    categories: Record<string, string>;
    unites: Unit[];
}) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [active, setActive] = useState('1');
    const [selected, setSelected] = useState<Article | null>(null);
    const [dialog, setDialog] = useState<'entree' | 'sortie' | null>(null);
    const movement = useForm({ quantite: '', unite_id: '', motif: '' });
    const rows = useMemo(() => {
        const needle = query.toLocaleLowerCase('fr');

        return articles.filter(
            (article) =>
                (!needle ||
                    `${article.code} ${article.libelle} ${article.produit_terrain ?? ''}`
                        .toLocaleLowerCase('fr')
                        .includes(needle)) &&
                (!category || article.categorie === category) &&
                (!active || String(Number(article.actif)) === active),
        );
    }, [articles, query, category, active]);
    const compatibleUnits = selected
        ? unites.filter(
              (unit) => unit.dimension === selected.unite_usage.dimension,
          )
        : [];
    const openMovement = (article: Article, type: 'entree' | 'sortie') => {
        setSelected(article);
        setDialog(type);
        movement.setData({
            quantite: '',
            unite_id: String(article.unite_usage.id),
            motif: '',
        });
        movement.clearErrors();
    };
    const closeMovement = () => {
        setDialog(null);
        setSelected(null);
        movement.clearErrors();
    };

    return (
        <>
            <Head title="Articles" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/magasin"
                            className="hover:text-emerald-600"
                        >
                            Articles
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Articles
                        </h1>
                        <Link
                            href="/magasin/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                        >
                            Nouvel article
                        </Link>
                    </header>
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap justify-end gap-2 border-b p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <select
                                aria-label="Catégorie"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option value="">Toutes les catégories</option>
                                {Object.entries(categories).map(
                                    ([key, label]) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                            <select
                                aria-label="Actif"
                                value={active}
                                onChange={(e) => setActive(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option value="">Tous</option>
                                <option value="1">Actif: Yes</option>
                                <option value="0">Actif: No</option>
                            </select>
                        </div>
                        {active === '1' && (
                            <div className="px-5 pt-4 text-sm">
                                <strong>Active filters</strong>
                                <span className="ml-3 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                                    Actif: Yes
                                </span>
                            </div>
                        )}
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {rows.length} result{rows.length !== 1 ? 's' : ''}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        {[
                                            'Code',
                                            'Article',
                                            'Stock',
                                            'Valeur',
                                            'Emplacement',
                                            'ABC',
                                            'Dernier inventaire',
                                            'Nom au champ',
                                            'Action',
                                        ].map((h) => (
                                            <th key={h} className="px-5 py-4">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((article) => (
                                        <tr
                                            key={article.id}
                                            className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                        >
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                                strong
                                            >
                                                {article.code}
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                                strong
                                            >
                                                {article.libelle}
                                                <small className="mt-1 block font-normal text-slate-500">
                                                    {categories[
                                                        article.categorie
                                                    ] ?? article.categorie}
                                                </small>
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                <span
                                                    className={
                                                        article.sous_seuil
                                                            ? 'font-semibold text-red-600'
                                                            : ''
                                                    }
                                                >
                                                    {format(
                                                        article.stock_achat,
                                                    )}{' '}
                                                    {article.unite_achat.nom} —
                                                    soit{' '}
                                                    {format(
                                                        article.stock_usage,
                                                    )}{' '}
                                                    {article.unite_usage.nom}
                                                </span>
                                                {article.sous_seuil && (
                                                    <small className="mt-1 block text-red-600">
                                                        SOUS LE SEUIL (
                                                        {article.seuil_min}{' '}
                                                        {
                                                            article.unite_usage
                                                                .nom
                                                        }
                                                        )
                                                    </small>
                                                )}
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                {article.valeur_stock.toLocaleString(
                                                    'fr-FR',
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    },
                                                )}{' '}
                                                $
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                —
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                —
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                jamais
                                            </Cell>
                                            <Cell
                                                href={`/magasin/${article.id}`}
                                            >
                                                {article.produit_terrain ?? '—'}
                                            </Cell>
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-max items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMovement(
                                                                article,
                                                                'entree',
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                                    >
                                                        <ArrowDownToLine
                                                            size={15}
                                                        />
                                                        Entrée
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMovement(
                                                                article,
                                                                'sortie',
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-600"
                                                    >
                                                        <ArrowUpFromLine
                                                            size={15}
                                                        />
                                                        Sortie
                                                    </button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                                                            >
                                                                More actions
                                                                <ChevronDown
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={`/magasin/${article.id}/edit`}
                                                                    className="flex items-center gap-2"
                                                                >
                                                                    <Pencil
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Edit
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                No articles
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
            {dialog && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={dialog === 'entree' ? 'Entrée' : 'Sortie'}
                        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {dialog === 'entree' ? 'Entrée' : 'Sortie'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selected.code} — {selected.libelle}
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={closeMovement}
                            >
                                <X />
                            </button>
                        </div>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                movement.post(
                                    `/magasin/${selected.id}/${dialog}`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: closeMovement,
                                    },
                                );
                            }}
                            className="grid gap-5"
                        >
                            <MovementField
                                label="Quantité"
                                error={movement.errors.quantite}
                            >
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={movement.data.quantite}
                                    onChange={(event) =>
                                        movement.setData(
                                            'quantite',
                                            event.target.value,
                                        )
                                    }
                                    className={movementInput}
                                />
                            </MovementField>
                            <MovementField
                                label="Unité"
                                help="Seules les unités de la même dimension sont proposées."
                                error={movement.errors.unite_id}
                            >
                                <select
                                    required
                                    value={movement.data.unite_id}
                                    onChange={(event) =>
                                        movement.setData(
                                            'unite_id',
                                            event.target.value,
                                        )
                                    }
                                    className={movementInput}
                                >
                                    <option value="">Select an option</option>
                                    {compatibleUnits.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.nom}
                                        </option>
                                    ))}
                                </select>
                            </MovementField>
                            <MovementField
                                label="Motif"
                                error={movement.errors.motif}
                            >
                                <textarea
                                    required
                                    rows={3}
                                    value={movement.data.motif}
                                    onChange={(event) =>
                                        movement.setData(
                                            'motif',
                                            event.target.value,
                                        )
                                    }
                                    className={movementInput}
                                />
                            </MovementField>
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={closeMovement}
                                    className="px-4 py-2.5 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={movement.processing}
                                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
const movementInput =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950';
function MovementField({
    label,
    help,
    error,
    children,
}: {
    label: string;
    help?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="text-sm font-medium">
            {label}
            <span className="text-red-600">*</span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1.5 block text-xs font-normal text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
const format = (value: number) =>
    Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
function Cell({
    href,
    strong,
    children,
}: {
    href: string;
    strong?: boolean;
    children: React.ReactNode;
}) {
    return (
        <td className={`px-5 py-4 ${strong ? 'font-semibold' : ''}`}>
            <Link href={href} className="block">
                {children}
            </Link>
        </td>
    );
}
