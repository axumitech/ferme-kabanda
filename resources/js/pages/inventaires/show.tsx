import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Calculator, LockKeyhole, Scale, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Progress = {
    total: number;
    comptes: number;
    ecarts: number;
    pourcentage: number;
    exactitude: number | null;
};
type Inventory = {
    id: number;
    reference: string;
    libelle: string;
    type: string;
    date_comptage: string;
    statut: string;
    perimetre?: string | null;
    note?: string | null;
    ecart_valeur: string;
    avancement: Progress;
    site?: { nom: string } | null;
};
type Line = {
    id: number;
    article: { code: string; libelle: string };
    unite: string;
    emplacement?: string | null;
    theorique: number | null;
    compte: number | null;
    recompte: number | null;
    ecart: number | null;
    taux_ecart: number | null;
    ecart_valeur?: string | null;
    cause?: string | null;
    observation?: string | null;
    statut: string;
};
const lineLabels: Record<string, string> = {
    a_compter: 'À compter',
    compte: 'Compté',
    a_recompter: 'À RECOMPTER',
    valide: 'Arbitré',
};
const lineColors: Record<string, string> = {
    a_compter: 'bg-slate-100 text-slate-700',
    compte: 'bg-sky-100 text-sky-800',
    a_recompter: 'bg-red-100 text-red-700',
    valide: 'bg-emerald-100 text-emerald-800',
};

