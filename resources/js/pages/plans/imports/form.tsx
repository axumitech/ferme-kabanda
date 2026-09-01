import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileSpreadsheet, UploadCloud } from 'lucide-react';
import type { FormEvent } from 'react';

export default function PlanImportForm() {
    const form = useForm<{ code_plan: string; fichier: File | null }>({
        code_plan: 'BTAGRI',
        fichier: null,
    });

    return (
        <>
            <Head title="Importer un plan" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-4xl space-y-6">
                    <Link
                        href="/imports-plans"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Imports de plan
                    </Link>
                    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <UploadCloud size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
                                    Plans &amp; Gouvernance
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    Importer un plan
                                </h1>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
                                    Le fichier sera analysé et comparé. Aucune
                                    modification ne sera appliquée avant votre
                                    arbitrage.
                                </p>
                            </div>
                        </div>
                    </header>
                    <form
                        onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            form.post('/imports-plans', {
                                forceFormData: true,
                            });
                        }}
                        className="space-y-6"
                    >
                        {Object.keys(form.errors).length > 0 && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                {Object.values(form.errors).map((error) => (
                                    <p key={error}>{error}</p>
                                ))}
                            </div>
                        )}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="space-y-6">
                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Code du plan
                                        <span className="text-red-600">*</span>
                                    </span>
                                    <input
                                        required
                                        autoFocus
                                        maxLength={32}
                                        value={form.data.code_plan}
                                        onChange={(event) =>
                                            form.setData(
                                                'code_plan',
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                                    />
                                    <span className="mt-1.5 block text-xs text-slate-500">
                                        BTAGRI, BTA-PORC… — chaque code possède
                                        sa propre lignée de versions.
                                    </span>
                                </label>
                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Fichier CSV du plan
                                        <span className="text-red-600">*</span>
                                    </span>
                                    <span className="mt-2 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50">
                                        <FileSpreadsheet
                                            size={34}
                                            className="text-emerald-700"
                                        />
                                        <b className="mt-3 text-sm">
                                            {form.data.fichier?.name ??
                                                'Choisir un fichier CSV'}
                                        </b>
                                        <span className="mt-1 text-xs text-slate-500">
                                            CSV séparé par point-virgule ou
                                            virgule · 10 Mo max.
                                        </span>
                                        <input
                                            type="file"
                                            accept=".csv,text/csv,text/plain"
                                            required
                                            className="sr-only"
                                            onChange={(event) =>
                                                form.setData(
                                                    'fichier',
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                        />
                                    </span>
                                </label>
                            </div>
                        </section>
                        <footer className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
                            <Link
                                href="/imports-plans"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-xl bg-emerald-700 px-7 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {form.processing
                                    ? 'Analyse…'
                                    : 'Importer et analyser'}
                            </button>
                        </footer>
                    </form>
                </div>
            </main>
        </>
    );
}
