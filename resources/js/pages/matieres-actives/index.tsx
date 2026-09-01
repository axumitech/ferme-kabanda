import { Head, Link } from '@inertiajs/react';
import { Ban, CheckCircle2, Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Matiere = {
    id: number;
    nom: string;
    famille: string;
    groupe_frac?: string | null;
    groupe_irac?: string | null;
    groupe_hrac?: string | null;
    mode_action?: string | null;
    dar_jours?: number | null;
    interdit: boolean;
    motif_interdiction?: string | null;
    traitements_count: number;
};

const groupLabel = (matiere: Matiere) => {
    if (matiere.famille === 'fongicide' && matiere.groupe_frac) {
        return `FRAC ${matiere.groupe_frac}`;
    }

    if (
        ['insecticide', 'acaricide'].includes(matiere.famille) &&
        matiere.groupe_irac
    ) {
        return `IRAC ${matiere.groupe_irac}`;
    }

    if (matiere.famille === 'herbicide' && matiere.groupe_hrac) {
        return `HRAC ${matiere.groupe_hrac}`;
    }

    return '—';
};

export default function MatiereActiveIndex({
    matieres,
    familles,
}: {
    matieres: Matiere[];
    familles: Record<string, string>;
}) {
    const [query, setQuery] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [draftFamily, setDraftFamily] = useState('');
    const [draftForbidden, setDraftForbidden] = useState('');
    const [family, setFamily] = useState('');
    const [forbidden, setForbidden] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return matieres.filter((matiere) => {
            const searchable =
                `${matiere.nom} ${matiere.mode_action ?? ''} ${groupLabel(matiere)}`.toLocaleLowerCase(
                    'fr',
                );

            return (
                (!needle || searchable.includes(needle)) &&
                (!family || matiere.famille === family) &&
                (!forbidden || String(Number(matiere.interdit)) === forbidden)
            );
        });
    }, [matieres, query, family, forbidden]);
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, pages);
    const rows = filtered.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage,
    );
    const activeFilters = Number(Boolean(family)) + Number(Boolean(forbidden));
    const resetFilters = () => {
        setDraftFamily('');
        setDraftForbidden('');
        setFamily('');
        setForbidden('');
        setPage(1);
    };

    return (
        <>
            <Head title="Matières Actives" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/matieres-actives"
                            className="hover:text-emerald-600"
                        >
                            Matières Actives
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Matières Actives
                        </h1>
                        <Link
                            href="/matieres-actives/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            Nouvelle matière active
                        </Link>
                    </header>
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="relative flex flex-wrap justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                            <label className="relative block w-full max-w-xs">
                                <Search
                                    size={17}
                                    className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                />
                                <span className="sr-only">Search</span>
                                <input
                                    value={query}
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <button
                                type="button"
                                aria-label="Filter"
                                onClick={() => setFilterOpen((open) => !open)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"
                            >
                                <Filter size={17} /> {activeFilters}
                            </button>
                            {filterOpen && (
                                <div className="absolute top-[4.5rem] right-4 z-20 grid w-[min(28rem,calc(100%-2rem))] gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                    <label className="text-sm font-medium">
                                        Famille
                                        <select
                                            value={draftFamily}
                                            onChange={(e) =>
                                                setDraftFamily(e.target.value)
                                            }
                                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                                        >
                                            <option value="">All</option>
                                            {Object.entries(familles).map(
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
                                    </label>
                                    <label className="text-sm font-medium">
                                        Interdit
                                        <select
                                            value={draftForbidden}
                                            onChange={(e) =>
                                                setDraftForbidden(
                                                    e.target.value,
                                                )
                                            }
                                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                                        >
                                            <option value="">All</option>
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                    </label>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="px-3 py-2 text-sm font-semibold"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFamily(draftFamily);
                                                setForbidden(draftForbidden);
                                                setPage(1);
                                                setFilterOpen(false);
                                            }}
                                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                                        >
                                            Apply filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {filtered.length} results
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1120px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        <th className="px-5 py-4">
                                            Matière active
                                        </th>
                                        <th className="px-5 py-4">Famille</th>
                                        <th className="px-5 py-4">
                                            Groupe de résistance
                                        </th>
                                        <th className="px-5 py-4">DAR</th>
                                        <th className="px-5 py-4">Interdit</th>
                                        <th className="px-5 py-4">Motif</th>
                                        <th className="px-5 py-4">Emplois</th>
                                        <th className="px-5 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((matiere) => {
                                        const edit = `/matieres-actives/${matiere.id}/edit`;

                                        return (
                                            <tr
                                                key={matiere.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block font-semibold"
                                                    >
                                                        {matiere.nom}
                                                        <span className="mt-1 block max-w-sm text-xs font-normal text-slate-500">
                                                            {
                                                                matiere.mode_action
                                                            }
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-700">
                                                            {familles[
                                                                matiere.famille
                                                            ] ??
                                                                matiere.famille}
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        <span
                                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${matiere.interdit ? 'bg-red-100 text-red-700 dark:bg-red-950' : 'bg-sky-100 text-sky-700 dark:bg-sky-950'}`}
                                                        >
                                                            {groupLabel(
                                                                matiere,
                                                            )}
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        {matiere.dar_jours !=
                                                        null
                                                            ? `${matiere.dar_jours} j`
                                                            : 'à saisir'}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        {matiere.interdit ? (
                                                            <Ban
                                                                size={20}
                                                                className="text-red-600"
                                                                aria-label="Yes"
                                                            />
                                                        ) : (
                                                            <CheckCircle2
                                                                size={20}
                                                                className="text-emerald-600"
                                                                aria-label="No"
                                                            />
                                                        )}
                                                    </Link>
                                                </td>
                                                <td className="max-w-sm px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        {matiere.motif_interdiction
                                                            ? `${matiere.motif_interdiction.slice(0, 60)}${matiere.motif_interdiction.length > 60 ? '…' : ''}`
                                                            : ''}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="block"
                                                    >
                                                        {
                                                            matiere.traitements_count
                                                        }
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={edit}
                                                        className="font-semibold text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        Edit
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                No matières actives
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
                            <label className="flex items-center gap-2">
                                Per page
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option>5</option>
                                    <option>10</option>
                                    <option>25</option>
                                    <option>50</option>
                                </select>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <span>
                                    {currentPage} / {pages}
                                </span>
                                <button
                                    type="button"
                                    disabled={currentPage === pages}
                                    onClick={() =>
                                        setPage((p) => Math.min(pages, p + 1))
                                    }
                                    className="rounded-md border px-3 py-1.5 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
