import { Head, Link } from '@inertiajs/react';
import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Culture = {
    id: number;
    code: string;
    nom: string;
    famille?: string | null;
    delai_rotation?: number | null;
    unite_travail: string;
    unite_recolte: string;
    plantations_count: number;
    actif: boolean;
};

export default function CultureIndex({ cultures }: { cultures: Culture[] }) {
    const [query, setQuery] = useState('');
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return cultures.filter((culture) =>
            `${culture.code} ${culture.nom} ${culture.famille ?? ''}`
                .toLocaleLowerCase('fr')
                .includes(needle),
        );
    }, [cultures, query]);

    return (
        <>
            <Head title="Cultures" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/cultures"
                            className="hover:text-emerald-600"
                        >
                            Cultures
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Cultures
                        </h1>
                        <Link
                            href="/cultures/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            Nouvelle culture
                        </Link>
                    </header>
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex justify-end border-b border-slate-200 p-4 dark:border-slate-800">
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
                        </div>
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {rows.length} results
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[950px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">Code</th>
                                        <th className="px-5 py-4">Culture</th>
                                        <th className="px-5 py-4">Famille</th>
                                        <th className="px-5 py-4">Rotation</th>
                                        <th className="px-5 py-4">
                                            Unité travail
                                        </th>
                                        <th className="px-5 py-4">
                                            Unité récolte
                                        </th>
                                        <th className="px-5 py-4">
                                            Plantations
                                        </th>
                                        <th className="px-5 py-4">Active</th>
                                        <th className="px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((culture) => (
                                        <tr
                                            key={culture.id}
                                            className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                        >
                                            <td className="px-5 py-4 font-semibold">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.code}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 font-semibold">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.nom}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-700">
                                                        {culture.famille ?? '—'}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.delai_rotation
                                                        ? `${culture.delai_rotation} cycle(s)`
                                                        : '—'}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.unite_travail}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.unite_recolte}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.plantations_count}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="block"
                                                >
                                                    {culture.actif ? (
                                                        <Check
                                                            size={20}
                                                            className="text-emerald-600"
                                                            aria-label="Yes"
                                                        />
                                                    ) : (
                                                        <X
                                                            size={20}
                                                            className="text-red-600"
                                                            aria-label="No"
                                                        />
                                                    )}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/cultures/${culture.id}/edit`}
                                                    className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                                                >
                                                    Edit
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                No cultures
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
