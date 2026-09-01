import { Head, Link, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type Client = { id: number; code: string; nom: string; canal: string; devise_preferee: string; prix_reference?: string | null; unite_reference?: string | null; ventes_count: number; telephone?: string | null; actif: boolean };

export default function ClientIndex({ clients, canaux }: { clients: Client[]; canaux: Record<string, string> }) {
    const page = usePage<{ flash?: { success?: string } }>();
    const [query, setQuery] = useState('');
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        return clients.filter((client) => `${client.code} ${client.nom} ${canaux[client.canal] ?? client.canal} ${client.telephone ?? ''}`.toLocaleLowerCase('fr').includes(needle));
    }, [clients, query, canaux]);

    return <><Head title="Clients" /><main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100"><div className="w-full space-y-6">
        <div className="text-sm text-slate-500"><Link href="/clients" className="hover:text-emerald-600">Clients</Link><span className="mx-2">›</span>List</div>
        <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-tight">Clients</h1><Link href="/clients/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">Nouveau client</Link></header>
        {page.props.flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{page.props.flash.success}</div>}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-end border-b p-4 dark:border-slate-800"><label className="relative block w-full max-w-xs"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/><span className="sr-only">Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950"/></label></div><div className="px-5 py-3 text-xs font-medium text-slate-500">{rows.length} results</div>
            <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold dark:bg-slate-950/60"><tr>{['Code','Client','Canal','Prix de référence','Ventes','Téléphone','Action'].map((h)=><th key={h} className="px-5 py-4">{h}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{rows.map((client)=><tr key={client.id} className="even:bg-slate-50/60 dark:even:bg-slate-950/30"><Cell href={`/clients/${client.id}/edit`} strong>{client.code}</Cell><Cell href={`/clients/${client.id}/edit`} strong>{client.nom}{!client.actif&&<small className="ml-2 rounded bg-red-100 px-2 py-0.5 text-red-700">Inactif</small>}</Cell><Cell href={`/clients/${client.id}/edit`}><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${client.canal==='premium'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{canaux[client.canal]??client.canal}</span></Cell><Cell href={`/clients/${client.id}/edit`}>{client.prix_reference?`${Number(client.prix_reference).toLocaleString('fr-FR',{minimumFractionDigits:2})} ${client.devise_preferee}/${client.unite_reference??'unité'}`:'—'}</Cell><Cell href={`/clients/${client.id}/edit`}>{client.ventes_count}</Cell><Cell href={`/clients/${client.id}/edit`}>{client.telephone??'—'}</Cell><td className="px-5 py-4 text-right"><Link href={`/clients/${client.id}/edit`} className="font-semibold text-emerald-700 hover:underline">Edit</Link></td></tr>)}{!rows.length&&<tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No clients</td></tr>}</tbody></table></div>
        </section>
    </div></main></>;
}
function Cell({href,strong,children}:{href:string;strong?:boolean;children:React.ReactNode}){return <td className={`px-5 py-4 ${strong?'font-semibold':''}`}><Link href={href} className="block">{children}</Link></td>}
