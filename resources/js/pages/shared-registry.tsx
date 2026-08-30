import { Head } from '@inertiajs/react';
import { AlertTriangle, Boxes, ClipboardList, Sprout } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type Tab =
    | 'taches'
    | 'production'
    | 'magasin'
    | 'mouvements'
    | 'demandes'
    | 'incidents'
    | 'plans'
    | 'references';

type Props = {
    scopeMessage: string;
    initialTab: Tab;
    plantations: Array<{
        id: number;
        reference: string;
        culture?: string | null;
        lieu: string;
        j0: string;
        quantite?: string | null;
        unite?: string | null;
    }>;
    recoltes: Array<{
        id: number;
        date?: string | null;
        culture?: string | null;
        lieu?: string | null;
        quantite: string;
        unite: string;
        canal: string;
        par?: string | null;
    }>;
    tasks: Array<{
        id: number;
        reference: string;
        titre: string;
        statut: string;
        date_due: string;
        responsable?: string | null;
        departement?: string | null;
        site?: string | null;
    }>;
    articles: Array<{
        id: number;
        code: string;
        categorie: string;
        libelle: string;
        stock: string;
        unite?: string | null;
        seuil?: string | null;
        valeur?: string | null;
    }>;
    requisitions: Array<{
        id: number;
        reference: string;
        type: string;
        objet: string;
        statut: string;
        demandeur?: string | null;
        article?: string | null;
        quantite?: string | null;
        unite?: string | null;
        montant?: string | null;
    }>;
    mouvements: Array<{
        id: number;
        type: string;
        article: string;
        quantite: string;
        unite?: string | null;
        motif: string;
        par: string;
        le?: string | null;
    }>;
    incidents: Array<{
        id: number;
        reference: string;
        nature: string;
        statut: string;
        lieu?: string | null;
        description: string;
        signale_le?: string | null;
    }>;
    plans: Array<{
        id: number;
        code: string;
        libelle: string;
        type: string;
        version: number;
        date_effet?: string | null;
    }>;
    references: Record<
        string,
        Array<{
            id: number;
            category: string;
            label: string;
            description?: string | null;
        }>
    >;
};