export default function InventoryShow({
    inventaire,
    lignes,
    causes,
    canClose,
}: {
    inventaire: Inventory;
    lignes: Line[];
    causes: Record<string, string>;
    canClose: boolean;
}) {
    const page = usePage<{ flash?: { success?: string } }>();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('');
    const [counting, setCounting] = useState<Line | null>(null);
    const [arbitrating, setArbitrating] = useState<Line | null>(null);
    const [closeOpen, setCloseOpen] = useState(false);
    const countForm = useForm({
        compte: '',
        observation: '',
        recomptage: false,
    });
    const arbitrateForm = useForm({ cause: '', observation: '' });
    const closeForm = useForm({});
    const countActionError = (countForm.errors as Record<string, string>)
        .action;
    const arbitrateActionError = (
        arbitrateForm.errors as Record<string, string>
    ).action;
    const closeActionError = (closeForm.errors as Record<string, string>)
        .action;
    const rows = useMemo(
        () =>
            lignes.filter(
                (line) =>
                    `${line.article.code} ${line.article.libelle}`
                        .toLocaleLowerCase('fr')
                        .includes(query.toLocaleLowerCase('fr')) &&
                    (!status || line.statut === status),
            ),
        [lignes, query, status],
    );
    const openCount = (line: Line) => {
        setCounting(line);
        setArbitrating(null);
        countForm.setData({
            compte: '',
            observation: line.observation ?? '',
            recomptage: line.statut === 'a_recompter',
        });
        countForm.clearErrors();
    };
    const openArbitrate = (line: Line) => {
        setArbitrating(line);
        setCounting(null);
        arbitrateForm.setData({
            cause: line.cause ?? '',
            observation: line.observation ?? '',
        });
        arbitrateForm.clearErrors();
    };

    return (
        <>
            <Head title={`${inventaire.reference} — Inventaire`} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/inventaires"
                            className="hover:text-emerald-600"
                        >
                            Inventaires
                        </Link>
                        <span className="mx-2">›</span>
                        {inventaire.reference}
                    </div>
                    <header className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold text-emerald-700">
                                {inventaire.reference}
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight">
                                {inventaire.libelle}
                            </h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Comptage du{' '}
                                {formatDate(inventaire.date_comptage)} ·{' '}
                                {inventaire.site?.nom ?? 'Tous les sites'}
                            </p>
                        </div>
                        {inventaire.statut !== 'cloturee' && canClose && (
                            <button
                                type="button"
                                onClick={() => setCloseOpen(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                <LockKeyhole size={17} />
                                Clôturer
                            </button>
                        )}
                    </header>
                    {page.props.flash?.success && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {page.props.flash.success}
                        </div>
                    )}
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <Stat
                            label="Statut"
                            value={inventoryStatus(inventaire.statut)}
                        />
                        <Stat
                            label="Avancement"
                            value={`${inventaire.avancement.comptes} / ${inventaire.avancement.total} (${inventaire.avancement.pourcentage} %)`}
                        />
                        <Stat
                            label="Écarts"
                            value={String(inventaire.avancement.ecarts)}
                            danger={inventaire.avancement.ecarts > 0}
                        />
                        <Stat
                            label="Exactitude"
                            value={
                                inventaire.avancement.exactitude === null
                                    ? '—'
                                    : `${inventaire.avancement.exactitude} %`
                            }
                        />
                        <Stat
                            label="Écart valorisé"
                            value={Number(
                                inventaire.ecart_valeur,
                            ).toLocaleString('fr-FR', {
                                style: 'currency',
                                currency: 'USD',
                            })}
                        />
                    </section>
                    {(inventaire.perimetre || inventaire.note) && (
                        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            {inventaire.perimetre && (
                                <p>
                                    <strong>Périmètre :</strong>{' '}
                                    {inventaire.perimetre}
                                </p>
                            )}
                            {inventaire.note && (
                                <p className="mt-2">
                                    <strong>Note :</strong> {inventaire.note}
                                </p>
                            )}
                        </section>
                    )}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
                            <div>
                                <h2 className="font-bold">Lignes à compter</h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Le théorique reste masqué jusqu'au premier
                                    comptage.
                                </p>
                            </div>
                            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:flex sm:w-auto">
                                <label className="relative block w-full min-w-0 sm:w-56">
                                    <Search
                                        size={16}
                                        className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        placeholder="Search"
                                        className="w-full min-w-0 rounded-lg border border-slate-300 py-2 pr-3 pl-9 dark:border-slate-700 dark:bg-slate-950"
                                    />
                                </label>
                                <select
                                    aria-label="Statut"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto dark:border-slate-700 dark:bg-slate-950"
                                >
                                    <option value="">Tous les statuts</option>
                                    {Object.entries(lineLabels).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1180px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                                    <tr>
                                        {[
                                            'Code',
                                            'Article',
                                            'Emplacement',
                                            'Théorique',
                                            'Compté',
                                            'Écart',
                                            'Valeur',
                                            'Cause',
                                            'Statut',
                                            'Actions',
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                className="px-5 py-4"
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {rows.map((line) => (
                                        <tr
                                            key={line.id}
                                            className="even:bg-slate-50/60 dark:even:bg-slate-950/30"
                                        >
                                            <Cell strong>
                                                {line.article.code}
                                            </Cell>
                                            <Cell>{line.article.libelle}</Cell>
                                            <Cell>
                                                {line.emplacement ?? '—'}
                                            </Cell>
                                            <Cell>
                                                {line.theorique === null ? (
                                                    <span className="text-slate-400">
                                                        — masqué —
                                                    </span>
                                                ) : (
                                                    `${formatNumber(line.theorique)} ${line.unite}`
                                                )}
                                            </Cell>
                                            <Cell>
                                                <span className="font-semibold">
                                                    {line.compte === null
                                                        ? '—'
                                                        : `${formatNumber(line.compte)} ${line.unite}`}
                                                </span>
                                                {line.recompte !== null && (
                                                    <small className="mt-1 block text-slate-500">
                                                        recompté :{' '}
                                                        {formatNumber(
                                                            line.recompte,
                                                        )}
                                                    </small>
                                                )}
                                            </Cell>
                                            <Cell>
                                                <span
                                                    className={
                                                        line.ecart === null
                                                            ? 'text-slate-400'
                                                            : line.ecart === 0
                                                              ? 'text-emerald-700'
                                                              : 'font-semibold text-red-600'
                                                    }
                                                >
                                                    {line.ecart === null
                                                        ? '—'
                                                        : `${line.ecart > 0 ? '+' : ''}${formatNumber(line.ecart)} (${line.taux_ecart ?? 0} %)`}
                                                </span>
                                            </Cell>
                                            <Cell>
                                                {line.ecart_valeur === null
                                                    ? '—'
                                                    : Number(
                                                          line.ecart_valeur,
                                                      ).toLocaleString(
                                                          'fr-FR',
                                                          {
                                                              style: 'currency',
                                                              currency: 'USD',
                                                          },
                                                      )}
                                            </Cell>
                                            <Cell>
                                                {line.cause
                                                    ? (causes[line.cause] ??
                                                      line.cause)
                                                    : '—'}
                                            </Cell>
                                            <Cell>
                                                <Badge
                                                    className={
                                                        lineColors[
                                                            line.statut
                                                        ] ??
                                                        lineColors.a_compter
                                                    }
                                                >
                                                    {lineLabels[line.statut] ??
                                                        line.statut}
                                                </Badge>
                                            </Cell>
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-max gap-2">
                                                    {line.statut !== 'valide' &&
                                                        inventaire.statut !==
                                                            'cloturee' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openCount(
                                                                        line,
                                                                    )
                                                                }
                                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white ${line.statut === 'a_recompter' ? 'bg-red-600' : 'bg-emerald-600'}`}
                                                            >
                                                                <Calculator
                                                                    size={14}
                                                                />
                                                                {line.statut ===
                                                                'a_recompter'
                                                                    ? 'Recompter'
                                                                    : 'Compter'}
                                                            </button>
                                                        )}
                                                    {line.compte !== null &&
                                                        line.ecart !== 0 &&
                                                        line.statut !==
                                                            'valide' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openArbitrate(
                                                                        line,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white"
                                                            >
                                                                <Scale
                                                                    size={14}
                                                                />
                                                                Arbitrer l'écart
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="px-5 py-12 text-center text-slate-500"
                                            >
                                                Aucune ligne.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
            {counting && (
                <Dialog
                    title={
                        counting.statut === 'a_recompter'
                            ? 'Recompter'
                            : 'Compter'
                    }
                    subtitle={`${counting.article.code} — ${counting.article.libelle}`}
                    close={() => setCounting(null)}
                    error={countActionError ?? countForm.errors.compte}
                    processing={countForm.processing}
                    submit={() =>
                        countForm.post(
                            `/inventaires/${inventaire.id}/lignes/${counting.id}/compter`,
                            {
                                preserveScroll: true,
                                onSuccess: () => setCounting(null),
                            },
                        )
                    }
                >
                    <label className="block text-sm font-medium">
                        Quantité comptée ({counting.unite})
                        <span className="text-red-600">*</span>
                        <input
                            autoFocus
                            type="number"
                            min="0"
                            step="0.0001"
                            value={countForm.data.compte}
                            onChange={(event) =>
                                countForm.setData('compte', event.target.value)
                            }
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
                        />
                        <small className="mt-1 block text-slate-500">
                            Comptez physiquement. Le théorique du système reste
                            masqué : c'est voulu.
                        </small>
                    </label>
                    <label className="mt-4 block text-sm font-medium">
                        Observation
                        <textarea
                            rows={2}
                            value={countForm.data.observation}
                            onChange={(event) =>
                                countForm.setData(
                                    'observation',
                                    event.target.value,
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950"
                        />
                    </label>
                </Dialog>
            )}
            {arbitrating && (
                <Dialog
                    title="Arbitrer l'écart"
                    subtitle={`${arbitrating.article.code} — ${arbitrating.article.libelle}`}
                    close={() => setArbitrating(null)}
                    error={arbitrateActionError ?? arbitrateForm.errors.cause}
                    processing={arbitrateForm.processing}
                    submit={() =>
                        arbitrateForm.post(
                            `/inventaires/${inventaire.id}/lignes/${arbitrating.id}/arbitrer`,
                            {
                                preserveScroll: true,
                                onSuccess: () => setArbitrating(null),
                            },
                        )
                    }
                >
                    <label className="block text-sm font-medium">
                        Cause de l'écart<span className="text-red-600">*</span>
                        <select
                            value={arbitrateForm.data.cause}
                            onChange={(event) =>
                                arbitrateForm.setData(
                                    'cause',
                                    event.target.value,
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
                        >
                            <option value="">Select an option</option>
                            {Object.entries(causes).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <small className="mt-1 block text-slate-500">
                            Un écart sans cause nommée n'apprend rien et se
                            reproduira.
                        </small>
                    </label>
                    <label className="mt-4 block text-sm font-medium">
                        Précision
                        <textarea
                            rows={2}
                            value={arbitrateForm.data.observation}
                            onChange={(event) =>
                                arbitrateForm.setData(
                                    'observation',
                                    event.target.value,
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-950"
                        />
                    </label>
                </Dialog>
            )}
            {closeOpen && (
                <Dialog
                    title="Clôturer l'inventaire"
                    close={() => setCloseOpen(false)}
                    error={closeActionError}
                    processing={closeForm.processing}
                    submit={() =>
                        closeForm.post(
                            `/inventaires/${inventaire.id}/cloturer`,
                            { onSuccess: () => setCloseOpen(false) },
                        )
                    }
                >
                    <p className="text-sm text-slate-600">
                        Les écarts arbitrés deviennent des mouvements datés dans
                        le registre. Rien n'est écrasé.
                    </p>
                </Dialog>
            )}
        </>
    );
}

function Dialog({
    title,
    subtitle,
    close,
    error,
    processing,
    submit,
    children,
}: {
    title: string;
    subtitle?: string;
    close: () => void;
    error?: string;
    processing: boolean;
    submit: () => void;
    children: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold">{title}</h2>
                        {subtitle && (
                            <p className="mt-1 text-sm text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Fermer"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <X size={19} />
                    </button>
                </div>
                <div className="mt-5">{children}</div>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={close}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={processing}
                        onClick={submit}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}
function Stat({
    label,
    value,
    danger,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {label}
            </p>
            <p
                className={`mt-2 text-xl font-bold ${danger ? 'text-red-600' : ''}`}
            >
                {value}
            </p>
        </div>
    );
}
function Cell({
    children,
    strong,
}: {
    children: React.ReactNode;
    strong?: boolean;
}) {
    return (
        <td className={`px-5 py-4 ${strong ? 'font-semibold' : ''}`}>
            {children}
        </td>
    );
}
function Badge({
    children,
    className,
}: {
    children: React.ReactNode;
    className: string;
}) {
    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}
        >
            {children}
        </span>
    );
}
function formatNumber(value: number) {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
}
function formatDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
        'fr-FR',
    );
}
function inventoryStatus(value: string) {
    return (
        (
            {
                ouverte: 'Ouverte — à compter',
                comptee: 'Comptée — à arbitrer',
                arbitree: 'Arbitrée — à clôturer',
                cloturee: 'Clôturée',
            } as Record<string, string>
        )[value] ?? value
    );
}
