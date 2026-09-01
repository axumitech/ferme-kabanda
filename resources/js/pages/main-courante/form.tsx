import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Camera, Clock3, ShieldCheck } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type Site = { id: number; code: string; nom: string };
const control =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

export default function DailyLogForm({
    currentDateTime,
    types,
    sites,
}: {
    currentDateTime: string;
    types: Record<string, string>;
    sites: Site[];
}) {
    const form = useForm<{
        survenu_le: string;
        type: string;
        site_id: string;
        lieu: string;
        objet: string;
        personne: string;
        vehicule: string;
        piece_identite: string;
        photo: File | null;
        _create_another: boolean;
    }>({
        survenu_le: currentDateTime,
        type: '',
        site_id: '',
        lieu: '',
        objet: '',
        personne: '',
        vehicule: '',
        piece_identite: '',
        photo: null,
        _create_another: false,
    });
    const save = (createAnother: boolean) => {
        form.transform((data) => ({ ...data, _create_another: createAnother }));
        form.post('/main-courante', { forceFormData: true });
    };

    return (
        <>
            <Head title="Create Écriture" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-7xl space-y-6">
                    <Link
                        href="/main-courante"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Main courante
                    </Link>
                    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <BookOpen size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
                                    Registre du poste de garde
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    Create Écriture
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                                    Consignez les faits chronologiquement. Une
                                    écriture validée est immuable et ne peut pas
                                    être raturée.
                                </p>
                            </div>
                        </div>
                    </header>

                    <form
                        onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            save(false);
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

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
                                <Clock3
                                    size={20}
                                    className="text-emerald-700"
                                />
                                <div>
                                    <h2 className="font-bold">Fait constaté</h2>
                                    <p className="text-sm text-slate-500">
                                        Quand, où et de quelle nature ?
                                    </p>
                                </div>
                            </header>
                            <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2 xl:grid-cols-4">
                                <Field
                                    label="Date et heure"
                                    required
                                    error={form.errors.survenu_le}
                                >
                                    <input
                                        required
                                        type="datetime-local"
                                        max={currentDateTime}
                                        className={control}
                                        value={form.data.survenu_le}
                                        onChange={(event) =>
                                            form.setData(
                                                'survenu_le',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Nature"
                                    required
                                    error={form.errors.type}
                                >
                                    <select
                                        required
                                        autoFocus
                                        className={control}
                                        value={form.data.type}
                                        onChange={(event) =>
                                            form.setData(
                                                'type',
                                                event.target.value,
                                            )
                                        }
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
                                <Field label="Site" error={form.errors.site_id}>
                                    <select
                                        className={control}
                                        value={form.data.site_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'site_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        {sites.map((site) => (
                                            <option
                                                key={site.id}
                                                value={site.id}
                                            >
                                                {site.code} — {site.nom}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Lieu" error={form.errors.lieu}>
                                    <input
                                        className={control}
                                        value={form.data.lieu}
                                        onChange={(event) =>
                                            form.setData(
                                                'lieu',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Portail, magasin, cour…"
                                    />
                                </Field>
                                <div className="md:col-span-2 xl:col-span-4">
                                    <Field
                                        label="Objet — ce qui s'est passé"
                                        required
                                        error={form.errors.objet}
                                    >
                                        <textarea
                                            required
                                            rows={4}
                                            className={control}
                                            value={form.data.objet}
                                            onChange={(event) =>
                                                form.setData(
                                                    'objet',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Décrivez précisément les faits, sans interprétation…"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
                                    <ShieldCheck
                                        size={20}
                                        className="text-emerald-700"
                                    />
                                    <div>
                                        <h2 className="font-bold">
                                            Personne ou véhicule
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            Renseignements associés au passage.
                                        </p>
                                    </div>
                                </header>
                                <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                                    <Field
                                        label="Personne concernée"
                                        error={form.errors.personne}
                                    >
                                        <input
                                            className={control}
                                            value={form.data.personne}
                                            onChange={(event) =>
                                                form.setData(
                                                    'personne',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Véhicule / plaque"
                                        error={form.errors.vehicule}
                                    >
                                        <input
                                            className={control}
                                            value={form.data.vehicule}
                                            onChange={(event) =>
                                                form.setData(
                                                    'vehicule',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <div className="md:col-span-2">
                                        <Field
                                            label="Pièce d'identité présentée"
                                            error={form.errors.piece_identite}
                                        >
                                            <input
                                                className={control}
                                                value={form.data.piece_identite}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'piece_identite',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                    </div>
                                </div>
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                                        <Camera size={20} />
                                    </span>
                                    <div>
                                        <h2 className="font-bold">Photo</h2>
                                        <p className="text-sm text-slate-500">
                                            JPG, PNG ou WebP · 5 Mo max.
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className={`${control} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-bold`}
                                    onChange={(event) =>
                                        form.setData(
                                            'photo',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                {form.errors.photo && (
                                    <p className="mt-2 text-xs font-semibold text-red-600">
                                        {form.errors.photo}
                                    </p>
                                )}
                            </section>
                        </div>

                        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                            <Link
                                href="/main-courante"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Link>
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => save(true)}
                                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
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
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {error && (
                <span className="mt-1.5 block text-xs font-semibold text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
