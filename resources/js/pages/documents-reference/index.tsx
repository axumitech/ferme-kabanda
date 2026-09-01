import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    Eye,
    FileCheck2,
    FileText,
    Plus,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type Document = {
    id: number;
    code: string;
    titre: string;
    type: string;
    version: string | null;
    date_version: string | null;
    fichier: string | null;
    actif: boolean;
    sections_count: number;
    created_at: string;
};

export default function DocumentsReferenceIndex({
    documents,
    types,
}: {
    documents: Document[];
    types: Record<string, string>;
}) {
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const filtered = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase('fr');

        return documents.filter(
            (document) =>
                (!type || document.type === type) &&
                (!needle ||
                    `${document.code} ${document.titre}`
                        .toLocaleLowerCase('fr')
                        .includes(needle)),
        );
    }, [documents, search, type]);
    const active = documents.filter((document) => document.actif).length;
    const paragraphs = documents.reduce(
        (sum, document) => sum + document.sections_count,
        0,
    );

    return (
        <>
            <Head title="Politiques & procédures" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[.16em] text-emerald-700 uppercase">
                                Plans &amp; Gouvernance
                            </p>
                            <h1 className="mt-1 text-3xl font-black tracking-tight">
                                Politiques &amp; procédures
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                                Le référentiel documentaire officiel :
                                politiques, procédures, fiches techniques et
                                manuels.
                            </p>
                        </div>
                        <Link
                            href="/documents-reference/create"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                            <Plus size={18} /> Nouveau document
                        </Link>
                    </header>
                    <section className="grid gap-3 sm:grid-cols-3">
                        <Stat
                            icon={<FileText size={18} />}
                            label="Documents"
                            value={documents.length}
                        />
                        <Stat
                            icon={<FileCheck2 size={18} />}
                            label="Documents actifs"
                            value={active}
                            green
                        />
                        <Stat
                            icon={<BookOpen size={18} />}
                            label="Paragraphes adressables"
                            value={paragraphs}
                        />
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
                            <label className="relative">
                                <Search
                                    size={17}
                                    className="absolute top-3 left-3 text-slate-400"
                                />
                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Rechercher un code ou un titre…"
                                    className="min-h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10 text-sm outline-none focus:border-emerald-700"
                                />
                            </label>
                            <select
                                value={type}
                                onChange={(event) =>
                                    setType(event.target.value)
                                }
                                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-700"
                            >
                                <option value="">Tous les types</option>
                                {Object.entries(types).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">Code</th>
                                        <th className="px-4 py-3">Titre</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Version</th>
                                        <th className="px-4 py-3">
                                            Paragraphes
                                        </th>
                                        <th className="px-4 py-3">État</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filtered.map((document) => (
                                        <tr
                                            key={document.id}
                                            className="hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-white">
                                                    {document.code}
                                                </span>
                                            </td>
                                            <td className="max-w-lg px-4 py-4 font-semibold">
                                                {document.titre}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
                                                    {types[document.type] ??
                                                        document.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {document.version || '—'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <b>{document.sections_count}</b>
                                                <span className="mt-1 block text-xs text-slate-500">
                                                    Adressables depuis une tâche
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${document.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}
                                                >
                                                    {document.actif
                                                        ? 'Actif'
                                                        : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/documents-reference/${document.id}`}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                                                >
                                                    <Eye size={14} />{' '}
                                                    Paragraphes
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <FileText
                                                    size={40}
                                                    className="mx-auto mb-3 text-slate-300"
                                                />
                                                Aucun document de référence.
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

function Stat({
    icon,
    label,
    value,
    green = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    green?: boolean;
}) {
    return (
        <article
            className={`rounded-2xl border p-5 shadow-sm ${green ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white'}`}
        >
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase opacity-70">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-3xl font-black">{value}</p>
        </article>
    );
}
