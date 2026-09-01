import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

type Option = { id: number; nom?: string; name?: string };
type Plantation = {
    id: number;
    reference: string;
    lieu: string;
    culture?: { nom: string } | null;
};
type ValueOption = { value: string; label: string };
type TaskRecord = {
    id: number;
    titre: string;
    description?: string | null;
    instruction?: string | null;
    departement_id?: number | null;
    site_id?: number | null;
    lieu?: string | null;
    plantation_id?: number | null;
    date_due: string;
    heure_due?: string | null;
    priorite: string;
    source: string;
    responsable_id?: number | null;
    appui_ids: number[];
    informe_ids: number[];
};
type Props = {
    mode: 'create' | 'edit';
    task: TaskRecord | null;
    options: {
        departments: Option[];
        sites: Option[];
        plantations: Plantation[];
        users: Option[];
        priorities: ValueOption[];
        sources: ValueOption[];
    };
};
type FormData = {
    titre: string;
    description: string;
    instruction: string;
    departement_id: string;
    site_id: string;
    lieu: string;
    plantation_id: string;
    date_due: string;
    heure_due: string;
    priorite: string;
    source: string;
    responsable_id: string;
    appui_ids: string[];
    informe_ids: string[];
    justification_demande: string;
    cout_estime: string;
    _create_another: boolean;
};

