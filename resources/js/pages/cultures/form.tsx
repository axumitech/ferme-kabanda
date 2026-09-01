import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Culture = {
    id: number;
    code: string;
    nom: string;
    famille?: string | null;
    delai_rotation?: number | null;
    unite_recolte: string;
    unite_travail: string;
    jours_maturite?: number | null;
    actif: boolean;
    note?: string | null;
};
type Props = { mode: 'create' | 'edit'; culture: Culture | null };
type Data = {
    code: string;
    nom: string;
    famille: string;
    delai_rotation: string;
    unite_recolte: string;
    unite_travail: string;
    jours_maturite: string;
    actif: boolean;
    note: string;
    _create_another: boolean;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export default function CultureForm({ mode, culture }: Props) {
    const form = useForm<Data>({
        code: culture?.code ?? '',
        nom: culture?.nom ?? '',
        famille: culture?.famille ?? '',
        delai_rotation: culture?.delai_rotation
            ? String(culture.delai_rotation)
            : '',
        unite_recolte: culture?.unite_recolte ?? 'kg',
        unite_travail: culture?.unite_travail ?? 'planches',
        jours_maturite: culture?.jours_maturite
            ? String(culture.jours_maturite)
            : '',
        actif: culture?.actif ?? true,
        note: culture?.note ?? '',
        _create_another: false,
    });
    const title =
        mode === 'create'
            ? 'Create Culture'
            : `Edit ${culture?.nom ?? 'Culture'}`;
    const persist = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));

        if (mode === 'create') {
            form.post('/cultures');
        } else if (culture) {
            form.put(`/cultures/${culture.id}`);
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
                            href="/cultures"
                            className="hover:text-emerald-600"
                        >
                            Cultures
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
                        <Field label="Code" required error={form.errors.code}>
                            <input
                                required
                                autoFocus
                                maxLength={24}
                                value={form.data.code}
                                onChange={(e) =>
                                    form.setData('code', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Nom" required error={form.errors.nom}>
                            <input
                                required
                                value={form.data.nom}
                                onChange={(e) =>
                                    form.setData('nom', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Famille botanique"
                            help="La rotation se contrôle par famille."
                            error={form.errors.famille}
                        >
                            <input
                                value={form.data.famille}
                                onChange={(e) =>
                                    form.setData('famille', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Délai de rotation (cycles)"
                            help="Cycles à attendre avant de replanter la même famille au même endroit."
                            error={form.errors.delai_rotation}
                        >
                            <input
                                type="number"
                                min="0"
                                value={form.data.delai_rotation}
                                onChange={(e) =>
                                    form.setData(
                                        'delai_rotation',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Unité de récolte"
                            required
                            error={form.errors.unite_recolte}
                        >
                            <input
                                required
                                value={form.data.unite_recolte}
                                onChange={(e) =>
                                    form.setData(
                                        'unite_recolte',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Unité de travail"
                            required
                            help="planches, pieds, lignes, m² — chaque culture a la sienne."
                            error={form.errors.unite_travail}
                        >
                            <input
                                required
                                value={form.data.unite_travail}
                                onChange={(e) =>
                                    form.setData(
                                        'unite_travail',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Jours à maturité"
                            error={form.errors.jours_maturite}
                        >
                            <input
                                type="number"
                                min="0"
                                value={form.data.jours_maturite}
                                onChange={(e) =>
                                    form.setData(
                                        'jours_maturite',
                                        e.target.value,
                                    )
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
                            Active
                        </label>
                        <Field label="Note" full error={form.errors.note}>
                            <textarea
                                rows={3}
                                value={form.data.note}
                                onChange={(e) =>
                                    form.setData('note', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
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
                                href="/cultures"
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
