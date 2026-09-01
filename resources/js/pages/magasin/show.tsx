import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

type Article = {
    id: number;
    code: string;
    categorie: string;
    libelle: string;
    produit_terrain?: string | null;
    facteur_personnalise?: string | null;
    prix_unitaire?: string | null;
    seuil_min?: string | null;
    centre_cout?: string | null;
    actif: boolean;
    stock_usage: number;
    stock_achat: number;
    sous_seuil: boolean;
    valeur_stock: number;
    unite_achat: { nom: string };
    unite_usage: { id: number; nom: string; dimension: string };
    site?: { nom: string } | null;
};
type Movement = {
    id: number;
    created_at: string;
    type: string;
    quantite: string;
    motif: string;
    user_nom: string;
    annule_mouvement_id?: number | null;
    unite?: { nom: string } | null;
};
type Unit = { id: number; nom: string; code: string };
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950';

export default function ArticleShow({
    article,
    mouvements,
    unites,
    categories,
}: {
    article: Article;
    mouvements: Movement[];
    unites: Unit[];
    categories: Record<string, string>;
}) {
    const [dialog, setDialog] = useState<'entree' | 'sortie' | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        const action = new URLSearchParams(window.location.search).get(
            'action',
        );

        return action === 'entree' || action === 'sortie' ? action : null;
    });
    const [more, setMore] = useState(false);
    const form = useForm({
        quantite: '',
        unite_id: String(article.unite_usage.id),
        motif: '',
    });
    const close = () => {
        setDialog(null);
        form.clearErrors();
        window.history.replaceState({}, '', `/magasin/${article.id}`);
    };
    const submit = () =>
        form.post(`/magasin/${article.id}/${dialog}`, {
            onSuccess: () => {
                form.reset('quantite', 'motif');
                close();
            },
        });

    return (
        <>
            <Head title={article.libelle} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/magasin"
                            className="hover:text-emerald-600"
                        >
                            Articles
                        </Link>
                        <span className="mx-2">›</span>
                        {article.code}
                        <span className="mx-2">›</span>View
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {article.libelle}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {article.code} ·{' '}
                                {categories[article.categorie] ??
                                    article.categorie}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDialog('entree')}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                Entrée
                            </button>
                            <button
                                onClick={() => setDialog('sortie')}
                                className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                Sortie
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setMore((v) => !v)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
                                >
                                    More actions <ChevronDown size={15} />
                                </button>
                                {more && (
                                    <div className="absolute right-0 z-10 mt-2 min-w-36 rounded-lg border bg-white p-1 shadow-xl dark:bg-slate-900">
                                        <Link
                                            href={`/magasin/${article.id}/edit`}
                                            className="block rounded-md px-4 py-2 text-sm hover:bg-slate-100"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                    {article.sous_seuil && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            SOUS LE SEUIL — minimum {article.seuil_min}{' '}
                            {article.unite_usage.nom}
                        </div>
                    )}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card title="Stock actuel">
                            <div
                                className={`text-3xl font-bold ${article.sous_seuil ? 'text-red-600' : 'text-emerald-700'}`}
                            >
                                {format(article.stock_usage)}{' '}
                                {article.unite_usage.nom}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                Soit {format(article.stock_achat)}{' '}
                                {article.unite_achat.nom}
                            </p>
                            <p className="mt-4 text-sm">
                                Valeur :{' '}
                                <strong>
                                    {Number(
                                        article.valeur_stock,
                                    ).toLocaleString('fr-FR', {
                                        minimumFractionDigits: 2,
                                    })}{' '}
                                    $
                                </strong>
                            </p>
                        </Card>
                        <Card title="Identification">
                            <Details
                                rows={[
                                    ["Unité d'achat", article.unite_achat.nom],
                                    ["Unité d'usage", article.unite_usage.nom],
                                    [
                                        'Nom au champ',
                                        article.produit_terrain ?? '—',
                                    ],
                                    [
                                        'Conditionnement',
                                        article.facteur_personnalise ?? '—',
                                    ],
                                    [
                                        'Statut',
                                        article.actif ? 'Actif' : 'Inactif',
                                    ],
                                ]}
                            />
                        </Card>
                        <Card title="Gestion">
                            <Details
                                rows={[
                                    [
                                        'Prix unitaire',
                                        article.prix_unitaire
                                            ? `${article.prix_unitaire} $`
                                            : '—',
                                    ],
                                    [
                                        "Seuil d'alerte",
                                        article.seuil_min
                                            ? `${article.seuil_min} ${article.unite_usage.nom}`
                                            : '—',
                                    ],
                                    ['Site', article.site?.nom ?? '—'],
                                    [
                                        'Centre de coût',
                                        article.centre_cout ?? '—',
                                    ],
                                ]}
                            />
                        </Card>
                    </div>
                    <Card title="Mouvements — registre en ajout seul">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b bg-slate-50 text-xs text-slate-600 dark:bg-slate-950">
                                    <tr>
                                        {[
                                            'Date',
                                            'Type',
                                            'Quantité',
                                            'Motif',
                                            'Par',
                                        ].map((h) => (
                                            <th key={h} className="px-4 py-3">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {mouvements.map((movement) => (
                                        <tr key={movement.id}>
                                            <td className="px-4 py-3">
                                                {new Date(
                                                    movement.created_at,
                                                ).toLocaleString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${movement.type === 'entree' ? 'bg-emerald-100 text-emerald-700' : movement.annule_mouvement_id ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
                                                >
                                                    {movement.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {movement.quantite}{' '}
                                                {movement.unite?.nom}
                                            </td>
                                            <td className="px-4 py-3">
                                                {movement.motif}
                                            </td>
                                            <td className="px-4 py-3">
                                                {movement.user_nom}
                                            </td>
                                        </tr>
                                    ))}
                                    {mouvements.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-10 text-center text-slate-500"
                                            >
                                                Aucun mouvement.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>
            {dialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        role="dialog"
                        aria-label={dialog === 'entree' ? 'Entrée' : 'Sortie'}
                        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {dialog === 'entree' ? 'Entrée' : 'Sortie'}
                            </h2>
                            <button aria-label="Close" onClick={close}>
                                <X />
                            </button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                submit();
                            }}
                            className="grid gap-5"
                        >
                            <Field
                                label="Quantité"
                                required
                                error={form.errors.quantite}
                            >
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    required
                                    value={form.data.quantite}
                                    onChange={(e) =>
                                        form.setData('quantite', e.target.value)
                                    }
                                    className={input}
                                />
                            </Field>
                            <Field
                                label="Unité"
                                required
                                help="Seules les unités de la même dimension sont proposées."
                                error={form.errors.unite_id}
                            >
                                <select
                                    required
                                    value={form.data.unite_id}
                                    onChange={(e) =>
                                        form.setData('unite_id', e.target.value)
                                    }
                                    className={input}
                                >
                                    <option value="">Select an option</option>
                                    {unites.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.nom}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field
                                label="Motif"
                                required
                                error={form.errors.motif}
                            >
                                <textarea
                                    rows={3}
                                    required
                                    value={form.data.motif}
                                    onChange={(e) =>
                                        form.setData('motif', e.target.value)
                                    }
                                    className={input}
                                />
                            </Field>
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    type="button"
                                    onClick={close}
                                    className="px-4 py-2.5 text-sm font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={form.processing}
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
const format = (value: number) =>
    Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold">{title}</h2>
            <div className="mt-5">{children}</div>
        </section>
    );
}
function Details({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="space-y-3 text-sm">
            {rows.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{key}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                </div>
            ))}
        </dl>
    );
}
function Field({
    label,
    required,
    help,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-600">*</span>}
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
