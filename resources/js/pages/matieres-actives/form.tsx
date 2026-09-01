import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Matiere = {
    id: number;
    nom: string;
    famille: string;
    groupe_frac?: string | null;
    groupe_irac?: string | null;
    groupe_hrac?: string | null;
    mode_action?: string | null;
    dar_jours?: number | null;
    delai_reentree_heures?: number | null;
    interdit: boolean;
    motif_interdiction?: string | null;
    actif: boolean;
};
type Props = {
    mode: 'create' | 'edit';
    matiere: Matiere | null;
    familles: Record<string, string>;
};
type Data = {
    nom: string;
    famille: string;
    groupe_frac: string;
    groupe_irac: string;
    groupe_hrac: string;
    mode_action: string;
    dar_jours: string;
    delai_reentree_heures: string;
    interdit: boolean;
    motif_interdiction: string;
    actif: boolean;
    _create_another: boolean;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export default function MatiereActiveForm({ mode, matiere, familles }: Props) {
    const form = useForm<Data>({
        nom: matiere?.nom ?? '',
        famille: matiere?.famille ?? '',
        groupe_frac: matiere?.groupe_frac ?? '',
        groupe_irac: matiere?.groupe_irac ?? '',
        groupe_hrac: matiere?.groupe_hrac ?? '',
        mode_action: matiere?.mode_action ?? '',
        dar_jours: matiere?.dar_jours != null ? String(matiere.dar_jours) : '',
        delai_reentree_heures:
            matiere?.delai_reentree_heures != null
                ? String(matiere.delai_reentree_heures)
                : '',
        interdit: matiere?.interdit ?? false,
        motif_interdiction: matiere?.motif_interdiction ?? '',
        actif: matiere?.actif ?? true,
        _create_another: false,
    });
    const title =
        mode === 'create'
            ? 'Create Matière Active'
            : `Edit ${matiere?.nom ?? 'Matière Active'}`;
    const persist = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));

        if (mode === 'create') {
            form.post('/matieres-actives');
        } else if (matiere) {
            form.put(`/matieres-actives/${matiere.id}`);
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
                            href="/matieres-actives"
                            className="hover:text-emerald-600"
                        >
                            Matières Actives
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
                            label="Matière active"
                            required
                            error={form.errors.nom}
                        >
                            <input
                                required
                                autoFocus
                                value={form.data.nom}
                                onChange={(e) =>
                                    form.setData('nom', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Famille"
                            required
                            error={form.errors.famille}
                        >
                            <select
                                required
                                value={form.data.famille}
                                onChange={(e) =>
                                    form.setData('famille', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {Object.entries(familles).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                        {form.data.famille === 'fongicide' && (
                            <Field
                                label="Groupe FRAC"
                                help="Groupe 1 = benzimidazoles — interdit sur site."
                                error={form.errors.groupe_frac}
                            >
                                <input
                                    value={form.data.groupe_frac}
                                    onChange={(e) =>
                                        form.setData(
                                            'groupe_frac',
                                            e.target.value,
                                        )
                                    }
                                    className={input}
                                />
                            </Field>
                        )}
                        {['insecticide', 'acaricide'].includes(
                            form.data.famille,
                        ) && (
                            <Field
                                label="Groupe IRAC"
                                error={form.errors.groupe_irac}
                            >
                                <input
                                    value={form.data.groupe_irac}
                                    onChange={(e) =>
                                        form.setData(
                                            'groupe_irac',
                                            e.target.value,
                                        )
                                    }
                                    className={input}
                                />
                            </Field>
                        )}
                        {form.data.famille === 'herbicide' && (
                            <Field
                                label="Groupe HRAC"
                                error={form.errors.groupe_hrac}
                            >
                                <input
                                    value={form.data.groupe_hrac}
                                    onChange={(e) =>
                                        form.setData(
                                            'groupe_hrac',
                                            e.target.value,
                                        )
                                    }
                                    className={input}
                                />
                            </Field>
                        )}
                        <Field
                            label="Mode d'action"
                            full
                            error={form.errors.mode_action}
                        >
                            <input
                                value={form.data.mode_action}
                                onChange={(e) =>
                                    form.setData('mode_action', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Délai avant récolte (jours)"
                            help="Valeur portée sur l'étiquette du produit. Laisser vide si inconnue : elle sera exigée à la saisie."
                            error={form.errors.dar_jours}
                        >
                            <input
                                type="number"
                                min="0"
                                value={form.data.dar_jours}
                                onChange={(e) =>
                                    form.setData('dar_jours', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Délai de réentrée (heures)"
                            error={form.errors.delai_reentree_heures}
                        >
                            <input
                                type="number"
                                min="0"
                                value={form.data.delai_reentree_heures}
                                onChange={(e) =>
                                    form.setData(
                                        'delai_reentree_heures',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <label className="flex items-center gap-3 pt-7 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={form.data.interdit}
                                onChange={(e) =>
                                    form.setData('interdit', e.target.checked)
                                }
                                className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                            />
                            Interdit sur le site
                        </label>
                        {form.data.interdit && (
                            <Field
                                label="Motif de l'interdiction"
                                required
                                full
                                error={form.errors.motif_interdiction}
                            >
                                <input
                                    required
                                    value={form.data.motif_interdiction}
                                    onChange={(e) =>
                                        form.setData(
                                            'motif_interdiction',
                                            e.target.value,
                                        )
                                    }
                                    className={input}
                                />
                            </Field>
                        )}
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
                                    onClick={() => persist(true)}
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                                >
                                    Create & create another
                                </button>
                            )}
                            <Link
                                href="/matieres-actives"
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
