import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Article = {
    id: number;
    code: string;
    categorie: string;
    libelle: string;
    unite_achat_id: number;
    unite_usage_id: number;
    facteur_personnalise?: string | null;
    produit_terrain?: string | null;
    prix_unitaire?: string | null;
    seuil_min?: string | null;
    site_id?: number | null;
    centre_cout?: string | null;
    actif: boolean;
};
type Option = { id: number; nom: string; dimension?: string };
type Data = {
    code: string;
    categorie: string;
    libelle: string;
    unite_achat_id: string;
    unite_usage_id: string;
    facteur_personnalise: string;
    produit_terrain: string;
    prix_unitaire: string;
    seuil_min: string;
    site_id: string;
    centre_cout: string;
    actif: boolean;
    _create_another: boolean;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-900';

export default function ArticleForm({
    mode,
    article,
    categories,
    unites,
    sites,
}: {
    mode: 'create' | 'edit';
    article: Article | null;
    categories: Record<string, string>;
    unites: Option[];
    sites: Option[];
}) {
    const form = useForm<Data>({
        code: article?.code ?? '',
        categorie: article?.categorie ?? '',
        libelle: article?.libelle ?? '',
        unite_achat_id: article ? String(article.unite_achat_id) : '',
        unite_usage_id: article ? String(article.unite_usage_id) : '',
        facteur_personnalise: article?.facteur_personnalise ?? '',
        produit_terrain: article?.produit_terrain ?? '',
        prix_unitaire: article?.prix_unitaire ?? '',
        seuil_min: article?.seuil_min ?? '',
        site_id: article?.site_id ? String(article.site_id) : '',
        centre_cout: article?.centre_cout ?? '',
        actif: article?.actif ?? true,
        _create_another: false,
    });
    const selectedPurchase = unites.find(
        (unit) => String(unit.id) === form.data.unite_achat_id,
    );
    const usageUnits = selectedPurchase
        ? unites.filter((unit) => unit.dimension === selectedPurchase.dimension)
        : unites;
    const title =
        mode === 'create'
            ? 'Create Article'
            : `Edit ${article?.libelle ?? 'Article'}`;
    const save = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));

        if (mode === 'create') {
            form.post('/magasin');
        } else if (article) {
            form.put(`/magasin/${article.id}`);
        }
    };

    return (
        <>
            <Head title={title} />
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
                        {mode === 'create' ? 'Create' : 'Edit'}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            save(false);
                        }}
                        className="grid gap-x-6 gap-y-5 lg:grid-cols-2"
                    >
                        <Field
                            label="Code"
                            required
                            help="ENG-001, PHY-004, ALI-002…"
                            error={form.errors.code}
                        >
                            <input
                                required
                                autoFocus
                                value={form.data.code}
                                onChange={(e) =>
                                    form.setData('code', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Catégorie"
                            required
                            error={form.errors.categorie}
                        >
                            <Select
                                value={form.data.categorie}
                                set={(v) => form.setData('categorie', v)}
                                options={Object.entries(categories)}
                                required
                            />
                        </Field>
                        <Field
                            label="Libellé"
                            required
                            full
                            error={form.errors.libelle}
                        >
                            <input
                                required
                                value={form.data.libelle}
                                onChange={(e) =>
                                    form.setData('libelle', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Unité d'achat — le magasinier"
                            required
                            error={form.errors.unite_achat_id}
                        >
                            <Select
                                value={form.data.unite_achat_id}
                                set={(v) => {
                                    form.setData('unite_achat_id', v);
                                    const unit = unites.find(
                                        (u) => String(u.id) === v,
                                    );

                                    if (
                                        !usageUnits.some(
                                            (u) =>
                                                String(u.id) ===
                                                form.data.unite_usage_id,
                                        ) ||
                                        (unit &&
                                            unites.find(
                                                (u) =>
                                                    String(u.id) ===
                                                    form.data.unite_usage_id,
                                            )?.dimension !== unit.dimension)
                                    ) {
                                        form.setData('unite_usage_id', '');
                                    }
                                }}
                                options={unites.map((u) => [
                                    String(u.id),
                                    u.nom,
                                ])}
                                required
                            />
                        </Field>
                        <Field
                            label="Unité d'usage — le terrain"
                            required
                            help="Même dimension que l'unité d'achat : masse avec masse, volume avec volume."
                            error={form.errors.unite_usage_id}
                        >
                            <Select
                                value={form.data.unite_usage_id}
                                set={(v) => form.setData('unite_usage_id', v)}
                                options={usageUnits.map((u) => [
                                    String(u.id),
                                    u.nom,
                                ])}
                                required
                            />
                        </Field>
                        <Field
                            label="Conditionnement réel (unités de base)"
                            help="Sac de 37 kg au lieu de 50 : saisir 37000."
                            error={form.errors.facteur_personnalise}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.000001"
                                value={form.data.facteur_personnalise}
                                onChange={(e) =>
                                    form.setData(
                                        'facteur_personnalise',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Nom au champ"
                            help="GLAZE, Urée 46% N — le nom que le plan utilise."
                            error={form.errors.produit_terrain}
                        >
                            <input
                                value={form.data.produit_terrain}
                                onChange={(e) =>
                                    form.setData(
                                        'produit_terrain',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Prix par unité d'achat (USD)"
                            error={form.errors.prix_unitaire}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={form.data.prix_unitaire}
                                onChange={(e) =>
                                    form.setData(
                                        'prix_unitaire',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Seuil d'alerte (en unité d'usage)"
                            error={form.errors.seuil_min}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={form.data.seuil_min}
                                onChange={(e) =>
                                    form.setData('seuil_min', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Site" error={form.errors.site_id}>
                            <Select
                                value={form.data.site_id}
                                set={(v) => form.setData('site_id', v)}
                                options={sites.map((s) => [
                                    String(s.id),
                                    s.nom,
                                ])}
                            />
                        </Field>
                        <Field
                            label="Centre de coût"
                            error={form.errors.centre_cout}
                        >
                            <input
                                value={form.data.centre_cout}
                                onChange={(e) =>
                                    form.setData('centre_cout', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <label className="flex items-center gap-3 pt-7 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={form.data.actif}
                                onChange={(e) =>
                                    form.setData('actif', e.target.checked)
                                }
                                className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                            />
                            Actif
                        </label>
                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                            <button
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                {mode === 'create' ? 'Create' : 'Save changes'}
                            </button>
                            {mode === 'create' && (
                                <button
                                    type="button"
                                    onClick={() => save(true)}
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                                >
                                    Create & create another
                                </button>
                            )}
                            <Link
                                href="/magasin"
                                className="px-4 py-2.5 text-sm font-semibold"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}
function Select({
    value,
    set,
    options,
    required,
}: {
    value: string;
    set: (value: string) => void;
    options: Array<[string, string]>;
    required?: boolean;
}) {
    return (
        <select
            value={value}
            required={required}
            onChange={(e) => set(e.target.value)}
            className={input}
        >
            <option value="">Select an option</option>
            {options.map(([key, label]) => (
                <option key={key} value={key}>
                    {label}
                </option>
            ))}
        </select>
    );
}
function Field({
    label,
    required,
    help,
    error,
    full,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    error?: string;
    full?: boolean;
    children: ReactNode;
}) {
    return (
        <label className={full ? 'lg:col-span-2' : ''}>
            <span className="text-sm font-medium">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1.5 block text-xs text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
