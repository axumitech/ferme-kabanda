import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CircleDollarSign,
    FileText,
    MapPin,
    ShieldAlert,
    Users,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type Option = { id: number; code: string; nom: string };
type IncidentFormData = {
    nature: string;
    survenu_le: string;
    site_id: string;
    lieu: string;
    departement_id: string;
    cout_estime: string;
    description: string;
    actions_immediates: string;
    temoins: string;
    personnes_impliquees: string;
    tiers_implique: boolean;
    _create_another: boolean;
};

const control =
    'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/15';

export default function IncidentForm({
    sites,
    departments,
    currentDateTime,
}: {
    sites: Option[];
    departments: Option[];
    currentDateTime: string;
}) {
    const form = useForm<IncidentFormData>({
        nature: '',
        survenu_le: currentDateTime,
        site_id: '',
        lieu: '',
        departement_id: '',
        cout_estime: '',
        description: '',
        actions_immediates: '',
        temoins: '',
        personnes_impliquees: '',
        tiers_implique: false,
        _create_another: false,
    });

    const save = (createAnother: boolean) => {
        form.transform((data) => ({
            ...data,
            _create_another: createAnother,
        }));
        form.post('/admin/processes/incidents');
    };

    return (
        <>
            <Head title="Create Incident" />
            <main className="min-h-[calc(100svh-4rem)] w-full bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-7xl space-y-6">
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <Link
                            href="/admin/processes?tab=incidents"
                            className="inline-flex items-center gap-1.5 font-semibold transition hover:text-red-700"
                        >
                            <ArrowLeft size={15} /> Incidents HSE
                        </Link>
                        <span aria-hidden="true">›</span>
                        <span>Déclarer</span>
                    </nav>

                    <header className="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 px-6 py-7 text-white shadow-lg sm:px-8">
                        <div className="flex items-start gap-4">
                            <span className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15">
                                <ShieldAlert size={28} />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-[0.18em] text-red-200 uppercase">
                                    Sécurité &amp; QHSE
                                </p>
                                <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                    Create Incident
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                                    Consignez uniquement les faits observés. La
                                    classification et l'analyse des causes se
                                    feront ensuite dans le registre.
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
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                <p className="font-bold">
                                    Le formulaire contient des erreurs.
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    {Object.values(form.errors).map((error) => (
                                        <li key={error}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <Card
                            title="Événement"
                            subtitle="Nature, date et localisation exacte de l'incident."
                            icon={<MapPin size={19} />}
                        >
                            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                                <Field
                                    label="Nature"
                                    required
                                    error={form.errors.nature}
                                >
                                    <select
                                        autoFocus
                                        required
                                        className={control}
                                        value={form.data.nature}
                                        onChange={(event) =>
                                            form.setData(
                                                'nature',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        <option value="securite">
                                            Sécurité (SST)
                                        </option>
                                        <option value="surete">
                                            Sûreté (malveillance)
                                        </option>
                                        <option value="environnement">
                                            Environnement
                                        </option>
                                    </select>
                                </Field>
                                <Field
                                    label="Survenu le"
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
                                    label="Lieu précis"
                                    error={form.errors.lieu}
                                >
                                    <input
                                        className={control}
                                        value={form.data.lieu}
                                        onChange={(event) =>
                                            form.setData(
                                                'lieu',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Atelier, parcelle, poste, magasin…"
                                    />
                                </Field>
                                <Field
                                    label="Département"
                                    error={form.errors.departement_id}
                                >
                                    <select
                                        className={control}
                                        value={form.data.departement_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'departement_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        {departments.map((department) => (
                                            <option
                                                key={department.id}
                                                value={department.id}
                                            >
                                                {department.code} —{' '}
                                                {department.nom}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    label="Coût estimé (USD)"
                                    error={form.errors.cout_estime}
                                    help="Au-delà de 5 000 USD : remontée Siège sous 72 h."
                                >
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={control}
                                        value={form.data.cout_estime}
                                        onChange={(event) =>
                                            form.setData(
                                                'cout_estime',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                        </Card>

                        <Card
                            title="Déclaration factuelle"
                            subtitle="Décrivez ce qui s'est réellement produit, sans conclure sur les causes."
                            icon={<FileText size={19} />}
                        >
                            <div className="space-y-5">
                                <Field
                                    label="Description factuelle — qui, quoi, où, quand, comment"
                                    required
                                    error={form.errors.description}
                                >
                                    <textarea
                                        required
                                        rows={5}
                                        className={control}
                                        value={form.data.description}
                                        onChange={(event) =>
                                            form.setData(
                                                'description',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Exposez chronologiquement les faits observés…"
                                    />
                                </Field>
                                <Field
                                    label="Actions immédiates prises"
                                    error={form.errors.actions_immediates}
                                >
                                    <textarea
                                        rows={3}
                                        className={control}
                                        value={form.data.actions_immediates}
                                        onChange={(event) =>
                                            form.setData(
                                                'actions_immediates',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Balisage, arrêt, premiers soins, sécurisation…"
                                    />
                                </Field>
                            </div>
                        </Card>

                        <div className="grid gap-6 xl:grid-cols-2">
                            <Card
                                title="Personnes"
                                subtitle="Témoins et personnes directement impliquées."
                                icon={<Users size={19} />}
                            >
                                <div className="space-y-5">
                                    <Field
                                        label="Témoins"
                                        error={form.errors.temoins}
                                    >
                                        <textarea
                                            rows={3}
                                            className={control}
                                            value={form.data.temoins}
                                            onChange={(event) =>
                                                form.setData(
                                                    'temoins',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Personnes impliquées"
                                        error={form.errors.personnes_impliquees}
                                    >
                                        <input
                                            className={control}
                                            value={
                                                form.data.personnes_impliquees
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'personnes_impliquees',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <input
                                            type="checkbox"
                                            checked={form.data.tiers_implique}
                                            onChange={(event) =>
                                                form.setData(
                                                    'tiers_implique',
                                                    event.target.checked,
                                                )
                                            }
                                            className="size-4 accent-red-600"
                                        />
                                        <span className="text-sm font-semibold text-slate-800">
                                            Tiers impliqué
                                        </span>
                                    </label>
                                </div>
                            </Card>

                            <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                                <div className="flex items-center gap-3 text-amber-900">
                                    <span className="rounded-xl bg-amber-100 p-2.5">
                                        <CircleDollarSign size={20} />
                                    </span>
                                    <h2 className="text-lg font-bold">
                                        Après la déclaration
                                    </h2>
                                </div>
                                <div className="mt-5 space-y-4 text-sm leading-6 text-amber-950/80">
                                    <p>
                                        L'incident recevra automatiquement une
                                        référence et les échéances de procédure
                                        applicables.
                                    </p>
                                    <p>
                                        Vous pourrez ensuite le classifier,
                                        conduire les 5 Pourquoi, ouvrir un ordre
                                        de travail et ajouter les actions CAPA.
                                    </p>
                                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/70 p-4">
                                        <Building2
                                            size={18}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <span>
                                            Une déclaration décrit les faits ;
                                            elle ne remplace pas
                                            l'investigation.
                                        </span>
                                    </div>
                                </div>
                            </aside>
                        </div>

                        <footer className="sticky bottom-0 z-20 -mx-4 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-12px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-2xl sm:border sm:px-6">
                            <Link
                                href="/admin/processes?tab=incidents"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                Cancel
                            </Link>
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => save(true)}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Create &amp; create another
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md disabled:opacity-50"
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

function Card({
    title,
    subtitle,
    icon,
    children,
}: {
    title: string;
    subtitle: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-start gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
                <span className="rounded-xl bg-red-50 p-2.5 text-red-700">
                    {icon}
                </span>
                <div>
                    <h2 className="font-bold text-slate-950">{title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                </div>
            </header>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

function Field({
    label,
    required = false,
    help,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="ml-0.5 text-red-600">*</span>}
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
