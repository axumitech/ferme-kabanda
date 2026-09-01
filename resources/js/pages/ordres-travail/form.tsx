import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Camera,
    HardHat,
    ShieldCheck,
    Wrench,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type Option = {
    id: number;
    code: string;
    nom: string;
    site_id?: number | null;
};
type FormData = {
    target_type: 'equipment' | 'infrastructure' | 'none' | '';
    target_id: string;
    objet: string;
    description: string;
    type_intervention: string;
    priorite: string;
    arret_production: boolean;
    echeance: string;
    site_id: string;
    consignation_requise: boolean;
    permis_travail: string;
    epi_requis: string;
    photo_avant: File | null;
    approbation_requise: boolean;
    _create_another: boolean;
};

const control =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-700 dark:bg-slate-900';

export default function WorkOrderForm({
    equipment,
    infrastructures,
    sites,
    types,
    permits,
    today,
    canSkipApproval,
}: {
    equipment: Option[];
    infrastructures: Option[];
    sites: Option[];
    types: Record<string, string>;
    permits: Record<string, string>;
    today: string;
    canSkipApproval: boolean;
}) {
    const page = usePage<{ flash?: { success?: string } }>();
    const form = useForm<FormData>({
        target_type: '',
        target_id: '',
        objet: '',
        description: '',
        type_intervention: 'correctif',
        priorite: 'normale',
        arret_production: false,
        echeance: '',
        site_id: '',
        consignation_requise: false,
        permis_travail: 'aucun',
        epi_requis: '',
        photo_avant: null,
        approbation_requise: true,
        _create_another: false,
    });
    const targets =
        form.data.target_type === 'equipment' ? equipment : infrastructures;
    const targetLabel =
        form.data.target_type === 'equipment' ? 'Équipement' : 'Infrastructure';
    const save = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));
        form.post('/ordres-travail', { forceFormData: true });
    };

    return (
        <>
            <Head title="Create Ordre De Travail" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/ordres-travail"
                            className="hover:text-emerald-600"
                        >
                            Ordres de travail
                        </Link>
                        <span className="mx-2">›</span>Create
                    </div>
                    <header className="flex items-start gap-4">
                        <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950">
                            <Wrench size={24} />
                        </span>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Create Ordre De Travail
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Décrivez précisément l'intervention et les
                                mesures de sécurité nécessaires.
                            </p>
                        </div>
                    </header>
                    {page.props.flash?.success && (
                        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {page.props.flash.success}
                        </div>
                    )}
                    <form
                        onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            save(false);
                        }}
                        className="space-y-6"
                    >
                        <Card title="Intervention" icon={<Wrench size={18} />}>
                            <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
                                <Field
                                    label="Sur quoi porte l'intervention ?"
                                    required
                                    error={form.errors.target_type}
                                >
                                    <select
                                        required
                                        autoFocus
                                        value={form.data.target_type}
                                        onChange={(e) =>
                                            form.setData({
                                                ...form.data,
                                                target_type: e.target
                                                    .value as FormData['target_type'],
                                                target_id: '',
                                            })
                                        }
                                        className={control}
                                    >
                                        <option value="">
                                            Select an option
                                        </option>
                                        <option value="equipment">
                                            Un équipement (tracteur, véhicule,
                                            groupe, pompe)
                                        </option>
                                        <option value="infrastructure">
                                            Une infrastructure (canal, forage,
                                            solaire, bâtiment)
                                        </option>
                                        <option value="none">
                                            Travaux généraux — sans cible
                                            précise
                                        </option>
                                    </select>
                                </Field>
                                {form.data.target_type &&
                                    form.data.target_type !== 'none' && (
                                        <Field
                                            label={targetLabel}
                                            required
                                            error={form.errors.target_id}
                                        >
                                            <select
                                                required
                                                value={form.data.target_id}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const selected =
                                                        targets.find(
                                                            (t) =>
                                                                String(t.id) ===
                                                                id,
                                                        );
                                                    form.setData({
                                                        ...form.data,
                                                        target_id: id,
                                                        site_id:
                                                            form.data.site_id ||
                                                            String(
                                                                selected?.site_id ??
                                                                    '',
                                                            ),
                                                    });
                                                }}
                                                className={control}
                                            >
                                                <option value="">
                                                    Select an option
                                                </option>
                                                {targets.map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.code} — {item.nom}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    )}
                                <div className="lg:col-span-2">
                                    <Field
                                        label="Objet — que faut-il faire ?"
                                        required
                                        error={form.errors.objet}
                                    >
                                        <input
                                            required
                                            maxLength={255}
                                            value={form.data.objet}
                                            onChange={(e) =>
                                                form.setData(
                                                    'objet',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Ex. Remplacer le roulement de la pompe P-04"
                                            className={control}
                                        />
                                    </Field>
                                </div>
                                <div className="lg:col-span-2">
                                    <Field
                                        label="Description du problème constaté"
                                        error={form.errors.description}
                                    >
                                        <textarea
                                            rows={4}
                                            value={form.data.description}
                                            onChange={(e) =>
                                                form.setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Symptômes, circonstances, bruit, fuite, panne observée…"
                                            className={control}
                                        />
                                    </Field>
                                </div>
                                <Field
                                    label="Nature"
                                    required
                                    error={form.errors.type_intervention}
                                >
                                    <select
                                        required
                                        value={form.data.type_intervention}
                                        onChange={(e) =>
                                            form.setData(
                                                'type_intervention',
                                                e.target.value,
                                            )
                                        }
                                        className={control}
                                    >
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
                                <Field
                                    label="Priorité"
                                    required
                                    error={form.errors.priorite}
                                >
                                    <select
                                        required
                                        disabled={form.data.arret_production}
                                        value={
                                            form.data.arret_production
                                                ? 'urgente'
                                                : form.data.priorite
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                'priorite',
                                                e.target.value,
                                            )
                                        }
                                        className={control}
                                    >
                                        <option value="basse">Basse</option>
                                        <option value="normale">Normale</option>
                                        <option value="elevee">Élevée</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </Field>
                                <label
                                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 lg:col-span-2 ${form.data.arret_production ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.data.arret_production}
                                        onChange={(e) =>
                                            form.setData(
                                                'arret_production',
                                                e.target.checked,
                                            )
                                        }
                                        className="mt-1 size-4 accent-red-600"
                                    />
                                    <span>
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <AlertTriangle
                                                size={17}
                                                className="text-red-600"
                                            />
                                            Arrête la production
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            Cochez cette case et l'ordre passe
                                            automatiquement en urgent.
                                        </span>
                                        {form.data.arret_production && (
                                            <span className="mt-2 block text-xs font-semibold text-red-700">
                                                Priorité URGENTE appliquée
                                                automatiquement.
                                            </span>
                                        )}
                                    </span>
                                </label>
                                <Field
                                    label="Échéance souhaitée"
                                    error={form.errors.echeance}
                                >
                                    <input
                                        type="date"
                                        min={today}
                                        value={form.data.echeance}
                                        onChange={(e) =>
                                            form.setData(
                                                'echeance',
                                                e.target.value,
                                            )
                                        }
                                        className={control}
                                    />
                                </Field>
                                <Field label="Site" error={form.errors.site_id}>
                                    <select
                                        value={form.data.site_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'site_id',
                                                e.target.value,
                                            )
                                        }
                                        className={control}
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
                        </Card>
                        {canSkipApproval && (
                            <Card
                                title="Circuit de validation"
                                icon={<ShieldCheck size={18} />}
                            >
                                <label
                                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${form.data.approbation_requise ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.data.approbation_requise}
                                        onChange={(e) =>
                                            form.setData(
                                                'approbation_requise',
                                                e.target.checked,
                                            )
                                        }
                                        className="mt-1 size-4 accent-emerald-600"
                                    />
                                    <span>
                                        <span className="text-sm font-semibold">
                                            Approbation requise avant
                                            planification
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">
                                            {form.data.approbation_requise
                                                ? 'L’ordre commencera à l’étape Approbation. Le demandeur ne pourra pas approuver sa propre demande.'
                                                : 'L’ordre sera immédiatement prêt à planifier. Réservé aux interventions déjà autorisées.'}
                                        </span>
                                    </span>
                                </label>
                            </Card>
                        )}
                        <Card
                            title="Sécurité de l'intervention"
                            icon={<ShieldCheck size={18} />}
                        >
                            <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
                                <label className="flex cursor-pointer gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 lg:col-span-2 dark:border-amber-900 dark:bg-amber-950/20">
                                    <input
                                        type="checkbox"
                                        checked={form.data.consignation_requise}
                                        onChange={(e) =>
                                            form.setData(
                                                'consignation_requise',
                                                e.target.checked,
                                            )
                                        }
                                        className="mt-1 size-4 accent-amber-600"
                                    />
                                    <span>
                                        <span className="text-sm font-semibold">
                                            Consignation requise avant
                                            intervention
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">
                                            Mise hors énergie : électricité,
                                            pression, pièces en mouvement.
                                        </span>
                                    </span>
                                </label>
                                <Field
                                    label="Permis de travail"
                                    required
                                    error={form.errors.permis_travail}
                                >
                                    <select
                                        required
                                        value={form.data.permis_travail}
                                        onChange={(e) =>
                                            form.setData(
                                                'permis_travail',
                                                e.target.value,
                                            )
                                        }
                                        className={control}
                                    >
                                        {Object.entries(permits).map(
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
                                <Field
                                    label="EPI exigés"
                                    error={form.errors.epi_requis}
                                >
                                    <div className="relative">
                                        <HardHat
                                            size={17}
                                            className="absolute top-1/2 left-3 mt-1 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            value={form.data.epi_requis}
                                            onChange={(e) =>
                                                form.setData(
                                                    'epi_requis',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Gants, lunettes, casque…"
                                            className={`${control} pl-10`}
                                        />
                                    </div>
                                </Field>
                                <div className="lg:col-span-2">
                                    <Field
                                        label="Photo du problème"
                                        help="JPG, PNG ou WebP — 5 Mo maximum."
                                        error={form.errors.photo_avant}
                                    >
                                        <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-900">
                                            <Camera className="text-emerald-600" />
                                            <span className="text-sm">
                                                {form.data.photo_avant?.name ??
                                                    'Aucun fichier choisi'}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="sr-only"
                                                onChange={(e) =>
                                                    form.setData(
                                                        'photo_avant',
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                            />
                                        </label>
                                    </Field>
                                </div>
                            </div>
                        </Card>
                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                            <button
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                                Create
                            </button>
                            <button
                                type="button"
                                disabled={form.processing}
                                onClick={() => save(true)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                            >
                                Create &amp; create another
                            </button>
                            <Link
                                href="/ordres-travail"
                                className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
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

function Card({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-base font-semibold dark:border-slate-800">
                <span className="text-emerald-600">{icon}</span>
                {title}
            </h2>
            <div className="p-5">{children}</div>
        </section>
    );
}
function Field({
    label,
    required,
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
            <span className="text-sm font-medium">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1 block text-xs text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1 block text-xs font-medium text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
