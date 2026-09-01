import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type ValueOption = { value: string; label: string };
type Parcelle = {
    id: number;
    code: string;
    nom: string;
    type: string;
    parent_id?: number | null;
    site_id?: number | null;
    surface_m2?: string | null;
    nb_planches?: number | null;
    irrigation?: string | null;
    exposition?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    actif: boolean;
    note?: string | null;
};
type Props = {
    mode: 'create' | 'edit';
    parcelle: Parcelle | null;
    options: {
        types: ValueOption[];
        parents: Array<{ id: number; code: string; nom: string }>;
        sites: Array<{ id: number; code: string; nom: string }>;
        irrigations: ValueOption[];
        expositions: ValueOption[];
    };
};
type FormData = {
    code: string;
    nom: string;
    type: string;
    parent_id: string;
    site_id: string;
    surface_m2: string;
    nb_planches: string;
    irrigation: string;
    exposition: string;
    latitude: string;
    longitude: string;
    actif: boolean;
    note: string;
    _create_another: boolean;
};

const fieldClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export default function ParcelleForm({ mode, parcelle, options }: Props) {
    const form = useForm<FormData>({
        code: parcelle?.code ?? '',
        nom: parcelle?.nom ?? '',
        type: parcelle?.type ?? 'parc',
        parent_id: parcelle?.parent_id ? String(parcelle.parent_id) : '',
        site_id: parcelle?.site_id ? String(parcelle.site_id) : '',
        surface_m2: parcelle?.surface_m2 ?? '',
        nb_planches: parcelle?.nb_planches ? String(parcelle.nb_planches) : '',
        irrigation: parcelle?.irrigation ?? '',
        exposition: parcelle?.exposition ?? '',
        latitude: parcelle?.latitude ?? '',
        longitude: parcelle?.longitude ?? '',
        actif: parcelle?.actif ?? true,
        note: parcelle?.note ?? '',
        _create_another: false,
    });
    const title =
        mode === 'create'
            ? 'Create Parcelle'
            : `Edit ${parcelle?.nom ?? 'Parcelle'}`;
    const cancelHref = parcelle ? `/terrain/${parcelle.id}` : '/terrain';

    const persist = (createAnother: boolean) => {
        form.transform((data) => ({ ...data, _create_another: createAnother }));

        if (mode === 'create') {
            form.post('/terrain');
        } else if (parcelle) {
            form.put(`/terrain/${parcelle.id}`);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        persist(false);
    };

    return (
        <>
            <Head title={title} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/terrain"
                            className="hover:text-emerald-600"
                        >
                            Parcelles
                        </Link>
                        <span className="mx-2">›</span>
                        {mode === 'create' ? 'Create' : 'Edit'}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    <form
                        onSubmit={submit}
                        className="grid gap-x-6 gap-y-5 lg:grid-cols-2"
                    >
                        <Field
                            label="Code"
                            required
                            error={form.errors.code}
                            help="K1-B-B1 pour le parc B1 du bloc B au site K1."
                        >
                            <input
                                required
                                autoFocus
                                value={form.data.code}
                                onChange={(e) =>
                                    form.setData('code', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field
                            label="Nom usuel"
                            required
                            error={form.errors.nom}
                            help="B1, Bloc B, Planche 07…"
                        >
                            <input
                                required
                                value={form.data.nom}
                                onChange={(e) =>
                                    form.setData('nom', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Niveau" required error={form.errors.type}>
                            <select
                                required
                                value={form.data.type}
                                onChange={(e) =>
                                    form.setData('type', e.target.value)
                                }
                                className={fieldClass}
                            >
                                {options.types.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Rattaché à" error={form.errors.parent_id}>
                            <select
                                value={form.data.parent_id}
                                onChange={(e) =>
                                    form.setData('parent_id', e.target.value)
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.parents.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.code} — {item.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Site" error={form.errors.site_id}>
                            <select
                                value={form.data.site_id}
                                onChange={(e) =>
                                    form.setData('site_id', e.target.value)
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.sites.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Surface (m²)"
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
                                className={fieldClass}
                            />
                        </Field>
                        <Field
                            label="Nombre de planches"
                            error={form.errors.nb_planches}
                            help="Une planche = 10 m². Les doses du plan sont exprimées par planche."
                        >
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={form.data.nb_planches}
                                onChange={(e) =>
                                    form.setData('nb_planches', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field
                            label="Irrigation"
                            error={form.errors.irrigation}
                        >
                            <select
                                value={form.data.irrigation}
                                onChange={(e) =>
                                    form.setData('irrigation', e.target.value)
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.irrigations.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Exposition"
                            error={form.errors.exposition}
                            help="Le maïs SC419 n'est pas viable sous 6 h de soleil direct."
                        >
                            <select
                                value={form.data.exposition}
                                onChange={(e) =>
                                    form.setData('exposition', e.target.value)
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.expositions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Latitude" error={form.errors.latitude}>
                            <input
                                type="number"
                                step="0.0000001"
                                value={form.data.latitude}
                                onChange={(e) =>
                                    form.setData('latitude', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Longitude" error={form.errors.longitude}>
                            <input
                                type="number"
                                step="0.0000001"
                                value={form.data.longitude}
                                onChange={(e) =>
                                    form.setData('longitude', e.target.value)
                                }
                                className={fieldClass}
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
                            Active
                        </label>
                        <Field label="Note" full error={form.errors.note}>
                            <textarea
                                rows={3}
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData('note', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {mode === 'create' ? 'Create' : 'Save changes'}
                            </button>
                            {mode === 'create' && (
                                <button
                                    type="button"
                                    disabled={form.processing}
                                    onClick={() => persist(true)}
                                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900"
                                >
                                    Create & create another
                                </button>
                            )}
                            <Link
                                href={cancelHref}
                                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                <span className="mt-1.5 block text-xs font-medium text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
