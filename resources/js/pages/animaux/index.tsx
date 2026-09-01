import { Head, Link } from '@inertiajs/react';
import { Filter, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Animal = {
    id: number;
    code: string;
    espece: string;
    categorie: string;
    cohorte?: string | null;
    encoche?: string | null;
    atelier?: string | null;
    poids?: string | null;
    poids_le?: string | null;
    effectif: number;
    statut: string;
    loge?: { numero: string } | null;
};

export default function AnimalIndex({
    animaux,
    especes,
}: {
    animaux: Animal[];
    especes: Record<string, string>;
}) {
    const [query, setQuery] = useState('');
    const [species, setSpecies] = useState('');
    const [status, setStatus] = useState('present');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const filtered = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');

        return animaux.filter(
            (animal) =>
                (!needle ||
                    `${animal.code} ${animal.encoche ?? ''} ${animal.categorie}`
                        .toLocaleLowerCase('fr')
                        .includes(needle)) &&
                (!species || animal.espece === species) &&
                (!status || animal.statut === status),
        );
    }, [animaux, query, species, status]);
    const pages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, pages);
    const rows = filtered.slice(
        (currentPage - 1) * perPage,
        currentPage * perPage,
    );
    const activeFilters = Number(Boolean(species)) + Number(Boolean(status));

    return (
        <>
            <Head title="Animaux" />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/animaux"
                            className="hover:text-emerald-600"
                        >
                            Animaux
                        </Link>
                        <span className="mx-2">›</span>List
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Animaux
                        </h1>
                        <Link
                            href="/animaux/create"
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            Nouvel animal / lot
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
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Search"
                                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950"
                                />
                            </label>
                            <button
                                type="button"
                                aria-label="Filter"
                                onClick={() => setFiltersOpen((open) => !open)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"
                            >
                                <Filter size={17} /> {activeFilters}
                            </button>
                            {filtersOpen && (
                                <div className="absolute top-[4.5rem] right-4 z-20 grid w-[min(28rem,calc(100%-2rem))] gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                    <FilterSelect
                                        label="Espèce"
                                        value={species}
                                        onChange={(value) => {
                                            setSpecies(value);
                                            setPage(1);
                                        }}
                                        options={especes}
                                    />
                                    <FilterSelect
                                        label="Statut"
                                        value={status}
                                        onChange={(value) => {
                                            setStatus(value);
                                            setPage(1);
                                        }}
                                        options={{
                                            present: 'Présent',
                                            sorti: 'Sorti',
                                            mort: 'Mort',
                                        }}
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSpecies('');
                                                setStatus('');
                                            }}
                                            className="px-3 py-2 text-sm font-semibold"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFiltersOpen(false)
                                            }
                                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                                        >
                                            Apply filters
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {status && (
                            <div className="flex items-center gap-3 px-5 pt-4 text-sm">
                                <span className="font-semibold">
                                    Active filters
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                                    Statut:{' '}
                                    {{
                                        present: 'Présent',
                                        sorti: 'Sorti',
                                        mort: 'Mort',
                                    }[status] ?? status}
                                    <button
                                        type="button"
                                        aria-label="Remove filter"
                                        onClick={() => setStatus('')}
                                    >
                                        <X size={13} />
                                    </button>
                                </span>
                            </div>
                        )}
                        <div className="px-5 py-3 text-xs font-medium text-slate-500">
                            {filtered.length} result
                            {filtered.length !== 1 ? 's' : ''}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        {[
                                            'Code',
                                            'Espèce',
                                            'Catégorie',
                                            'Cohorte',
                                            'Loge',
                                            'Poids',
                                            'Effectif',
                                            'Statut',
                                            'Action',
                                        ].map((title) => (
                                            <th
                                                key={title}
                                                className="px-5 py-4"
                                            >
                                                {title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((animal) => {
                                        const href = `/animaux/${animal.id}`;

                                        return (
                                            <tr
                                                key={animal.id}
                                                className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                            >
                                                <Cell href={href} strong>
                                                    {animal.code}
                                                    {animal.encoche && (
                                                        <small className="mt-1 block font-normal text-slate-500">
                                                            Encoche{' '}
                                                            {animal.encoche}
                                                        </small>
                                                    )}
                                                </Cell>
                                                <Cell href={href}>
                                                    <Badge>
                                                        {animal.espece}
                                                    </Badge>
                                                </Cell>
                                                <Cell href={href}>
                                                    {animal.categorie}
                                                </Cell>
                                                <Cell href={href}>
                                                    {animal.cohorte ? (
                                                        <Badge>
                                                            {animal.cohorte}
                                                        </Badge>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </Cell>
                                                <Cell href={href}>
                                                    {animal.loge?.numero ?? '—'}
                                                    {animal.atelier && (
                                                        <small className="mt-1 block text-slate-500">
                                                            {animal.atelier}
                                                        </small>
                                                    )}
                                                </Cell>
                                                <Cell href={href}>
                                                    {animal.poids
                                                        ? `${animal.poids} kg`
                                                        : '—'}
                                                    {animal.poids_le && (
                                                        <small className="mt-1 block text-slate-500">
                                                            {new Date(
                                                                animal.poids_le,
                                                            ).toLocaleDateString(
                                                                'fr-FR',
                                                            )}
                                                        </small>
                                                    )}
                                                </Cell>
                                                <Cell href={href}>
                                                    {animal.effectif}
                                                </Cell>
                                                <Cell href={href}>
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${animal.statut === 'present' ? 'bg-emerald-100 text-emerald-700' : animal.statut === 'mort' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
                                                    >
                                                        {animal.statut}
                                                    </span>
                                                </Cell>
                                                <td className="space-x-3 px-5 py-4">
                                                    <Link
                                                        href={href}
                                                        className="font-semibold text-emerald-700 dark:text-emerald-400"
                                                    >
                                                        Carnet
                                                    </Link>
                                                    <Link
                                                        href={`/animaux/${animal.id}/edit`}
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
                                                colSpan={9}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                No animals
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
                                    {[5, 10, 25, 50].map((size) => (
                                        <option key={size}>{size}</option>
                                    ))}
                                </select>
                            </label>
                            {pages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </button>
                                    <span>
                                        {currentPage} / {pages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={currentPage === pages}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Record<string, string>;
}) {
    return (
        <label className="text-sm font-medium">
            {label}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
                <option value="">All</option>
                {Object.entries(options).map(([key, text]) => (
                    <option key={key} value={key}>
                        {text}
                    </option>
                ))}
            </select>
        </label>
    );
}
function Cell({
    href,
    strong,
    children,
}: {
    href: string;
    strong?: boolean;
    children: React.ReactNode;
}) {
    return (
        <td className={`px-5 py-4 ${strong ? 'font-semibold' : ''}`}>
            <Link href={href} className="block">
                {children}
            </Link>
        </td>
    );
}
function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-700">
            {children}
        </span>
    );
}
