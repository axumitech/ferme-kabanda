import { Head, Link } from '@inertiajs/react';
import { BookOpen, Camera, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Entry = {
    id: number;
    reference: string;
    survenu_le: string;
    type: string;
    lieu?: string | null;
    objet: string;
    personne?: string | null;
    vehicule?: string | null;
    piece_identite?: string | null;
    agent_nom: string;
    photo_url?: string | null;
    site?: { code: string; nom: string } | null;
};

export default function DailyLogIndex({
    entries,
    types,
}: {
    entries: Entry[];
    types: Record<string, string>;
}) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const visibleEntries = useMemo(
        () =>
            entries.filter((entry) => {
                const matchesType = !type || entry.type === type;
                const haystack =
                    `${entry.reference} ${entry.objet} ${entry.personne ?? ''} ${entry.vehicule ?? ''} ${entry.lieu ?? ''}`.toLowerCase();

                return matchesType && haystack.includes(search.toLowerCase());
            }),
        [entries, search, type],
    );

    return (
        <>
            <Head title="Main courante" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                                Sécurité &amp; QHSE
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                Main courante
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Registre chronologique du poste de garde — en
                                ajout seul, jamais raturé.
                            </p>
                        </div>
                        <Link
                            href="/main-courante/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                            <Plus size={18} /> Nouvelle écriture
                        </Link>
                    </header>

                    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_280px]">
                        <label className="relative">
                            <Search
                                size={17}
                                className="absolute top-3.5 left-3 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Rechercher une référence, un objet, une personne…"
                                className="min-h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                            />
                        </label>
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700"
                        >
                            <option value="">Toutes les natures</option>
                            {Object.entries(types).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">
                                            Date et heure
                                        </th>
                                        <th className="px-4 py-3">Référence</th>
                                        <th className="px-4 py-3">Nature</th>
                                        <th className="px-4 py-3">Objet</th>
                                        <th className="px-4 py-3">
                                            Personne / véhicule
                                        </th>
                                        <th className="px-4 py-3">Lieu</th>
                                        <th className="px-4 py-3">Agent</th>
                                        <th className="px-5 py-3">Preuve</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {visibleEntries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="align-top hover:bg-slate-50/80"
                                        >
                                            <td className="px-5 py-4 font-semibold whitespace-nowrap">
                                                {formatDateTime(
                                                    entry.survenu_le,
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs font-bold text-slate-700">
                                                {entry.reference}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry.type === 'anomalie' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}
                                                >
                                                    {types[entry.type] ??
                                                        entry.type}
                                                </span>
                                            </td>
                                            <td className="max-w-md px-4 py-4 leading-6 text-slate-700">
                                                {entry.objet}
                                            </td>
                                            <td className="px-4 py-4">
                                                <b>{entry.personne || '—'}</b>
                                                {entry.vehicule && (
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        {entry.vehicule}
                                                    </span>
                                                )}
                                                {entry.piece_identite && (
                                                    <span className="mt-1 block text-xs text-slate-400">
                                                        Pièce :{' '}
                                                        {entry.piece_identite}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {entry.lieu || '—'}
                                                {entry.site && (
                                                    <span className="mt-1 block text-xs text-slate-500">
                                                        {entry.site.code} —{' '}
                                                        {entry.site.nom}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {entry.agent_nom}
                                            </td>
                                            <td className="px-5 py-4">
                                                {entry.photo_url ? (
                                                    <a
                                                        href={entry.photo_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
                                                    >
                                                        <Camera size={15} />{' '}
                                                        Photo
                                                    </a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleEntries.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <BookOpen
                                                    size={38}
                                                    className="mx-auto mb-3 text-slate-300"
                                                />
                                                Aucune écriture trouvée.
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

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}