const today = new Date().toISOString().slice(0, 10);
const fieldClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export default function TaskForm({ mode, task, options }: Props) {
    const form = useForm<FormData>({
        titre: task?.titre ?? '',
        description: task?.description ?? '',
        instruction: task?.instruction ?? '',
        departement_id: task?.departement_id ? String(task.departement_id) : '',
        site_id: task?.site_id ? String(task.site_id) : '',
        lieu: task?.lieu ?? '',
        plantation_id: task?.plantation_id ? String(task.plantation_id) : '',
        date_due: task?.date_due?.slice(0, 10) ?? today,
        heure_due: task?.heure_due?.slice(0, 5) ?? '',
        priorite: task?.priorite ?? 'normale',
        source: task?.source ?? 'manuelle',
        responsable_id: task?.responsable_id ? String(task.responsable_id) : '',
        appui_ids: task?.appui_ids?.map(String) ?? [],
        informe_ids: task?.informe_ids?.map(String) ?? [],
        justification_demande: '',
        cout_estime: '',
        _create_another: false,
    });
    const title =
        mode === 'create' ? 'Create Tâche' : `Edit ${task?.titre ?? 'Tâche'}`;
    const cancelHref = task ? `/registre-ferme/${task.id}` : '/registre-ferme';

    const persist = (createAnother: boolean) => {
        form.transform((data) => ({ ...data, _create_another: createAnother }));

        if (mode === 'create') {
            form.post('/registre-ferme', { preserveScroll: true });
        } else if (task) {
            form.put(`/registre-ferme/${task.id}`, { preserveScroll: true });
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
                            href="/registre-ferme"
                            className="hover:text-emerald-600"
                        >
                            Tâches
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
                            label="Titre"
                            required
                            error={form.errors.titre}
                            full
                        >
                            <input
                                required
                                autoFocus
                                value={form.data.titre}
                                onChange={(event) =>
                                    form.setData('titre', event.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Description" full>
                            <textarea
                                rows={2}
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field
                            label="Instruction — dose, méthode, sécurité"
                            full
                        >
                            <textarea
                                rows={2}
                                value={form.data.instruction}
                                onChange={(event) =>
                                    form.setData(
                                        'instruction',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field
                            label="Département"
                            required
                            error={form.errors.departement_id}
                        >
                            <select
                                required
                                value={form.data.departement_id}
                                onChange={(event) =>
                                    form.setData(
                                        'departement_id',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.departments.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nom}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Site">
                            <select
                                value={form.data.site_id}
                                onChange={(event) =>
                                    form.setData('site_id', event.target.value)
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
                        <Field label="Lieu — parc, atelier, poste">
                            <input
                                value={form.data.lieu}
                                onChange={(event) =>
                                    form.setData('lieu', event.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Plantation liée">
                            <select
                                value={form.data.plantation_id}
                                onChange={(event) =>
                                    form.setData(
                                        'plantation_id',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.plantations.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.reference}
                                        {item.culture
                                            ? ` — ${item.culture.nom}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Échéance"
                            required
                            error={form.errors.date_due}
                        >
                            <input
                                required
                                type="date"
                                value={form.data.date_due}
                                onChange={(event) =>
                                    form.setData('date_due', event.target.value)
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Heure">
                            <input
                                type="time"
                                value={form.data.heure_due}
                                onChange={(event) =>
                                    form.setData(
                                        'heure_due',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            />
                        </Field>
                        <Field label="Priorité" required>
                            <select
                                required
                                value={form.data.priorite}
                                onChange={(event) =>
                                    form.setData('priorite', event.target.value)
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.priorities.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Source">
                            <select
                                disabled={mode === 'edit'}
                                value={form.data.source}
                                onChange={(event) =>
                                    form.setData('source', event.target.value)
                                }
                                className={`${fieldClass} disabled:opacity-60`}
                            >
                                <option value="">Select an option</option>
                                {options.sources.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Responsable — redevable, cible de l'escalade"
                            required
                            error={form.errors.responsable_id}
                        >
                            <select
                                required
                                value={form.data.responsable_id}
                                onChange={(event) =>
                                    form.setData(
                                        'responsable_id',
                                        event.target.value,
                                    )
                                }
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {options.users.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Appuis — co-exécutants">
                            <MultiSelect
                                options={options.users}
                                values={form.data.appui_ids}
                                onChange={(values) =>
                                    form.setData('appui_ids', values)
                                }
                            />
                        </Field>
                        <Field label="Informés — lecture seule">
                            <MultiSelect
                                options={options.users}
                                values={form.data.informe_ids}
                                onChange={(values) =>
                                    form.setData('informe_ids', values)
                                }
                            />
                        </Field>
                        {mode === 'create' && (
                            <>
                                <Field
                                    label="Justification — pourquoi cette action hors plan est nécessaire"
                                    error={form.errors.justification_demande}
                                    full
                                >
                                    <textarea
                                        rows={2}
                                        value={form.data.justification_demande}
                                        onChange={(event) =>
                                            form.setData(
                                                'justification_demande',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                </Field>
                                <Field
                                    label="Coût estimé (USD)"
                                    error={form.errors.cout_estime}
                                >
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.data.cout_estime}
                                        onChange={(event) =>
                                            form.setData(
                                                'cout_estime',
                                                event.target.value,
                                            )
                                        }
                                        className={fieldClass}
                                    />
                                </Field>
                            </>
                        )}
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
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                                >
                                    Create & create another
                                </button>
                            )}
                            <Link
                                href={cancelHref}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
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
    error,
    full,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    full?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label
            className={`block text-sm font-medium ${full ? 'lg:col-span-2' : ''}`}
        >
            {label}
            {required && <span className="text-red-500">*</span>}
            {children}
            {error && (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            )}
        </label>
    );
}

function MultiSelect({
    options,
    values,
    onChange,
}: {
    options: Option[];
    values: string[];
    onChange: (values: string[]) => void;
}) {
    const selected = options.filter((option) =>
        values.includes(String(option.id)),
    );

    return (
        <details className="relative mt-2">
            <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
                {selected.length > 0
                    ? selected.map((item) => item.name).join(', ')
                    : 'Select an option'}
            </summary>
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {options.map((option) => {
                    const value = String(option.id);

                    return (
                        <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <input
                                type="checkbox"
                                checked={values.includes(value)}
                                onChange={(event) =>
                                    onChange(
                                        event.target.checked
                                            ? [...values, value]
                                            : values.filter(
                                                  (item) => item !== value,
                                              ),
                                    )
                                }
                            />
                            {option.name}
                        </label>
                    );
                })}
            </div>
        </details>
    );
}
