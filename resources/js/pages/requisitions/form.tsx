import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Option = { id: number; nom: string };
type Article = { id: number; code: string; libelle: string };
type FormData = {
    type: string;
    objet: string;
    article_id: string;
    quantite: string;
    unite_id: string;
    nouvel_article: string;
    nouvelle_categorie: string;
    montant: string;
    justification: string;
    centre_cout: string;
    _create_another: boolean;
};

const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-900';

export default function RequisitionForm({
    articles,
    unites,
    categories,
}: {
    articles: Article[];
    unites: Option[];
    categories: Record<string, string>;
}) {
    const form = useForm<FormData>({
        type: '', objet: '', article_id: '', quantite: '', unite_id: '',
        nouvel_article: '', nouvelle_categorie: '', montant: '',
        justification: '', centre_cout: '', _create_another: false,
    });
    const save = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));
        form.post('/requisitions');
    };

    return (
        <>
            <Head title="Create Réquisition" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link href="/requisitions" className="hover:text-emerald-600">Réquisitions</Link>
                        <span className="mx-2">›</span>Create
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Create Réquisition</h1>
                    <form
                        onSubmit={(event: FormEvent) => { event.preventDefault(); save(false); }}
                        className="grid gap-x-6 gap-y-5 lg:grid-cols-2"
                    >
                        <Field label="Type de demande" required error={form.errors.type}>
                            <select required value={form.data.type} onChange={(event) => form.setData('type', event.target.value)} className={input}>
                                <option value="">Select an option</option>
                                <option value="STK">STK — sortie de stock</option>
                                <option value="NEW">NEW — achat d'un nouvel article</option>
                                <option value="CSH">CSH — demande de fonds</option>
                            </select>
                        </Field>
                        <Field label="Objet" required full error={form.errors.objet}>
                            <input required value={form.data.objet} onChange={(event) => form.setData('objet', event.target.value)} className={input} />
                        </Field>

                        {form.data.type === 'STK' && <>
                            <Field label="Article du magasin" required error={form.errors.article_id}>
                                <select required value={form.data.article_id} onChange={(event) => form.setData('article_id', event.target.value)} className={input}>
                                    <option value="">Select an option</option>
                                    {articles.map((article) => <option key={article.id} value={article.id}>{article.code} — {article.libelle}</option>)}
                                </select>
                            </Field>
                            <Field label="Quantité" required error={form.errors.quantite}>
                                <input required type="number" min="0.0001" step="0.0001" value={form.data.quantite} onChange={(event) => form.setData('quantite', event.target.value)} className={input} />
                            </Field>
                            <Field label="Unité" required error={form.errors.unite_id}>
                                <select required value={form.data.unite_id} onChange={(event) => form.setData('unite_id', event.target.value)} className={input}>
                                    <option value="">Select an option</option>
                                    {unites.map((unite) => <option key={unite.id} value={unite.id}>{unite.nom}</option>)}
                                </select>
                            </Field>
                        </>}

                        {form.data.type === 'NEW' && <>
                            <Field label="Article à acheter" required error={form.errors.nouvel_article}>
                                <input required value={form.data.nouvel_article} onChange={(event) => form.setData('nouvel_article', event.target.value)} className={input} />
                            </Field>
                            <Field label="Catégorie" error={form.errors.nouvelle_categorie}>
                                <select value={form.data.nouvelle_categorie} onChange={(event) => form.setData('nouvelle_categorie', event.target.value)} className={input}>
                                    <option value="">Select an option</option>
                                    {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </Field>
                        </>}

                        {(form.data.type === 'NEW' || form.data.type === 'CSH') &&
                            <Field label="Montant / estimation (USD)" required error={form.errors.montant}>
                                <input required type="number" min="0" step="0.01" value={form.data.montant} onChange={(event) => form.setData('montant', event.target.value)} className={input} />
                            </Field>}

                        <Field label="Justification" required full error={form.errors.justification}>
                            <textarea required rows={3} value={form.data.justification} onChange={(event) => form.setData('justification', event.target.value)} className={input} />
                        </Field>
                        <Field label="Centre de coût" error={form.errors.centre_cout}>
                            <input value={form.data.centre_cout} onChange={(event) => form.setData('centre_cout', event.target.value)} className={input} />
                        </Field>
                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                            <button disabled={form.processing} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Create</button>
                            <button type="button" disabled={form.processing} onClick={() => save(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">Create &amp; create another</button>
                            <Link href="/requisitions" className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Link>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}

function Field({ label, required, full, error, children }: { label: string; required?: boolean; full?: boolean; error?: string; children: ReactNode }) {
    return <label className={full ? 'lg:col-span-2' : ''}>
        <span className="text-sm font-medium">{label}{required && <span className="text-red-600">*</span>}</span>
        {children}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>;
}
