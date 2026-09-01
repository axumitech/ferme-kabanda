import { Head, Link } from '@inertiajs/react';
import { Download, Eye, FileSpreadsheet, Plus } from 'lucide-react';

type PlanImport = {
    id: number;
    created_at: string;
    code_plan: string;
    fichier: string;
    statut: string;
    lignes_lues: number;
    lignes_ajout: number;
    lignes_modif: number;
    lignes_suppr: number;
    lignes_identiques: number;
    lignes_erreur: number;
};
const statusLabels: Record<string, string> = {
    analyse: 'À arbitrer',
    applique: 'Appliqué',
    abandonne: 'Abandonné',
};

export default function PlanImportsIndex({
    imports,
}: {
    imports: PlanImport[];
}) {
    return (
        <>
            <Head title="Imports de plan" />
            <main className="min-h-[calc(100svh-4rem)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
                <div className="w-full space-y-6">
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-[0.16em] text-emerald-700 uppercase">
                                Plans &amp; Gouvernance
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                Imports de plan
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Comparez chaque fichier au plan en vigueur et
                                arbitrez tous les écarts.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <a
                                href="/imports-plans/modele"
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                                <Download size={17} /> Télécharger le modèle CSV
                            </a>
                            <Link
                                href="/imports-plans/create"
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
                            >
                                <Plus size={18} /> Importer un plan
                            </Link>
                        </div>
                    </header>
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-5 py-3">
                                            Importé le
                                        </th>
                                        <th className="px-4 py-3">Plan</th>
                                        <th className="px-4 py-3">Fichier</th>
                                        <th className="px-4 py-3">
                                            Différences
                                        </th>
                                        <th className="px-4 py-3">Statut</th>
                                        <th className="px-5 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {imports.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/80"
                                        >
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {formatDateTime(
                                                    item.created_at,
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold">
                                                    {item.code_plan}
                                                </span>
                                            </td>
                                            <td className="max-w-xs px-4 py-4 font-semibold">
                                                {item.fichier}
                                                <span className="mt-1 block text-xs font-normal text-slate-500">
                                                    {item.lignes_lues} ligne(s)
                                                    lue(s)
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-xs leading-6 text-slate-600">
                                                <b className="text-emerald-700">
                                                    {item.lignes_ajout} ajouts
                                                </b>{' '}
                                                ·{' '}
                                                <b className="text-amber-700">
                                                    {item.lignes_modif} modifs
                                                </b>{' '}
                                                ·{' '}
                                                <b className="text-red-700">
                                                    {item.lignes_suppr} suppr.
                                                </b>
                                                <br />
                                                {item.lignes_identiques}{' '}
                                                identiques ·{' '}
                                                {item.lignes_erreur} erreurs
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.statut === 'analyse' ? 'bg-amber-100 text-amber-800' : item.statut === 'applique' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                                                >
                                                    {statusLabels[
                                                        item.statut
                                                    ] ?? item.statut}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={`/imports-plans/${item.id}`}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Eye size={14} /> Arbitrer
                                                    les écarts
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {imports.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-5 py-16 text-center text-slate-500"
                                            >
                                                <FileSpreadsheet
                                                    size={38}
                                                    className="mx-auto mb-3 text-slate-300"
                                                />
                                                Aucun plan importé.
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
