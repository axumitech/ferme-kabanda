import { Head, Link } from '@inertiajs/react';
import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Emplacement = {
    id: number;
    code: string;
    libelle: string;
    zone?: string | null;
    type: string;
    articles_count: number;
    actif: boolean;
    site?: { id: number; nom: string } | null;
};

export default function EmplacementIndex({ emplacements, types }: { emplacements: Emplacement[]; types: Record<string, string> }) {
    const [query, setQuery] = useState('');
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        return emplacements.filter((item) => `${item.code} ${item.libelle} ${item.zone ?? ''} ${types[item.type] ?? item.type} ${item.site?.nom ?? ''}`.toLocaleLowerCase('fr').includes(needle));
    }, [emplacements, query, types]);

    return <>
        <Head title="Emplacements" />
        <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full space-y-6">
                <div className="text-sm text-slate-500"><Link href="/emplacements" className="hover:text-emerald-600">Emplacements</Link><span className="mx-2">›</span>List</div>
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Emplacements</h1>
                    <Link href="/emplacements/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">Nouvel emplacement</Link>
                </header>
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex justify-end border-b border-slate-200 p-4 dark:border-slate-800">
                        <label className="relative block w-full max-w-xs"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
                    </div>
                    <div className="px-5 py-3 text-xs font-medium text-slate-500">{rows.length} results</div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300"><tr>{['Adresse', 'Libellé', 'Zone', 'Type', 'Articles', 'Site', 'Actif', 'Action'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {rows.map((item) => <tr key={item.id} className="even:bg-slate-50/60 dark:even:bg-slate-950/30">
                                <Cell href={`/emplacements/${item.id}/edit`} strong>{item.code}</Cell><Cell href={`/emplacements/${item.id}/edit`} strong>{item.libelle}</Cell>
                                <Cell href={`/emplacements/${item.id}/edit`}>{item.zone ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-700">{item.zone}</span> : '—'}</Cell>
                                <Cell href={`/emplacements/${item.id}/edit`}>{types[item.type] ?? item.type}</Cell><Cell href={`/emplacements/${item.id}/edit`}>{item.articles_count}</Cell><Cell href={`/emplacements/${item.id}/edit`}>{item.site?.nom ?? '—'}</Cell>
                                <td className="px-5 py-4">{item.actif ? <Check size={20} className="text-emerald-600" aria-label="Yes" /> : <X size={20} className="text-red-600" aria-label="No" />}</td>
                                <td className="px-5 py-4 text-right"><Link href={`/emplacements/${item.id}/edit`} className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400">Edit</Link></td>
                            </tr>)}
                            {rows.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-500">No emplacements</td></tr>}
                        </tbody>
                    </table></div>
                </section>
            </div>
        </main>
    </>;
}

function Cell({ href, strong, children }: { href: string; strong?: boolean; children: React.ReactNode }) {
    return <td className={`px-5 py-4 ${strong ? 'font-semibold' : ''}`}><Link href={href} className="block">{children}</Link></td>;
}
