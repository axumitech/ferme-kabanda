import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CalendarDays, ShieldCheck, Users } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type UserOption = { id: number; name: string };
type SiteOption = { id: number; code: string; nom: string };

const control =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15';

export default function PatrolForm({
    today,
    currentUserId,
    users,
    sites,
}: {
    today: string;
    currentUserId: number | null;
    users: UserOption[];
    sites: SiteOption[];
}) {
    const form = useForm({
        date: today,
        tour: '',
        agent_id: String(currentUserId ?? ''),
        equipe: '',
        site_id: '',
        _create_another: false,
    });
    const save = (createAnother: boolean) => {
        form.transform((data) => ({ ...data, _create_another: createAnother }));
        form.post('/patrouilles');
    };

    return (
        <>
            <Head title="Create Patrouille" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-6xl space-y-6">
                    <Link
                        href="/patrouilles"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700"
                    >
                        <ArrowLeft size={16} /> Patrouilles
                    </Link>
                    <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <ShieldCheck size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
                                    Sécurité &amp; QHSE
                                </p>
                                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                    Create Patrouille
                                </h1>
                                <p className="mt-2 text-sm text-slate-300">
                                    Ouvrez une ronde qui sera horodatée poste
                                    par poste.
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
                                <CalendarDays
                                    className="text-emerald-700"
                                    size={20}
                                />
                                <div>
                                    <h2 className="font-bold">
                                        Ouverture de la ronde
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        L'heure de début sera celle du serveur
                                        au moment de la création.
                                    </p>
                                </div>
                            </header>
                            <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                                <Field
                                    label="Date"
                                    required
                                    error={form.errors.date}
                                >
                                    <input
                                        required
                                        type="date"
                                        className={control}
                                        value={form.data.date}
                                        onChange={(event) =>
                                            form.setData(
                                                'date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Tour"
                                    required
                                    error={form.errors.tour}
                                >
                                    <select
                                        required
                                        autoFocus
                                        className={control}
                                        value={form.data.tour}
                                        onChange={(event) =>
                                            form.setData(
                                                'tour',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        <option value="jour">
                                            Tour de jour
                                        </option>
                                        <option value="nuit">
                                            Tour de nuit
                                        </option>
                                    </select>
                                </Field>
                                <Field
                                    label="Agent"
                                    required
                                    error={form.errors.agent_id}
                                >
                                    <select
                                        required
                                        className={control}
                                        value={form.data.agent_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'agent_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        {users.map((user) => (
                                            <option
                                                key={user.id}
                                                value={user.id}
                                            >
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    label="Accompagnement"
                                    error={form.errors.equipe}
                                    help="Second agent, chien, détachement FARDC."
                                >
                                    <input
                                        className={control}
                                        value={form.data.equipe}
                                        onChange={(event) =>
                                            form.setData(
                                                'equipe',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field
                                        label="Site"
                                        error={form.errors.site_id}
                                    >
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
                                </div>
                            </div>
                        </section>

                        <aside className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
                            <Users size={20} className="mt-0.5 shrink-0" />
                            <p>
                                Un agent ne peut avoir qu'une seule patrouille
                                ouverte. Clôturez sa ronde précédente avant d'en
                                créer une nouvelle.
                            </p>
                        </aside>

                        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
                            <Link
                                href="/patrouilles"
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
                <span className="mt-1.5 block text-xs text-slate-500">
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
