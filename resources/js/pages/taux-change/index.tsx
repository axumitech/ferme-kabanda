import { Head, Link, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Rate = { id: number; devise: string; taux: string; effet_le: string; source?: string | null; saisi_par_nom?: string | null; statut: 'actuel' | 'historique' | 'avenir' };
const statusLabels = { actuel: 'EN VIGUEUR', historique: 'Historique', avenir: 'À venir' };
const statusColors = { actuel: 'bg-emerald-100 text-emerald-800', historique: 'bg-slate-100 text-slate-700', avenir: 'bg-sky-100 text-sky-800' };

export default function RateIndex({ taux }: { taux: Rate[] }) {
    const page = usePage<{ flash?: { success?: string } }>();
    const [query, setQuery] = useState('');
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        return taux.filter((rate) => `${rate.devise} ${rate.source ?? ''} ${rate.saisi_par_nom ?? ''} ${statusLabels[rate.statut]}`.toLocaleLowerCase('fr').includes(needle));
    }, [query, taux]);

    return <><Head title="Taux de change" /><main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100"><div className="w-full space-y-6">
        <div className="text-sm text-slate-500"><Link href="/taux-change" className="hover:text-emerald-600">Taux de change</Link><span className="mx-2">›</span>List</div>
        <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Taux de change</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Chaque bon conserve le taux applicable à sa date. Un nouveau taux ne modifie jamais les anciennes ventes.</p></div><Link href="/taux-change/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">Nouveau taux</Link></header>
        {page.props.flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{page.props.flash.success}</div>}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-end border-b p-4 dark:border-slate-800"><label className="relative block w-full max-w-xs"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/><span className="sr-only">Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950"/></label></div><div className="px-5 py-3 text-xs font-medium text-slate-500">{rows.length} results</div>
            <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold dark:bg-slate-950/60"><tr>{['En vigueur depuis','Devise','1 USD =','Source','Saisi par','Statut'].map((heading)=><th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{rows.map((rate)=><tr key={rate.id} className="even:bg-slate-50/60 dark:even:bg-slate-950/30"><Cell>{date(rate.effet_le)}</Cell><Cell><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-700">{rate.devise}</span></Cell><Cell><strong>{Number(rate.taux).toLocaleString('fr-FR',{minimumFractionDigits:2})} {rate.devise}</strong></Cell><Cell>{rate.source??'—'}</Cell><Cell>{rate.saisi_par_nom??'—'}</Cell><Cell><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusColors[rate.statut]}`}>{statusLabels[rate.statut]}</span></Cell></tr>)}{!rows.length&&<tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No taux de change</td></tr>}</tbody></table></div>
        </section>
    </div></main></>;
}
function Cell({children}:{children:React.ReactNode}){return <td className="px-5 py-4">{children}</td>} function date(value:string){return new Date(`${value.slice(0,10)}T00:00:00`).toLocaleDateString('fr-FR')}
