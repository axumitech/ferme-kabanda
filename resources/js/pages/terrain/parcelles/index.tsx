import { Head, Link } from '@inertiajs/react';
import { Columns3, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Parcelle = {
    id: number;
    code: string;
    nom: string;
    type: string;
    surface_m2?: string | null;
    nb_planches?: number | null;
    exposition?: string | null;
    cultures_en_place: number;
    parent?: { nom: string } | null;
    site?: { id: number; nom: string } | null;
    plantations_actives: Array<{ culture?: { nom: string } | null }>;
};
type ValueOption = { value: string; label: string };
type Props = {
    parcelles: Parcelle[];
    filters: {
        types: ValueOption[];
        sites: Array<{ id: number; nom: string }>;
    };
};

const typeLabels: Record<string, string> = {
    bloc: 'Bloc',
    parc: 'Parc',
    planche: 'Planche',
};
const expositionLabels: Record<string, string> = {
    plein_soleil: 'Plein soleil',
    partielle: 'Moins de 6 h de soleil',
    ombragee: "Moins de 50 % d'ensoleillement",
};

export default function ParcellesIndex({ parcelles, filters }: Props) {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('');
    const [site, setSite] = useState('');
    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return parcelles.filter(
            (parcelle) =>
                `${parcelle.code} ${parcelle.nom} ${parcelle.parent?.nom ?? ''}`
                    .toLocaleLowerCase('fr')
                    .includes(needle) &&
                (!type || parcelle.type === type) &&
                (!site || String(parcelle.site?.id ?? '') === site),
        );
    }, [parcelles, query, site, type]);

    return (
        <>
            <Head title="Parcelles" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/terrain"
                            className="hover:text-emerald-600"
                        >
                            Parcelles
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Parcelles
                            </h1>
                            <p className="mt-2 max-w-4xl text-base text-slate-500">
                                Ouvrez une parcelle pour y ajouter plusieurs
                                cultures simultanées, chacune avec son J0 et son
                                unité.
                            </p>
                        </div>
                        <Link
                            href="/terrain/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            Nouvelle parcelle
                        </Link>
                    </header>

                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(event) =>
                                        setQuery(event.target.value)
                                    }
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <div className="relative">
                                <Filter
                                    size={17}
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <select
                                    aria-label="Filter by level"
                                    value={type}
                                    onChange={(event) =>
                                        setType(event.target.value)
                                    }
                                    className="rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">Tous les niveaux</option>
                                    {filters.types.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <select
                                aria-label="Filter by site"
                                value={site}
                                onChange={(event) =>
                                    setSite(event.target.value)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                            >
                                <option value="">Tous les sites</option>
                                {filters.sites.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.nom}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                aria-label="Column manager"
                                className="rounded-lg border border-slate-300 p-2 text-slate-500 dark:border-slate-700"
                            >
                                <Columns3 size={18} />
                            </button>
                        </div>
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {filtered.length} results
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">Code</th>
                                        <th className="px-5 py-4">Parcelle</th>
                                        <th className="px-5 py-4">Niveau</th>
                                        <th className="px-5 py-4">Site</th>
                                        <th className="px-5 py-4">Surface</th>
                                        <th className="px-5 py-4">
                                            Cultures en place
                                        </th>
                                        <th className="px-5 py-4">
                                            Exposition
                                        </th>
                                        <th className="px-5 py-4">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filtered.map((parcelle) => (
                                        <tr
                                            key={parcelle.id}
                                            className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                        >
                                            <td className="px-5 py-4 align-top font-semibold">
                                                <Link
                                                    href={`/terrain/${parcelle.id}`}
                                                    className="hover:text-emerald-600"
                                                >
                                                    {parcelle.code}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <Link
                                                    href={`/terrain/${parcelle.id}`}
                                                    className="font-semibold hover:text-emerald-600"
                                                >
                                                    {parcelle.nom}
                                                </Link>
                                                {parcelle.parent && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {parcelle.parent.nom}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-700">
                                                    {typeLabels[
                                                        parcelle.type
                                                    ] ?? parcelle.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                {parcelle.site?.nom ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div>
                                                    {parcelle.surface_m2
                                                        ? `${Number(parcelle.surface_m2).toLocaleString('fr-FR')} m²`
                                                        : '—'}
                                                </div>
                                                {parcelle.nb_planches && (
                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {parcelle.nb_planches}{' '}
                                                        planches
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${parcelle.cultures_en_place > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                                                >
                                                    {parcelle.cultures_en_place}
                                                </span>
                                                <div className="mt-2 max-w-52 text-xs text-slate-500">
                                                    {parcelle.plantations_actives
                                                        .map(
                                                            (item) =>
                                                                item.culture
                                                                    ?.nom,
                                                        )
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                {parcelle.exposition
                                                    ? (expositionLabels[
                                                          parcelle.exposition
                                                      ] ?? parcelle.exposition)
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-4 align-top">
                                                <div className="flex justify-end gap-3 whitespace-nowrap">
                                                    <Link
                                                        href={`/terrain/${parcelle.id}`}
                                                        className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                                                    >
                                                        Ouvrir
                                                    </Link>
                                                    <Link
                                                        href={`/terrain/${parcelle.id}/edit`}
                                                        className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300"
                                                    >
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                Aucune parcelle trouvée.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
