import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
type Culture = { id: number; nom: string; unite_travail: string };
type Parcelle = {
    id: number;
    code: string;
    nom: string;
    site_id?: number | null;
    cultures_en_place: number;
};
type Props = {
    options: {
        cultures: Culture[];
        parcelles: Parcelle[];
        sites: Array<{ id: number; nom: string }>;
    };
    today: string;
};
type Data = {
    culture_id: string;
    parcelle_id: string;
    lieu: string;
    surface_m2: string;
    site_id: string;
    j0: string;
    quantite: string;
    unite: string;
    forcer_rotation: boolean;
    note: string;
    _create_another: boolean;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900';
export default function PlantationForm({ options, today }: Props) {
    const form = useForm<Data>({
        culture_id: '',
        parcelle_id: '',
        lieu: '',
        surface_m2: '',
        site_id: '',
        j0: today,
        quantite: '',
        unite: '',
        forcer_rotation: false,
        note: '',
        _create_another: false,
    });
    const chooseCulture = (id: string) =>
        form.setData((d) => ({
            ...d,
            culture_id: id,
            unite:
                options.cultures.find((c) => String(c.id) === id)
                    ?.unite_travail ?? '',
        }));
    const chooseParcel = (id: string) => {
        const p = options.parcelles.find((x) => String(x.id) === id);
        form.setData((d) => ({
            ...d,
            parcelle_id: id,
            lieu: p?.nom ?? '',
            site_id: p?.site_id ? String(p.site_id) : '',
        }));
    };
    const persist = (again: boolean) => {
        form.transform((d) => ({ ...d, _create_another: again }));
        form.post('/plantations');
    };
    const submit = (e: FormEvent) => {
        e.preventDefault();
        persist(false);
    };

    return (
        <>
            <Head title="Create Plantation" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/plantations"
                            className="hover:text-emerald-600"
                        >
                            Plantations
                        </Link>
                        <span className="mx-2">›</span>Create
                    </div>
                    <h1 className="text-3xl font-bold">Create Plantation</h1>
                    <form
                        onSubmit={submit}
                        className="grid gap-x-6 gap-y-5 lg:grid-cols-2"
                    >
                        <Field
                            label="Culture"
                            required
                            error={form.errors.culture_id}
                        >
                            <select
                                required
                                value={form.data.culture_id}
                                onChange={(e) => chooseCulture(e.target.value)}
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.cultures.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Parcelle"
                            required
                            help="Un même parc porte autant de cultures simultanées que nécessaire."
                            error={form.errors.parcelle_id}
                        >
                            <select
                                required
                                value={form.data.parcelle_id}
                                onChange={(e) => chooseParcel(e.target.value)}
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.parcelles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.code} — {p.nom}
                                        {p.cultures_en_place
                                            ? ` (${p.cultures_en_place} culture(s) en place)`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Libellé du lieu"
                            help="Rempli automatiquement depuis la parcelle."
                            error={form.errors.lieu}
                        >
                            <input
                                value={form.data.lieu}
                                onChange={(e) =>
                                    form.setData('lieu', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Surface occupée (m²)"
                            error={form.errors.surface_m2}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.surface_m2}
                                onChange={(e) =>
                                    form.setData('surface_m2', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Site" error={form.errors.site_id}>
                            <select
                                value={form.data.site_id}
                                onChange={(e) =>
                                    form.setData('site_id', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="J0 — semis ou repiquage"
                            required
                            error={form.errors.j0}
                        >
                            <input
                                required
                                type="date"
                                value={form.data.j0}
                                onChange={(e) =>
                                    form.setData('j0', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Quantité" error={form.errors.quantite}>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.quantite}
                                onChange={(e) =>
                                    form.setData('quantite', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Unité — propre à la culture"
                            help="Héritée de la culture, modifiable ici."
                            error={form.errors.unite}
                        >
                            <input
                                value={form.data.unite}
                                onChange={(e) =>
                                    form.setData('unite', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <label className="lg:col-span-2">
                            <span className="flex items-center gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={form.data.forcer_rotation}
                                    onChange={(e) =>
                                        form.setData(
                                            'forcer_rotation',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-5 w-5 rounded"
                                />
                                Forcer malgré la rotation
                            </span>
                            <span className="mt-1 block pl-8 text-xs text-slate-500">
                                La dérogation est journalisée.
                            </span>
                        </label>
                        <Field label="Note" full>
                            <textarea
                                rows={3}
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData('note', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <div className="flex gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                            <button
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                onClick={() => persist(true)}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Create & create another
                            </button>
                            <Link
                                href="/plantations"
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
