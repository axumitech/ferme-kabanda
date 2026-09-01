import { Head, Link, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Culture = {
    id: number;
    nom: string;
    famille?: string | null;
    unite_travail: string;
};
type Plantation = {
    id: number;
    reference: string;
    j0: string;
    quantite?: string | null;
    unite?: string | null;
    surface_m2?: string | null;
    statut: string;
    culture?: Culture | null;
};
type Parcelle = {
    id: number;
    code: string;
    nom: string;
    type: string;
    surface_m2?: string | null;
    nb_planches?: number | null;
    irrigation?: string | null;
    exposition?: string | null;
    latitude?: string | null;
    longitude?: string | null;
    actif: boolean;
    note?: string | null;
    parent?: { code: string; nom: string } | null;
    site?: { code: string; nom: string } | null;
    plantations: Plantation[];
};
type Props = {
    parcelle: Parcelle;
    cultures: Culture[];
    today: string;
    labels: {
        types: Record<string, string>;
        irrigations: Record<string, string>;
        expositions: Record<string, string>;
    };
};
type CultureForm = {
    culture_id: string;
    j0: string;
    quantite: string;
    unite: string;
    surface_m2: string;
    forcer_rotation: boolean;
};

const fieldClass =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const statusLabels: Record<string, string> = {
    active: 'Active',
    recoltee: 'Récoltée',
    echouee: 'Échouée',
};

export default function ParcelleShow({
    parcelle,
    cultures,
    today,
    labels,
}: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const form = useForm<CultureForm>({
        culture_id: '',
        j0: today,
        quantite: '',
        unite: '',
        surface_m2: '',
        forcer_rotation: false,
    });
    const occupied = parcelle.plantations
        .filter((plantation) => plantation.statut === 'active')
        .reduce(
            (total, plantation) => total + Number(plantation.surface_m2 ?? 0),
            0,
        );
    const available = parcelle.surface_m2
        ? Math.max(0, Number(parcelle.surface_m2) - occupied)
        : null;
    const todayTime = new Date(`${today}T00:00:00`).getTime();

    const selectCulture = (cultureId: string) => {
        form.setData((data) => ({
            ...data,
            culture_id: cultureId,
            unite:
                cultures.find((culture) => String(culture.id) === cultureId)
                    ?.unite_travail ?? '',
        }));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/terrain/${parcelle.id}/cultures`, {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    return (
        <>
            <Head title={parcelle.nom} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/terrain"
                            className="hover:text-emerald-600"
                        >
                            Parcelles
                        </Link>
                        <span className="mx-2">›</span>
                        {parcelle.nom}
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {parcelle.nom}
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                {parcelle.code}
                            </p>
                        </div>
                        <Link
                            href={`/terrain/${parcelle.id}/edit`}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900"
                        >
                            Edit
                        </Link>
                    </header>

                    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="text-lg font-semibold">
                            Détails de la parcelle
                        </h2>
                        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                            <Info label="Code" value={parcelle.code} />
                            <Info label="Nom usuel" value={parcelle.nom} />
                            <Info
                                label="Niveau"
                                value={
                                    labels.types[parcelle.type] ?? parcelle.type
                                }
                                badge
                            />
                            <Info
                                label="Active"
                                value={parcelle.actif ? 'Oui' : 'Non'}
                                badge
                            />
                            <Info
                                label="Rattaché à"
                                value={
                                    parcelle.parent
                                        ? `${parcelle.parent.code} — ${parcelle.parent.nom}`
                                        : '—'
                                }
                            />
                            <Info
                                label="Site"
                                value={parcelle.site?.nom ?? '—'}
                            />
                            <Info
                                label="Surface"
                                value={
                                    parcelle.surface_m2
                                        ? `${Number(parcelle.surface_m2).toLocaleString('fr-FR')} m²`
                                        : '—'
                                }
                            />
                            <Info
                                label="Nombre de planches"
                                value={
                                    parcelle.nb_planches
                                        ? String(parcelle.nb_planches)
                                        : '—'
                                }
                            />
                            <Info
                                label="Irrigation"
                                value={
                                    parcelle.irrigation
                                        ? (labels.irrigations[
                                              parcelle.irrigation
                                          ] ?? parcelle.irrigation)
                                        : '—'
                                }
                            />
                            <Info
                                label="Exposition"
                                value={
                                    parcelle.exposition
                                        ? (labels.expositions[
                                              parcelle.exposition
                                          ] ?? parcelle.exposition)
                                        : '—'
                                }
                            />
                            <Info
                                label="Latitude"
                                value={parcelle.latitude ?? '—'}
                            />
                            <Info
                                label="Longitude"
                                value={parcelle.longitude ?? '—'}
                            />
                        </dl>
                        {parcelle.note && (
                            <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    Note
                                </span>
                                <p className="mt-2 whitespace-pre-wrap">
                                    {parcelle.note}
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Cultures sur cette parcelle
                                </h2>
                                {available !== null && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Surface disponible :{' '}
                                        {available.toLocaleString('fr-FR')} m²
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setDialogOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                <Plus size={17} />
                                Ajouter une culture sur cette parcelle
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">Culture</th>
                                        <th className="px-5 py-4">Référence</th>
                                        <th className="px-5 py-4">J0</th>
                                        <th className="px-5 py-4">Quantité</th>
                                        <th className="px-5 py-4">Surface</th>
                                        <th className="px-5 py-4">Statut</th>
                                        <th className="px-5 py-4">Récolte</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {parcelle.plantations.map((plantation) => {
                                        const days = Math.max(
                                            0,
                                            Math.floor(
                                                (todayTime -
                                                    new Date(
                                                        `${plantation.j0.slice(0, 10)}T00:00:00`,
                                                    ).getTime()) /
                                                    86_400_000,
                                            ),
                                        );

                                        return (
                                            <tr
                                                key={plantation.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold">
                                                        {plantation.culture
                                                            ?.nom ?? '—'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {
                                                            plantation.culture
                                                                ?.famille
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {plantation.reference}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        {new Intl.DateTimeFormat(
                                                            'fr-FR',
                                                        ).format(
                                                            new Date(
                                                                `${plantation.j0.slice(0, 10)}T00:00:00`,
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        J+{days}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {plantation.quantite
                                                        ? `${Number(plantation.quantite).toLocaleString('fr-FR')} ${plantation.unite ?? ''}`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {plantation.surface_m2
                                                        ? `${Number(plantation.surface_m2).toLocaleString('fr-FR')} m²`
                                                        : '—'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plantation.statut === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                                                    >
                                                        {statusLabels[
                                                            plantation.statut
                                                        ] ?? plantation.statut}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                        Autorisée
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {parcelle.plantations.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                Aucune culture sur cette
                                                parcelle.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            Ajouter une culture sur cette parcelle
                        </DialogTitle>
                        <DialogDescription>
                            Chaque culture conserve son propre J0, sa quantité,
                            son unité et sa surface.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <PopupField
                            label="Culture"
                            required
                            error={form.errors.culture_id}
                        >
                            <select
                                required
                                value={form.data.culture_id}
                                onChange={(e) => selectCulture(e.target.value)}
                                className={fieldClass}
                            >
                                <option value="">Select an option</option>
                                {cultures.map((culture) => (
                                    <option key={culture.id} value={culture.id}>
                                        {culture.nom}
                                        {culture.famille
                                            ? ` — ${culture.famille}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </PopupField>
                        <PopupField
                            label="J0 — semis ou repiquage"
                            required
                            error={form.errors.j0}
                        >
                            <input
                                required
                                type="date"
                                value={form.data.j0}
                                onChange={(e) =>
                                    form.setData('j0', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </PopupField>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <PopupField
                                label="Quantité"
                                error={form.errors.quantite}
                            >
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.quantite}
                                    onChange={(e) =>
                                        form.setData('quantite', e.target.value)
                                    }
                                    className={fieldClass}
                                />
                            </PopupField>
                            <PopupField
                                label="Unité"
                                help="Propre à la culture : planches, pieds, lignes."
                                error={form.errors.unite}
                            >
                                <input
                                    value={form.data.unite}
                                    onChange={(e) =>
                                        form.setData('unite', e.target.value)
                                    }
                                    className={fieldClass}
                                />
                            </PopupField>
                        </div>
                        <PopupField
                            label="Surface occupée (m²)"
                            help={
                                available !== null
                                    ? `Disponible sur la parcelle : ${available.toLocaleString('fr-FR')} m²`
                                    : undefined
                            }
                            error={form.errors.surface_m2}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.surface_m2}
                                onChange={(e) =>
                                    form.setData('surface_m2', e.target.value)
                                }
                                className={fieldClass}
                            />
                        </PopupField>
                        <label className="block rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                            <span className="flex items-center gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={form.data.forcer_rotation}
                                    onChange={(e) =>
                                        form.setData(
                                            'forcer_rotation',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                                />
                                Forcer malgré la rotation
                            </span>
                            <span className="mt-1.5 block pl-8 text-xs text-slate-500">
                                La dérogation est journalisée.
                            </span>
                            {form.errors.forcer_rotation && (
                                <span className="mt-2 block pl-8 text-xs font-medium text-red-600">
                                    {form.errors.forcer_rotation}
                                </span>
                            )}
                        </label>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function Info({
    label,
    value,
    badge,
}: {
    label: string;
    value: string;
    badge?: boolean;
}) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd
                className={`mt-1 text-sm font-semibold ${badge ? 'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-700' : ''}`}
            >
                {value}
            </dd>
        </div>
    );
}

function PopupField({
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
                <span className="mt-1.5 block text-xs text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1.5 block text-xs font-medium text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
