import { Head, Link, useForm } from '@inertiajs/react';
import { Check, ChevronDown, Search, ThumbsUp, Truck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Requisition = {
    id: number; reference: string; type: 'STK' | 'NEW' | 'CSH'; objet: string;
    article?: { code: string; libelle: string } | null;
    unite?: { nom: string } | null; demandeur?: { name: string } | null;
    demandeur_id?: number | null; nouvel_article?: string | null;
    quantite?: string | null; valeur?: string | null; niveau_requis?: number | null;
    statut: string; created_at: string;
};
type ActionName = 'verify' | 'approve' | 'serve' | 'refuse';

const statusLabels: Record<string, string> = {
    demandee: 'À vérifier', verifiee: 'À approuver', approuvee: 'À servir',
    servie: 'Servie', refusee: 'Refusée', annulee: 'Annulée',
};
const statusColors: Record<string, string> = {
    demandee: 'bg-slate-100 text-slate-700', verifiee: 'bg-amber-100 text-amber-800',
    approuvee: 'bg-sky-100 text-sky-800', servie: 'bg-emerald-100 text-emerald-800',
    refusee: 'bg-red-100 text-red-700', annulee: 'bg-slate-100 text-slate-600',
};
const typeColors: Record<string, string> = {
    STK: 'bg-sky-100 text-sky-800', NEW: 'bg-amber-100 text-amber-800', CSH: 'bg-red-100 text-red-700',
};

export default function RequisitionIndex({ requisitions, canSeeAmounts, currentUserId }: { requisitions: Requisition[]; canSeeAmounts: boolean; currentUserId: number }) {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [mine, setMine] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [selected, setSelected] = useState<Requisition | null>(null);
    const [action, setAction] = useState<ActionName | null>(null);
    const actionForm = useForm({ note: '', motif: '' });
    const actionError = (actionForm.errors as Record<string, string>).action;
    const rows = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase('fr');
        return requisitions.filter((requisition) =>
            (!needle || `${requisition.reference} ${requisition.objet} ${requisition.demandeur?.name ?? ''}`.toLocaleLowerCase('fr').includes(needle)) &&
            (!status || requisition.statut === status) && (!type || requisition.type === type) &&
            (!mine || (mine === 'yes' ? requisition.demandeur_id === currentUserId : requisition.demandeur_id !== currentUserId)),
        );
    }, [requisitions, query, status, type, mine, currentUserId]);
    const open = (requisition: Requisition, nextAction: ActionName) => {
        setSelected(requisition); setAction(nextAction); actionForm.reset(); actionForm.clearErrors();
    };
    const close = () => { setSelected(null); setAction(null); actionForm.clearErrors(); };
    const submitAction = () => {
        if (!selected || !action) return;
        actionForm.post(`/requisitions/${selected.id}/${action}`, { preserveScroll: true, onSuccess: close });
    };

    return <>
        <Head title="Réquisitions" />
        <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
            <div className="w-full space-y-6">
                <div className="text-sm text-slate-500"><Link href="/requisitions" className="hover:text-emerald-600">Réquisitions</Link><span className="mx-2">›</span>List</div>
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Réquisitions</h1>
                    <Link href="/requisitions/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">Nouvelle réquisition</Link>
                </header>
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap justify-end gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
                        <label className="relative block w-full max-w-xs">
                            <Search size={17} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                            <span className="sr-only">Search</span>
                            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950" />
                        </label>
                        <Filter label="Statut" value={status} set={setStatus} options={Object.entries(statusLabels)} all="Tous les statuts" />
                        <Filter label="Type" value={type} set={setType} options={['STK', 'NEW', 'CSH'].map((value) => [value, value])} all="Tous les types" />
                        <Filter label="Mes demandes" value={mine} set={setMine} options={[["yes", "Oui"], ["no", "Non"]]} all="Toute la ferme" />
                    </div>
                    <div className="px-5 py-3 text-xs font-medium text-slate-500">{rows.length} result{rows.length !== 1 ? 's' : ''}</div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1120px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                <tr>{['Référence', 'Type', 'Objet', 'Demandeur', ...(canSeeAmounts ? ['Valeur', 'DoA'] : []), 'Statut', 'Créée', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rows.slice(0, pageSize).map((requisition) => <tr key={requisition.id} className="even:bg-slate-50/60 dark:even:bg-slate-950/30">
                                    <Cell strong>{requisition.reference}</Cell>
                                    <Cell><Badge className={typeColors[requisition.type]}>{requisition.type}</Badge></Cell>
                                    <Cell><span className="font-medium">{requisition.objet}</span>{(requisition.article || requisition.nouvel_article) && <small className="mt-1 block text-slate-500">{requisition.article ? `${requisition.article.code} · ${formatQuantity(requisition.quantite)} ${requisition.unite?.nom ?? ''}` : requisition.nouvel_article}</small>}</Cell>
                                    <Cell>{requisition.demandeur?.name ?? '—'}</Cell>
                                    {canSeeAmounts && <Cell>{Number(requisition.valeur ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}</Cell>}
                                    {canSeeAmounts && <Cell><Badge className="bg-slate-100 text-slate-700">Niveau {requisition.niveau_requis ?? '—'}</Badge></Cell>}
                                    <Cell><Badge className={statusColors[requisition.statut] ?? statusColors.demandee}>{statusLabels[requisition.statut] ?? requisition.statut}</Badge></Cell>
                                    <Cell>{new Date(requisition.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Cell>
                                    <td className="px-5 py-4"><div className="flex min-w-max items-center gap-2">
                                        {requisition.statut === 'demandee' && requisition.demandeur_id !== currentUserId && <ActionButton label="Vérifier" icon={<Check size={15} />} className="bg-amber-500 text-white hover:bg-amber-600" onClick={() => open(requisition, 'verify')} />}
                                        {requisition.statut === 'verifiee' && <ActionButton label="Approuver" icon={<ThumbsUp size={15} />} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => open(requisition, 'approve')} />}
                                        {requisition.statut === 'approuvee' && <ActionButton label="Servir" icon={<Truck size={15} />} className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => open(requisition, 'serve')} />}
                                        {['demandee', 'verifiee'].includes(requisition.statut) && <DropdownMenu>
                                            <DropdownMenuTrigger asChild><button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">More actions <ChevronDown size={14} /></button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => open(requisition, 'refuse')} className="text-red-600">Refuser</DropdownMenuItem></DropdownMenuContent>
                                        </DropdownMenu>}
                                        {!['demandee', 'verifiee', 'approuvee'].includes(requisition.statut) && <span className="text-slate-400">—</span>}
                                    </div></td>
                                </tr>)}
                                {rows.length === 0 && <tr><td colSpan={canSeeAmounts ? 9 : 7} className="px-5 py-12 text-center text-slate-500">Aucune réquisition.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
                        <label htmlFor="req-page-size" className="text-slate-500">Per page</label>
                        <select id="req-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-950">{[5, 10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select>
                    </div>
                </section>
            </div>
        </main>

        {selected && action && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={actionTitle(action)}>
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{actionTitle(action)}</h2><p className="mt-1 text-sm text-slate-500">{selected.reference} — {selected.objet}</p></div><button type="button" onClick={close} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></div>
                {action === 'verify' && <label className="mt-5 block text-sm font-medium">Note de vérification<textarea rows={3} value={actionForm.data.note} onChange={(event) => actionForm.setData('note', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950" /></label>}
                {action === 'refuse' && <label className="mt-5 block text-sm font-medium">Motif du refus<span className="text-red-600">*</span><textarea required rows={3} value={actionForm.data.motif} onChange={(event) => actionForm.setData('motif', event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950" /></label>}
                {action === 'approve' && <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-950">Valeur {Number(selected.valeur ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD — délégation requise : niveau {selected.niveau_requis ?? '—'}.</p>}
                {action === 'serve' && <p className="mt-5 text-sm">Confirmez-vous le service de cette réquisition ? Une sortie de stock sera écrite pour une demande STK.</p>}
                        {(actionError || actionForm.errors.note || actionForm.errors.motif) && <p className="mt-3 text-sm text-red-600">{actionError ?? actionForm.errors.note ?? actionForm.errors.motif}</p>}
                <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Cancel</button><button type="button" disabled={actionForm.processing || (action === 'refuse' && !actionForm.data.motif.trim())} onClick={submitAction} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${action === 'refuse' ? 'bg-red-600' : 'bg-emerald-600'}`}>{actionTitle(action)}</button></div>
            </div>
        </div>}
    </>;
}

function Filter({ label, value, set, options, all }: { label: string; value: string; set: (value: string) => void; options: string[][]; all: string }) {
    return <select aria-label={label} value={value} onChange={(event) => set(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="">{all}</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>;
}
function Cell({ children, strong }: { children: React.ReactNode; strong?: boolean }) { return <td className={`px-5 py-4 ${strong ? 'font-semibold' : ''}`}>{children}</td>; }
function Badge({ children, className }: { children: React.ReactNode; className: string }) { return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>; }
function ActionButton({ label, icon, className, onClick }: { label: string; icon: React.ReactNode; className: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm ${className}`}>{icon}{label}</button>; }
function formatQuantity(value?: string | null) { return Number(value ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 4 }); }
function actionTitle(action: ActionName) { return ({ verify: 'Vérifier', approve: 'Approuver', serve: 'Servir', refuse: 'Refuser' })[action]; }
