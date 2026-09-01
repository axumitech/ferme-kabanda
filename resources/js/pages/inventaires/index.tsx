import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { BarChart3, LockKeyhole, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Progress = { total: number; comptes: number; ecarts: number; pourcentage: number; exactitude: number | null };
type Inventory = {
    id: number; reference: string; date_comptage: string; libelle: string; type: string;
    statut: string; ecart_valeur: string; avancement: Progress;
};
const typeLabels: Record<string, string> = { tournant: 'Tournant (par rotation)', annuel: 'Annuel (exhaustif)', ponctuel: 'Ponctuel (sur alerte)' };
const statusColors: Record<string, string> = { ouverte: 'bg-amber-100 text-amber-800', comptee: 'bg-sky-100 text-sky-800', arbitree: 'bg-violet-100 text-violet-800', cloturee: 'bg-emerald-100 text-emerald-800' };

export default function InventoryIndex({ inventaires, statuts }: { inventaires: Inventory[]; statuts: Record<string, string> }) {
    const page = usePage<{ flash?: { success?: string } }>();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [abcOpen, setAbcOpen] = useState(false);
    const [closing, setClosing] = useState<Inventory | null>(null);
    const abcForm = useForm({});
    const closeForm = useForm({});
    const abcActionError = (abcForm.errors as Record<string, string>).action;
    const closeActionError = (closeForm.errors as Record<string, string>).action;
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        return inventaires.filter((inventory) => (!needle || `${inventory.reference} ${inventory.libelle}`.toLocaleLowerCase('fr').includes(needle)) && (!status || inventory.statut === status));
    }, [inventaires, query, status]);

    return <>
        <Head title="Inventaires" />
        <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full space-y-6">
                <div className="text-sm text-slate-500"><Link href="/inventaires" className="hover:text-emerald-600">Inventaires</Link><span className="mx-2">›</span>List</div>
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div><h1 className="text-3xl font-bold tracking-tight">Inventaires</h1><p className="mt-2 max-w-4xl text-sm text-slate-600 dark:text-slate-400">Il n'existe qu'une seule façon de corriger un stock : une campagne comptée, recomptée si l'écart dépasse 5 %, arbitrée par une autre personne que le compteur, puis clôturée.</p></div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/inventaires/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">Ouvrir un inventaire</Link>
                        <button type="button" onClick={() => { abcForm.clearErrors(); setAbcOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"><BarChart3 size={17} />Recalculer la classification ABC</button>
                    </div>
                </header>
                {page.props.flash?.success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{page.props.flash.success}</div>}
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                        <label className="relative block w-full max-w-xs"><Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950" /></label>
                        <select aria-label="Statut" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="">Tous les statuts</option>{Object.entries(statuts).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                    </div>
                    <div className="px-5 py-3 text-xs font-medium text-slate-500">{rows.length === 0 ? 'No results' : `${rows.length} result${rows.length > 1 ? 's' : ''}`}</div>
                    <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300"><tr>{['Référence', 'Comptage', 'Intitulé', 'Type', 'Avancement', 'Exactitude', 'Écart valorisé', 'Statut', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {rows.map((inventory) => <tr key={inventory.id} className="even:bg-slate-50/60 dark:even:bg-slate-950/30">
                                <Cell><Link href={`/inventaires/${inventory.id}`} className="font-semibold text-emerald-700 hover:underline">{inventory.reference}</Link></Cell>
                                <Cell>{formatDate(inventory.date_comptage)}</Cell><Cell>{inventory.libelle}</Cell>
                                <Cell><Badge className="bg-slate-100 text-slate-700">{typeLabels[inventory.type] ?? inventory.type}</Badge></Cell>
                                <Cell><span className="font-medium">{inventory.avancement.comptes} / {inventory.avancement.total} ({inventory.avancement.pourcentage} %)</span><small className="mt-1 block text-slate-500">{inventory.avancement.ecarts} écart(s)</small></Cell>
                                <Cell><Badge className={accuracyColor(inventory.avancement.exactitude)}>{inventory.avancement.exactitude === null ? '—' : `${inventory.avancement.exactitude} %`}</Badge></Cell>
                                <Cell><span className={Number(inventory.ecart_valeur) < 0 ? 'text-red-600' : ''}>{Number(inventory.ecart_valeur).toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}</span></Cell>
                                <Cell><Badge className={statusColors[inventory.statut] ?? 'bg-slate-100 text-slate-700'}>{statuts[inventory.statut] ?? inventory.statut}</Badge></Cell>
                                <td className="px-5 py-4"><div className="flex min-w-max gap-2"><Link href={`/inventaires/${inventory.id}`} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Compter</Link>{inventory.statut !== 'cloturee' && <button type="button" onClick={() => { closeForm.clearErrors(); setClosing(inventory); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-700"><LockKeyhole size={14} />Clôturer</button>}</div></td>
                            </tr>)}
                            {rows.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center"><p className="text-lg font-semibold">No inventaires</p></td></tr>}
                        </tbody>
                    </table></div>
                </section>
            </div>
        </main>
        {abcOpen && <Modal title="Recalculer la classification ABC" close={() => setAbcOpen(false)} error={abcActionError} confirm="Confirm" processing={abcForm.processing} submit={() => abcForm.post('/inventaires/recalculer-abc', { onSuccess: () => setAbcOpen(false) })}><p className="text-sm text-slate-600 dark:text-slate-300">Classe les articles sur la consommation valorisée des 12 derniers mois : A = 80 % de la valeur, B = 15 %, C = 5 %.</p></Modal>}
        {closing && <Modal title="Clôturer l'inventaire" close={() => setClosing(null)} error={closeActionError} confirm="Clôturer" processing={closeForm.processing} submit={() => closeForm.post(`/inventaires/${closing.id}/cloturer`, { onSuccess: () => setClosing(null) })}><p className="text-sm text-slate-600 dark:text-slate-300">Les écarts arbitrés deviennent des mouvements datés dans le registre. Rien n'est écrasé.</p></Modal>}
    </>;
}

function Modal({ title, close, error, confirm, processing, submit, children }: { title: string; close: () => void; error?: string; confirm: string; processing: boolean; submit: () => void; children: React.ReactNode }) {
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="alertdialog" aria-modal="true" aria-label={title}><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={close} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div><div className="mt-4">{children}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" disabled={processing} onClick={submit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{confirm}</button></div></div></div>;
}
function Cell({ children }: { children: React.ReactNode }) { return <td className="px-5 py-4">{children}</td>; }
function Badge({ children, className }: { children: React.ReactNode; className: string }) { return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>; }
function formatDate(value: string) { return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR'); }
function accuracyColor(value: number | null) { return value === null ? 'bg-slate-100 text-slate-600' : value >= 98 ? 'bg-emerald-100 text-emerald-800' : value >= 95 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'; }
