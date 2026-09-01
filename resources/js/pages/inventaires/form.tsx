import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type NamedOption = { id: number; nom: string };
type Location = { id: number; code: string; libelle: string };
type FormData = {
    libelle: string; type: string; date_comptage: string; site_id: string;
    categorie: string; classe_abc: string; emplacement_id: string; note: string;
    _create_another: boolean;
};
const input = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-900';

export default function InventoryForm({ types, sites, categories, emplacements, today }: {
    types: Record<string, string>; sites: NamedOption[]; categories: Record<string, string>;
    emplacements: Location[]; today: string;
}) {
    const form = useForm<FormData>({
        libelle: '', type: 'tournant', date_comptage: today, site_id: '', categorie: '',
        classe_abc: '', emplacement_id: '', note: '', _create_another: false,
    });
    const save = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));
        form.post('/inventaires');
    };

    return <>
        <Head title="Create Inventaire" />
        <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full space-y-6">
                <div className="text-sm text-slate-500"><Link href="/inventaires" className="hover:text-emerald-600">Inventaires</Link><span className="mx-2">›</span>Create</div>
                <h1 className="text-3xl font-bold tracking-tight">Create Inventaire</h1>
                <form onSubmit={(event: FormEvent) => { event.preventDefault(); save(false); }} className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
                    <Field label="Intitulé" required help="Inventaire tournant — engrais, août 2026" error={form.errors.libelle}>
                        <input required autoFocus value={form.data.libelle} onChange={(event) => form.setData('libelle', event.target.value)} className={input} />
                    </Field>
                    <Field label="Type" required error={form.errors.type}>
                        <Select required value={form.data.type} set={(value) => form.setData('type', value)} options={Object.entries(types)} />
                    </Field>
                    <Field label="Date de comptage" required error={form.errors.date_comptage}>
                        <input required type="date" value={form.data.date_comptage} onChange={(event) => form.setData('date_comptage', event.target.value)} className={input} />
                    </Field>
                    <Field label="Site" error={form.errors.site_id}>
                        <Select value={form.data.site_id} set={(value) => form.setData('site_id', value)} options={sites.map((site) => [String(site.id), site.nom])} />
                    </Field>
                    <Field label="Limiter à une catégorie" error={form.errors.categorie}>
                        <Select value={form.data.categorie} set={(value) => form.setData('categorie', value)} options={Object.entries(categories)} />
                    </Field>
                    <Field label="Limiter à une classe ABC" error={form.errors.classe_abc}>
                        <Select value={form.data.classe_abc} set={(value) => form.setData('classe_abc', value)} options={[
                            ['A', 'A — forte valeur, à compter chaque mois'],
                            ['B', 'B — valeur moyenne, chaque trimestre'],
                            ['C', "C — faible valeur, une fois l'an"],
                        ]} />
                    </Field>
                    <Field label="Limiter à un emplacement" error={form.errors.emplacement_id}>
                        <Select value={form.data.emplacement_id} set={(value) => form.setData('emplacement_id', value)} options={emplacements.map((location) => [String(location.id), `${location.code} — ${location.libelle}`])} />
                    </Field>
                    <Field label="Note" full error={form.errors.note}>
                        <textarea rows={3} value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} className={input} />
                    </Field>
                    <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                        <button disabled={form.processing} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Create</button>
                        <button type="button" disabled={form.processing} onClick={() => save(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">Create &amp; create another</button>
                        <Link href="/inventaires" className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Link>
                    </div>
                </form>
            </div>
        </main>
    </>;
}

function Field({ label, required, help, error, full, children }: { label: string; required?: boolean; help?: string; error?: string; full?: boolean; children: ReactNode }) {
    return <label className={full ? 'lg:col-span-2' : ''}><span className="text-sm font-medium">{label}{required && <span className="text-red-600">*</span>}</span>{children}{help && <span className="mt-1 block text-xs text-slate-500">{help}</span>}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
function Select({ value, set, options, required }: { value: string; set: (value: string) => void; options: string[][]; required?: boolean }) {
    return <select required={required} value={value} onChange={(event) => set(event.target.value)} className={input}><option value="">Select an option</option>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
}
