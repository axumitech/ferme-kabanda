import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileUp } from 'lucide-react';
import type { FormEvent } from 'react';

export default function DocumentReferenceForm({
    types,
}: {
    types: Record<string, string>;
}) {
    const form = useForm<{
        code: string;
        titre: string;
        type: string;
        version: string;
        date_version: string;
        fichier: File | null;
        actif: boolean;
        create_another: boolean;
    }>({
        code: '',
        titre: '',
        type: '',
        version: '',
        date_version: '',
        fichier: null,
        actif: true,
        create_another: false,
    });
    const save = (createAnother: boolean) => {
        form.transform((data) => ({ ...data, create_another: createAnother }));
        form.post('/documents-reference', {
            forceFormData: true,
            preserveScroll: true,
        });
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        save(false);
    };

    return (
        <>
            <Head title="Create Document De Référence" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-5xl space-y-6">
                    <Link
                        href="/documents-reference"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Politiques &amp; procédures
                    </Link>
                    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <FileUp size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[.18em] text-emerald-200 uppercase">
                                    Référentiel documentaire
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    Create Document De Référence
                                </h1>
                                <p className="mt-2 text-sm text-slate-300">
                                    Enregistrez la version officielle et son
                                    fichier PDF.
                                </p>
                            </div>
                        </div>
                    </header>
                    <form onSubmit={submit} className="space-y-6">
                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                {Object.values(form.errors).map((error) => (
                                    <p key={error}>{error}</p>
                                ))}
                            </div>
                        )}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="grid gap-6 md:grid-cols-2">
                                <Field
                                    label="Code"
                                    required
                                    help="POL-BTA-001, PRO-AGR-004…"
                                >
                                    <input
                                        autoFocus
                                        required
                                        maxLength={32}
                                        value={form.data.code}
                                        onChange={(event) =>
                                            form.setData(
                                                'code',
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Titre" required>
                                    <input
                                        required
                                        maxLength={255}
                                        value={form.data.titre}
                                        onChange={(event) =>
                                            form.setData(
                                                'titre',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Type" required>
                                    <select
                                        required
                                        value={form.data.type}
                                        onChange={(event) =>
                                            form.setData(
                                                'type',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        {Object.entries(types).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>
                                <Field label="Version">
                                    <input
                                        maxLength={16}
                                        value={form.data.version}
                                        onChange={(event) =>
                                            form.setData(
                                                'version',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Date de version">
                                    <input
                                        type="date"
                                        value={form.data.date_version}
                                        onChange={(event) =>
                                            form.setData(
                                                'date_version',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field
                                    label="PDF du document"
                                    help="PDF uniquement · 20 Mo maximum"
                                >
                                    <label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40">
                                        <FileUp
                                            size={25}
                                            className="text-emerald-700"
                                        />
                                        <b className="mt-2 text-sm">
                                            {form.data.fichier?.name ||
                                                'Choisir le PDF'}
                                        </b>
                                        <input
                                            type="file"
                                            accept="application/pdf,.pdf"
                                            className="sr-only"
                                            onChange={(event) =>
                                                form.setData(
                                                    'fichier',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </label>
                                </Field>
                                <label className="flex items-center gap-3 md:col-span-2">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={form.data.actif}
                                        onClick={() =>
                                            form.setData(
                                                'actif',
                                                !form.data.actif,
                                            )
                                        }
                                        className={`relative h-7 w-12 rounded-full transition ${form.data.actif ? 'bg-emerald-700' : 'bg-slate-300'}`}
                                    >
                                        <span
                                            className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${form.data.actif ? 'left-6' : 'left-1'}`}
                                        />
                                    </button>
                                    <span>
                                        <b className="text-sm">Actif</b>
                                        <span className="block text-xs text-slate-500">
                                            Le document est proposé dans le
                                            référentiel opérationnel.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </section>
                        <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
                            <Link
                                href="/documents-reference"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Link>
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => save(true)}
                                className="min-h-11 rounded-xl border border-emerald-700 bg-white px-5 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                            >
                                Create &amp; create another
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-xl bg-emerald-700 px-7 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {form.processing ? 'Création…' : 'Create'}
                            </button>
                        </footer>
                    </form>
                </div>
            </main>
        </>
    );
}

function Field({
    label,
    required = false,
    help,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs text-slate-500">
                    {help}
                </span>
            )}
        </label>
    );
}
const inputClass =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';