export default function SharedRegistry({
    scopeMessage,
    initialTab,
    plantations,
    recoltes,
    tasks,
    articles,
    requisitions,
    mouvements,
    incidents,
    plans,
    references,
}: Props) {
    const [tab, setTab] = useState<Tab>(initialTab);
    const tabs: Array<[Tab, string]> = [
        ['taches', 'Tâches'],
        ['production', 'Production'],
        ['magasin', 'Magasin'],
        ['mouvements', 'Mouvements'],
        ['demandes', 'Réquisitions'],
        ['incidents', 'Incidents'],
        ['plans', 'Plans'],
        ['references', 'Référentiels'],
    ];

    return (
        <AppLayout>
            <Head title="Registre partagé" />
            <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="rounded-2xl bg-[#174a31] p-6 text-white shadow-lg">
                        <p className="text-xs font-bold tracking-widest text-emerald-200 uppercase">
                            Mémoire commune
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold">
                            Registre partagé de la ferme
                        </h1>
                        <p className="mt-3 max-w-3xl text-sm text-emerald-100">
                            {scopeMessage}
                        </p>
                    </section>
                    <nav className="flex flex-wrap gap-2">
                        {tabs.map(([key, label]) => (
                            <button
                                type="button"
                                key={key}
                                onClick={() => setTab(key)}
                                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === key ? 'bg-[#174a31] text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                    {tab === 'taches' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {tasks.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={ClipboardList}
                                    title={item.titre}
                                    subtitle={`${item.reference} · ${item.statut} · ${item.date_due}${item.responsable ? ` · ${item.responsable}` : ''}${item.departement ? ` · ${item.departement}` : ''}`}
                                />
                            ))}
                            <Empty
                                items={tasks}
                                text="Aucune tâche dans le registre."
                            />
                        </section>
                    )}
                    {tab === 'production' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {plantations.map((item) => (
                                <Card
                                    key={`plantation-${item.id}`}
                                    icon={Sprout}
                                    title={`${item.culture ?? 'Culture'} - ${item.lieu}`}
                                    subtitle={`${item.reference} · J0 ${item.j0}${item.quantite ? ` · ${item.quantite} ${item.unite ?? ''}` : ''}`}
                                />
                            ))}
                            {recoltes.map((item) => (
                                <Card
                                    key={`recolte-${item.id}`}
                                    icon={Sprout}
                                    title={`Récolte — ${item.culture ?? 'Culture'}`}
                                    subtitle={`${item.quantite} ${item.unite} · ${item.canal}${item.lieu ? ` · ${item.lieu}` : ''}${item.par ? ` · ${item.par}` : ''}${item.date ? ` · ${item.date}` : ''}`}
                                />
                            ))}
                            <Empty
                                items={[...plantations, ...recoltes]}
                                text="Aucune plantation ou récolte dans le registre."
                            />
                        </section>
                    )}
                    {tab === 'magasin' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {articles.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={Boxes}
                                    title={item.libelle}
                                    subtitle={`${item.code} · ${item.stock} ${item.unite ?? ''}${item.seuil ? ` · seuil ${item.seuil}` : ''}${item.valeur ? ` · valeur ${item.valeur}` : ''}`}
                                />
                            ))}
                            <Empty
                                items={articles}
                                text="Aucun article actif."
                            />
                        </section>
                    )}
                    {tab === 'mouvements' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {mouvements.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={Boxes}
                                    title={`${item.type} · ${item.article}`}
                                    subtitle={`${item.quantite} ${item.unite ?? ''} · ${item.motif} · ${item.par}`}
                                />
                            ))}
                            <Empty
                                items={mouvements}
                                text="Aucun mouvement de magasin."
                            />
                        </section>
                    )}
                    {tab === 'demandes' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {requisitions.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={ClipboardList}
                                    title={item.objet}
                                    subtitle={`${item.reference} · ${item.type} · ${item.statut}${item.demandeur ? ` · demandé par ${item.demandeur}` : ''}${item.article ? ` · ${item.article}` : ''}${item.quantite ? ` · ${item.quantite} ${item.unite ?? ''}` : ''}${item.montant ? ` · ${item.montant}` : ''}`}
                                />
                            ))}
                            <Empty
                                items={requisitions}
                                text="Aucune réquisition."
                            />
                        </section>
                    )}
                    {tab === 'incidents' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {incidents.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={AlertTriangle}
                                    title={`${item.reference} · ${item.nature}`}
                                    subtitle={`${item.statut}${item.lieu ? ` · ${item.lieu}` : ''} · ${item.description}`}
                                />
                            ))}
                            <Empty
                                items={incidents}
                                text="Aucun incident visible."
                            />
                        </section>
                    )}
                    {tab === 'plans' && (
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {plans.map((item) => (
                                <Card
                                    key={item.id}
                                    icon={ClipboardList}
                                    title={item.libelle}
                                    subtitle={`${item.code} v${item.version} · ${item.type}${item.date_effet ? ` · effet ${item.date_effet}` : ''}`}
                                />
                            ))}
                            <Empty
                                items={plans}
                                text="Aucun plan en vigueur."
                            />
                        </section>
                    )}
                    {tab === 'references' && (
                        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            {Object.entries(references).map(
                                ([category, items]) => (
                                    <article
                                        key={category}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <h2 className="font-bold text-[#174a31] capitalize">
                                            {category.replaceAll('_', ' ')}
                                        </h2>
                                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                            {items.map((item) => (
                                                <li key={item.id}>
                                                    {item.label}
                                                    {item.description ? (
                                                        <span className="block text-xs text-slate-400">
                                                            {item.description}
                                                        </span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ),
                            )}
                            <Empty
                                items={Object.values(references)}
                                text="Aucun référentiel actif."
                            />
                        </section>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}

function Card({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: typeof Sprout;
    title: string;
    subtitle: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#174a31]">
                    <Icon size={19} />
                </span>
                <div className="min-w-0">
                    <h2 className="font-bold text-slate-800">{title}</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                        {subtitle}
                    </p>
                </div>
            </div>
        </article>
    );
}

function Empty({ items, text }: { items: unknown[]; text: string }) {
    return items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            {text}
        </div>
    ) : null;
}
