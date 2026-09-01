import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Flag, MapPinned, Route } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type Site = { id: number; code: string; nom: string };
type ControlPost = {
    id: number;
    code: string;
    nom: string;
    site_id?: number | null;
    ordre: number;
    latitude?: string | number | null;
    longitude?: string | number | null;
    actif: boolean;
};
const control =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15';

export default function ControlPostForm({
    post,
    sites,
}: {
    post?: ControlPost | null;
    sites: Site[];
}) {
    const editing = Boolean(post);
    const form = useForm({
        code: post?.code ?? '',
        nom: post?.nom ?? '',
        site_id: String(post?.site_id ?? ''),
        ordre: String(post?.ordre ?? 0),
        latitude: String(post?.latitude ?? ''),
        longitude: String(post?.longitude ?? ''),
        actif: post?.actif ?? true,
        _create_another: false,
    });
    const save = (createAnother = false) => {
        if (post) {
            form.put(`/postes-controle/${post.id}`);

            return;
        }

        form.transform((data) => ({ ...data, _create_another: createAnother }));
        form.post('/postes-controle');
    };

    return (
        <>
            <Head
                title={
                    editing
                        ? 'Edit Poste De Contrôle'
                        : 'Create Poste De Contrôle'
                }
            />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                    <Link
                        href="/postes-controle"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Postes de contrôle
                    </Link>
                    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <Flag size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
                                    Sécurité &amp; QHSE
                                </p>
                                <h1 className="mt-1 text-3xl font-bold">
                                    {editing
                                        ? 'Edit Poste De Contrôle'
                                        : 'Create Poste De Contrôle'}
                                </h1>
                                <p className="mt-2 text-sm text-slate-300">
                                    Définissez le point de passage, sa position
                                    et son ordre dans la ronde.
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
                                <Route size={20} className="text-emerald-700" />
                                <div>
                                    <h2 className="font-bold">
                                        Identification du poste
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Le code doit être unique dans tout le
                                        dispositif de contrôle.
                                    </p>
                                </div>
                            </header>
                            <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                                <Field
                                    label="Code"
                                    required
                                    error={form.errors.code}
                                >
                                    <input
                                        required
                                        autoFocus
                                        maxLength={24}
                                        className={control}
                                        value={form.data.code}
                                        onChange={(event) =>
                                            form.setData(
                                                'code',
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="PC-07"
                                    />
                                </Field>
                                <Field
                                    label="Nom du poste"
                                    required
                                    error={form.errors.nom}
                                    help="Portail principal, magasin, porcherie, pompe, périmètre nord."
                                >
                                    <input
                                        required
                                        className={control}
                                        value={form.data.nom}
                                        onChange={(event) =>
                                            form.setData(
                                                'nom',
                                                event.target.value,
                                            )
                                        }
                                    />
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
                                <Field
                                    label="Ordre dans la ronde"
                                    error={form.errors.ordre}
                                >
                                    <input
                                        type="number"
                                        min="0"
                                        max="65535"
                                        className={control}
                                        value={form.data.ordre}
                                        onChange={(event) =>
                                            form.setData(
                                                'ordre',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
                                <MapPinned
                                    size={20}
                                    className="text-emerald-700"
                                />
                                <div>
                                    <h2 className="font-bold">Position GPS</h2>
                                    <p className="text-sm text-slate-500">
                                        Coordonnées facultatives pour contrôler
                                        la proximité du pointage.
                                    </p>
                                </div>
                            </header>
                            <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                                <Field
                                    label="Latitude"
                                    error={form.errors.latitude}
                                >
                                    <input
                                        type="number"
                                        min="-90"
                                        max="90"
                                        step="0.0000001"
                                        className={control}
                                        value={form.data.latitude}
                                        onChange={(event) =>
                                            form.setData(
                                                'latitude',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="-4.5900000"
                                    />
                                </Field>
                                <Field
                                    label="Longitude"
                                    error={form.errors.longitude}
                                >
                                    <input
                                        type="number"
                                        min="-180"
                                        max="180"
                                        step="0.0000001"
                                        className={control}
                                        value={form.data.longitude}
                                        onChange={(event) =>
                                            form.setData(
                                                'longitude',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="15.1800000"
                                    />
                                </Field>
                            </div>
                        </section>

                        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <input
                                type="checkbox"
                                checked={form.data.actif}
                                onChange={(event) =>
                                    form.setData('actif', event.target.checked)
                                }
                                className="size-4 accent-emerald-700"
                            />
                            <span>
                                <b className="block text-sm">Actif</b>
                                <span className="text-xs text-slate-500">
                                    Un poste inactif n'est plus proposé lors des
                                    pointages de patrouille.
                                </span>
                            </span>
                        </label>

                        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                            <Link
                                href="/postes-controle"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Link>
                            {!editing && (
                                <button
                                    type="button"
                                    disabled={form.processing}
                                    onClick={() => save(true)}
                                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Create &amp; create another
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-11 rounded-xl bg-emerald-700 px-7 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                            >
                                {form.processing
                                    ? 'Enregistrement…'
                                    : editing
                                      ? 'Save changes'
                                      : 'Create'}
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
    help,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    help?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1.5 block text-xs font-semibold text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
