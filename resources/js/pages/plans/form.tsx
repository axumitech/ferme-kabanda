import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FilePlus2 } from 'lucide-react';
import type { FormEvent } from 'react';

export default function PlanForm() {
    const form = useForm({
        code: '',
        libelle: '',
        note: '',
        create_another: false,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        save(false);
    };

    const save = (createAnother: boolean) => {
        form.transform((data) => ({
            ...data,
            create_another: createAnother,
        }));
        form.post('/plans', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Create Plan" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    <Link
                        href="/plans"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Plans (versions)
                    </Link>
                    <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <FilePlus2 size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[.18em] text-emerald-200 uppercase">
                                    Plans &amp; Gouvernance
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    Create Plan
                                </h1>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
                                    La version est attribuée automatiquement
                                    dans la lignée du code choisi.
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
                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Code du plan
                                        <span className="text-red-600">*</span>
                                    </span>
                                    <input
                                        required
                                        autoFocus
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
                                    <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                                        BTAGRI, BTA-PORC, K2-MAIS — chaque code
                                        a sa propre lignée de versions.
                                    </span>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Intitulé
                                        <span className="text-red-600">*</span>
                                    </span>
                                    <input
                                        required
                                        maxLength={255}
                                        value={form.data.libelle}
                                        onChange={(event) =>
                                            form.setData(
                                                'libelle',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                    <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                                        Plan d’exploitation maraîchage K1 —
                                        campagne 2026-2027
                                    </span>
                                </label>
                                <label className="block md:col-span-2">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Note de version
                                    </span>
                                    <textarea
                                        rows={4}
                                        maxLength={2000}
                                        value={form.data.note}
                                        onChange={(event) =>
                                            form.setData(
                                                'note',
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </label>
                            </div>
                        </section>
                        <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
                            <Link
                                href="/plans"
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

const inputClass =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';
