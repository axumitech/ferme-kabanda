import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Site = { id: number; nom: string };
type Emplacement = { id: number; code: string; libelle: string; zone?: string | null; type?: string | null; site_id?: number | null; actif: boolean };
type Data = { code: string; libelle: string; zone: string; type: string; site_id: string; actif: boolean; _create_another: boolean };
const input = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export default function EmplacementForm({ mode, emplacement, types, sites }: { mode: 'create' | 'edit'; emplacement: Emplacement | null; types: Record<string, string>; sites: Site[] }) {
    const form = useForm<Data>({
        code: emplacement?.code ?? '', libelle: emplacement?.libelle ?? '', zone: emplacement?.zone ?? '',
        type: emplacement?.type ?? 'casier', site_id: emplacement?.site_id ? String(emplacement.site_id) : '',
        actif: emplacement?.actif ?? true, _create_another: false,
    });
    const title = mode === 'create' ? 'Create Emplacement' : `Edit ${emplacement?.code ?? 'Emplacement'}`;
    const save = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));
        if (mode === 'create') form.post('/emplacements');
        else if (emplacement) form.put(`/emplacements/${emplacement.id}`);
    };

    return <>
        <Head title={title} />
        <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full space-y-6">
                <div className="text-sm text-slate-500"><Link href="/emplacements" className="hover:text-emerald-600">Emplacements</Link><span className="mx-2">›</span>{mode === 'create' ? 'Create' : 'Edit'}</div>
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <form onSubmit={(event: FormEvent) => { event.preventDefault(); save(false); }} className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
                    <Field label="Adresse" required help="A-03-2-07 : Local A, allée 3, niveau 2, casier 07." error={form.errors.code}><input required autoFocus maxLength={24} value={form.data.code} onChange={(event) => form.setData('code', event.target.value)} className={input} /></Field>
                    <Field label="Libellé" required error={form.errors.libelle}><input required value={form.data.libelle} onChange={(event) => form.setData('libelle', event.target.value)} className={input} /></Field>
                    <Field label="Zone" help="Local A, Local B, Chambre froide, Cuve" error={form.errors.zone}><input maxLength={24} value={form.data.zone} onChange={(event) => form.setData('zone', event.target.value)} className={input} /></Field>
                    <Field label="Type" error={form.errors.type}><Select value={form.data.type} set={(value) => form.setData('type', value)} options={Object.entries(types)} /></Field>
                    <Field label="Site" error={form.errors.site_id}><Select value={form.data.site_id} set={(value) => form.setData('site_id', value)} options={sites.map((site) => [String(site.id), site.nom])} /></Field>
                    <label className="flex items-center gap-3 pt-7 text-sm font-medium"><input type="checkbox" checked={form.data.actif} onChange={(event) => form.setData('actif', event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />Actif</label>
                    <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                        <button disabled={form.processing} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{mode === 'create' ? 'Create' : 'Save changes'}</button>
                        {mode === 'create' && <button type="button" disabled={form.processing} onClick={() => save(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">Create &amp; create another</button>}
                        <Link href="/emplacements" className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</Link>
                    </div>
                </form>
            </div>
        </main>
    </>;
}

function Field({ label, required, help, error, children }: { label: string; required?: boolean; help?: string; error?: string; children: ReactNode }) {
    return <label><span className="text-sm font-medium">{label}{required && <span className="text-red-600">*</span>}</span>{children}{help && <span className="mt-1 block text-xs text-slate-500">{help}</span>}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
function Select({ value, set, options }: { value: string; set: (value: string) => void; options: string[][] }) {
    return <select value={value} onChange={(event) => set(event.target.value)} className={input}><option value="">Select an option</option>{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>;
}
