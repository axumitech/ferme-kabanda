import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';

type Animal = {
    id: number;
    code: string;
    categorie: string;
    naissance?: string | null;
    ligne?: string | null;
    cohorte?: string | null;
    pere?: string | null;
    atelier?: string | null;
    poids?: string | null;
    poids_le?: string | null;
    verrat_interdit?: string | null;
    statut: string;
    sortie_motif?: string | null;
    stade_alimentaire?: string | null;
    mere?: { code: string } | null;
    loge?: { numero: string } | null;
};
type Event = {
    id: number;
    type: string;
    date: string;
    titre: string;
    detail?: string | null;
    produit?: string | null;
    lot_produit?: string | null;
    dose?: string | null;
    voie?: string | null;
    prescripteur?: string | null;
    dar_jusquau?: string | null;
    valeur?: string | null;
    unite?: string | null;
    user_nom: string;
    created_at: string;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950';
const today = new Date().toISOString().slice(0, 10);
const date = (value?: string | null) =>
    value
        ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR')
        : '—';

export default function AnimalShow({
    animal,
    evenements,
    types,
    age,
    dar,
}: {
    animal: Animal;
    evenements: Event[];
    types: Record<string, string>;
    age: number | null;
    dar?: Event | null;
}) {
    const [dialog, setDialog] = useState<
        'weigh' | 'treat' | 'observe' | 'exit' | null
    >(null);
    const [moreOpen, setMoreOpen] = useState(false);
    const weigh = useForm({ poids: animal.poids ?? '', date: today });
    const treat = useForm({
        type: 'traitement',
        produit: '',
        lot_produit: '',
        dose: '',
        voie: '',
        duree_jours: '1',
        dar_jours: '',
        prescripteur: '',
        date: today,
        detail: '',
    });
    const observe = useForm({ texte: '' });
    const exit = useForm({ motif: '', valeur: '', note: '' });
    const close = () => setDialog(null);

    return (
        <>
            <Head title={`View ${animal.code}`} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/animaux"
                            className="hover:text-emerald-600"
                        >
                            Animaux
                        </Link>
                        <span className="mx-2">›</span>
                        {animal.code}
                        <span className="mx-2">›</span>View
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">
                            View {animal.code}
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            <Action
                                onClick={() => setDialog('weigh')}
                                color="sky"
                            >
                                Peser
                            </Action>
                            <Action
                                onClick={() => setDialog('treat')}
                                color="amber"
                            >
                                Traiter / Vacciner
                            </Action>
                            <Action onClick={() => setDialog('observe')}>
                                Observer
                            </Action>
                            <div className="relative">
                                <Action onClick={() => setMoreOpen((v) => !v)}>
                                    Autres actions <ChevronDown size={15} />
                                </Action>
                                {moreOpen && (
                                    <div className="absolute right-0 z-20 mt-2 grid min-w-52 rounded-lg border bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                        <button
                                            onClick={() => setDialog('exit')}
                                            className="rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-slate-100"
                                        >
                                            Sortie / Mortalité
                                        </button>
                                        <Link
                                            href={`/animaux/${animal.id}/edit`}
                                            className="rounded-md px-3 py-2 text-sm hover:bg-slate-100"
                                        >
                                            Modifier la fiche
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                    {dar && (
                        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
                            <h2 className="font-bold">
                                Délai d’attente en cours
                            </h2>
                            <p className="mt-2 text-sm">
                                {dar.produit} administré le {date(dar.date)} :
                                aucune vente ni abattage avant le{' '}
                                {date(dar.dar_jusquau)}.
                            </p>
                        </section>
                    )}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card
                            title={animal.code}
                            description={animal.categorie}
                        >
                            <Details
                                rows={[
                                    [
                                        'Naissance',
                                        `${date(animal.naissance)}${age !== null ? ` (${age} j)` : ''}`,
                                    ],
                                    [
                                        'Ligne / cohorte',
                                        `${animal.ligne ?? '—'} · ${animal.cohorte ?? '—'}`,
                                    ],
                                    [
                                        'Mère / père',
                                        `${animal.mere?.code ?? '—'} / ${animal.pere ?? '—'}`,
                                    ],
                                    [
                                        'Loge',
                                        `${animal.atelier ?? ''} · ${animal.loge?.numero ?? 'sans loge'}`.replace(
                                            /^ · /,
                                            '',
                                        ),
                                    ],
                                    [
                                        'Dernier poids',
                                        animal.poids
                                            ? `${animal.poids} kg (${date(animal.poids_le).slice(0, 5)})`
                                            : '—',
                                    ],
                                ]}
                            />
                            {animal.verrat_interdit && (
                                <div className="mt-3 flex justify-between text-sm">
                                    <span className="text-slate-500">
                                        Verrat interdit
                                    </span>
                                    <Badge red>{animal.verrat_interdit}</Badge>
                                </div>
                            )}
                            <div className="mt-3 flex justify-between text-sm">
                                <span className="text-slate-500">Statut</span>
                                <Badge>
                                    {animal.statut.charAt(0).toUpperCase() +
                                        animal.statut.slice(1)}
                                    {animal.sortie_motif
                                        ? ` — ${animal.sortie_motif}`
                                        : ''}
                                </Badge>
                            </div>
                            {animal.stade_alimentaire && (
                                <div className="mt-5 border-t pt-4 text-xs text-slate-500">
                                    <strong>{animal.stade_alimentaire}</strong>{' '}
                                    — POL-BTA-001
                                </div>
                            )}
                        </Card>
                        <Card
                            title="Soins dus"
                            description="Protocoles POL-BTA-002"
                        >
                            <p className="text-sm text-slate-500">
                                À jour — aucun protocole dû.
                            </p>
                        </Card>
                        <Card title="Bilan de reproduction">
                            <p className="text-sm text-slate-500">
                                Sans objet pour cette fiche.
                            </p>
                        </Card>
                    </div>
                    <Card
                        title="Chronologie"
                        description="De la naissance à la sortie — registre en ajout seul"
                    >
                        <ol className="space-y-4">
                            {evenements.map((event) => (
                                <li
                                    key={event.id}
                                    className="flex flex-wrap gap-3 border-b border-slate-100 pb-4 text-sm last:border-0 dark:border-slate-800"
                                >
                                    <span className="w-24 shrink-0 text-xs text-slate-500">
                                        {date(event.date)}
                                    </span>
                                    <Badge
                                        red={['mort', 'reforme'].includes(
                                            event.type,
                                        )}
                                        amber={[
                                            'traitement',
                                            'vaccination',
                                            'vermifugation',
                                            'supplementation',
                                        ].includes(event.type)}
                                    >
                                        {types[event.type] ?? event.type}
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold">
                                            {event.titre}
                                        </div>
                                        {event.produit && (
                                            <div className="mt-1 text-xs text-slate-600">
                                                Lot {event.lot_produit} ·{' '}
                                                {event.dose} · {event.voie}
                                                {event.prescripteur
                                                    ? ` · prescrit par ${event.prescripteur}`
                                                    : ''}
                                                {event.dar_jusquau ? (
                                                    <span className="font-semibold text-red-600">
                                                        {' '}
                                                        · DAR jusqu’au{' '}
                                                        {date(
                                                            event.dar_jusquau,
                                                        )}
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                        {event.detail && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                {event.detail}
                                            </div>
                                        )}
                                        <div className="mt-1 text-xs text-slate-400">
                                            {event.user_nom} · saisi le{' '}
                                            {new Date(
                                                event.created_at,
                                            ).toLocaleString('fr-FR')}
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {evenements.length === 0 && (
                                <li className="text-sm text-slate-500">
                                    Aucun événement.
                                </li>
                            )}
                        </ol>
                    </Card>
                </div>
            </main>
            {dialog === 'weigh' && (
                <Modal title="Peser" close={close}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            weigh.post(`/animaux/${animal.id}/peser`, {
                                onSuccess: close,
                            });
                        }}
                        className="grid gap-4"
                    >
                        <Field label="Poids (kg)">
                            <input
                                type="number"
                                step="0.001"
                                required
                                value={weigh.data.poids}
                                onChange={(e) =>
                                    weigh.setData('poids', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Date">
                            <input
                                type="date"
                                required
                                value={weigh.data.date}
                                onChange={(e) =>
                                    weigh.setData('date', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Submit />
                    </form>
                </Modal>
            )}
            {dialog === 'observe' && (
                <Modal title="Observer" close={close}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            observe.post(`/animaux/${animal.id}/observer`, {
                                onSuccess: close,
                            });
                        }}
                        className="grid gap-4"
                    >
                        <Field label="Observation">
                            <textarea
                                required
                                rows={4}
                                value={observe.data.texte}
                                onChange={(e) =>
                                    observe.setData('texte', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Submit />
                    </form>
                </Modal>
            )}
            {dialog === 'treat' && (
                <Modal title="Traiter / Vacciner" close={close}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            treat.post(`/animaux/${animal.id}/traiter`, {
                                onSuccess: close,
                            });
                        }}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <Field label="Nature">
                            <select
                                required
                                value={treat.data.type}
                                onChange={(e) =>
                                    treat.setData('type', e.target.value)
                                }
                                className={input}
                            >
                                <option value="traitement">Traitement</option>
                                <option value="vaccination">Vaccination</option>
                                <option value="vermifugation">
                                    Vermifugation
                                </option>
                                <option value="supplementation">
                                    Supplémentation
                                </option>
                            </select>
                        </Field>
                        <Field label="Produit">
                            <input
                                required
                                value={treat.data.produit}
                                onChange={(e) =>
                                    treat.setData('produit', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="N° de lot — OBLIGATOIRE"
                            help="Sans lot, un rappel de produit est intraçable (POL-BTA-002 §4.1)."
                        >
                            <input
                                required
                                value={treat.data.lot_produit}
                                onChange={(e) =>
                                    treat.setData('lot_produit', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Dose">
                            <input
                                required
                                value={treat.data.dose}
                                onChange={(e) =>
                                    treat.setData('dose', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Voie">
                            <select
                                required
                                value={treat.data.voie}
                                onChange={(e) =>
                                    treat.setData('voie', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {['IM', 'SC', 'IV', 'Oral', 'Topique'].map(
                                    (v) => (
                                        <option key={v}>{v}</option>
                                    ),
                                )}
                            </select>
                        </Field>
                        <Field label="Durée (jours)">
                            <input
                                type="number"
                                min="1"
                                value={treat.data.duree_jours}
                                onChange={(e) =>
                                    treat.setData('duree_jours', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Délai d'attente (jours)"
                            help="Bloque vente et abattage jusqu'à échéance."
                        >
                            <input
                                type="number"
                                min="0"
                                value={treat.data.dar_jours}
                                onChange={(e) =>
                                    treat.setData('dar_jours', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Prescripteur — vétérinaire ou Superviseur BTA">
                            <input
                                value={treat.data.prescripteur}
                                onChange={(e) =>
                                    treat.setData(
                                        'prescripteur',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Date">
                            <input
                                type="date"
                                required
                                value={treat.data.date}
                                onChange={(e) =>
                                    treat.setData('date', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Observation">
                            <textarea
                                rows={2}
                                value={treat.data.detail}
                                onChange={(e) =>
                                    treat.setData('detail', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <div className="sm:col-span-2">
                            <Submit />
                        </div>
                    </form>
                </Modal>
            )}
            {dialog === 'exit' && (
                <Modal title="Sortie / Mortalité" close={close}>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            exit.post(`/animaux/${animal.id}/sortir`, {
                                onSuccess: close,
                            });
                        }}
                        className="grid gap-4"
                    >
                        <Field label="Motif">
                            <select
                                required
                                value={exit.data.motif}
                                onChange={(e) =>
                                    exit.setData('motif', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {[
                                    'VENTE',
                                    'ABATTAGE',
                                    'RÉFORME',
                                    'TRANSFERT',
                                    'MORTALITÉ',
                                ].map((v) => (
                                    <option key={v}>{v}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Valeur (USD)">
                            <input
                                type="number"
                                min="0"
                                value={exit.data.valeur}
                                onChange={(e) =>
                                    exit.setData('valeur', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Note — cause si mortalité">
                            <textarea
                                rows={3}
                                value={exit.data.note}
                                onChange={(e) =>
                                    exit.setData('note', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Submit />
                    </form>
                </Modal>
            )}
        </>
    );
}

function Action({
    children,
    onClick,
    color,
}: {
    children: React.ReactNode;
    onClick: () => void;
    color?: 'sky' | 'amber';
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${color === 'sky' ? 'bg-sky-600 text-white' : color === 'amber' ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
        >
            {children}
        </button>
    );
}
function Card({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold">{title}</h2>
            {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
            <div className="mt-5">{children}</div>
        </section>
    );
}
function Details({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="space-y-3 text-sm">
            {rows.map(([key, val]) => (
                <div key={key} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{key}</dt>
                    <dd className="text-right font-medium">{val}</dd>
                </div>
            ))}
        </dl>
    );
}
function Badge({
    children,
    red,
    amber,
}: {
    children: React.ReactNode;
    red?: boolean;
    amber?: boolean;
}) {
    return (
        <span
            className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium ${red ? 'bg-red-100 text-red-700' : amber ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
        >
            {children}
        </span>
    );
}
function Modal({
    title,
    close,
    children,
}: {
    title: string;
    close: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button type="button" aria-label="Close" onClick={close}>
                        <X />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
function Field({
    label,
    help,
    children,
}: {
    label: string;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="text-sm font-medium">
            {label}
            {children}
            {help && (
                <span className="mt-1.5 block text-xs font-normal text-slate-500">
                    {help}
                </span>
            )}
        </label>
    );
}
function Submit() {
    return (
        <div className="flex justify-end gap-3 border-t pt-4">
            <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
                Submit
            </button>
        </div>
    );
}
