import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Props = {
    plantation: any;
    today: string;
    initialAction: string;
    options: {
        matieres: Array<{
            id: number;
            label: string;
            dar_jours?: number | null;
        }>;
        articles: Array<{ id: number; code: string; libelle: string }>;
        canaux: string[];
    };
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 dark:border-slate-600 dark:bg-slate-900';
export default function PlantationShow({
    plantation: p,
    today,
    initialAction,
    options,
}: Props) {
    const [action, setAction] = useState(initialAction);
    const treat = useForm({
        date: today,
        matiere_active_id: '',
        produit: '',
        lot_produit: '',
        dose_valeur: '',
        dose_unite: 'g/planche',
        planches_traitees: '',
        cible: '',
        dar_jours: '',
        article_id: '',
        quantite_sortie: '',
        epi_porte: false,
        photo: null as File | null,
    });
    const harvest = useForm({
        date: today,
        quantite: '',
        unite: p.culture?.unite_recolte ?? 'kg',
        qualite: '',
        canal_commercial: '',
        pertes: '',
        valeur: '',
    });
    const finish = useForm({ motif: '' });
    const chooseMatter = (id: string) =>
        treat.setData((d) => ({
            ...d,
            matiere_active_id: id,
            dar_jours: String(
                options.matieres.find((m) => String(m.id) === id)?.dar_jours ??
                    '',
            ),
        }));
    const submitTreat = (e: FormEvent) => {
        e.preventDefault();
        treat.post(`/plantations/${p.id}/traiter`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setAction(''),
        });
    };
    const submitHarvest = (e: FormEvent) => {
        e.preventDefault();
        harvest.post(`/plantations/${p.id}/recolter`, {
            preserveScroll: true,
            onSuccess: () => setAction(''),
        });
    };
    const submitFinish = (e: FormEvent) => {
        e.preventDefault();
        finish.post(`/plantations/${p.id}/terminer`, {
            preserveScroll: true,
            onSuccess: () => setAction(''),
        });
    };
    const jplus = Math.max(
        0,
        Math.floor(
            (new Date(`${today}T00:00:00`).getTime() -
                new Date(`${p.j0.slice(0, 10)}T00:00:00`).getTime()) /
                86_400_000,
        ),
    );
    const total = p.recoltes.reduce(
        (n: number, r: any) => n + Number(r.quantite),
        0,
    );

    return (
        <>
            <Head title={p.reference} />
            <main className="min-h-screen w-full bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
                <div className="w-full space-y-6">
                    <div className="text-sm text-slate-500">
                        <Link
                            href="/plantations"
                            className="hover:text-emerald-600"
                        >
                            Plantations
                        </Link>
                        <span className="mx-2">›</span>
                        {p.reference}
                    </div>
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-slate-500">
                                {p.reference}
                            </p>
                            <h1 className="mt-1 text-3xl font-bold">
                                {p.culture?.nom} — {p.lieu}
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {p.statut === 'active' && (
                                <button
                                    onClick={() => setAction('treat')}
                                    className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Traiter
                                </button>
                            )}
                            {['active', 'recoltee'].includes(p.statut) && (
                                <button
                                    onClick={() => setAction('harvest')}
                                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Récolter
                                </button>
                            )}
                            <button
                                onClick={() => setAction('generate')}
                                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                            >
                                Générer les tâches du plan
                            </button>
                            {p.statut !== 'terminee' && (
                                <button
                                    onClick={() => setAction('finish')}
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                                >
                                    Terminer
                                </button>
                            )}
                        </div>
                    </header>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <dl className="grid grid-cols-2 gap-5 text-sm">
                                <Info
                                    label="J0"
                                    value={`${fmt(p.j0)} (J+${jplus})`}
                                />
                                <Info
                                    label="Quantité"
                                    value={
                                        p.quantite
                                            ? `${Number(p.quantite).toLocaleString('fr-FR')} ${p.unite}`
                                            : '—'
                                    }
                                />
                                <Info
                                    label="Parcelle"
                                    value={
                                        p.parcelle
                                            ? `${p.parcelle.code} — ${p.parcelle.nom}`
                                            : '—'
                                    }
                                />
                                <Info
                                    label="Surface"
                                    value={
                                        p.surface_m2
                                            ? `${Number(p.surface_m2).toLocaleString('fr-FR')} m²`
                                            : '—'
                                    }
                                />
                                <Info
                                    label="Statut"
                                    value={
                                        p.statut.charAt(0).toUpperCase() +
                                        p.statut.slice(1)
                                    }
                                />
                                <Info
                                    label="Récolte totale"
                                    value={`${total.toLocaleString('fr-FR')} ${p.culture?.unite_recolte ?? ''}`}
                                />
                            </dl>
                            {p.note && (
                                <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                    {p.note}
                                </p>
                            )}
                            <h2 className="mt-7 text-sm font-bold text-slate-500 uppercase">
                                Récoltes
                            </h2>
                            <Table
                                headers={[
                                    'Date',
                                    'Quantité',
                                    'Canal',
                                    'Valeur',
                                ]}
                                empty="Aucune récolte."
                            >
                                {p.recoltes.map((r: any) => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-slate-100 dark:border-slate-800"
                                    >
                                        <td className="py-2">{fmt(r.date)}</td>
                                        <td>
                                            {Number(r.quantite).toLocaleString(
                                                'fr-FR',
                                            )}{' '}
                                            {r.unite}
                                        </td>
                                        <td>{r.canal_commercial}</td>
                                        <td>
                                            {r.valeur
                                                ? `${Number(r.valeur).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $`
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {p.recoltes.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-3 text-slate-500"
                                        >
                                            Aucune récolte.
                                        </td>
                                    </tr>
                                )}
                            </Table>
                            <h2 className="mt-7 text-sm font-bold text-slate-500 uppercase">
                                Traitements
                            </h2>
                            <Table
                                headers={[
                                    'Date',
                                    'Produit',
                                    'Dose',
                                    'Récolte autorisée',
                                ]}
                                empty="Aucun traitement."
                            >
                                {p.traitements.map((t: any) => (
                                    <tr
                                        key={t.id}
                                        className="border-t border-slate-100 dark:border-slate-800"
                                    >
                                        <td className="py-2">{fmt(t.date)}</td>
                                        <td>
                                            {t.produit}
                                            <div className="text-xs text-slate-500">
                                                {t.matiere_active?.nom}
                                            </div>
                                        </td>
                                        <td>
                                            {t.dose_valeur} {t.dose_unite}
                                        </td>
                                        <td>{fmt(t.recolte_autorisee_le)}</td>
                                    </tr>
                                ))}
                                {p.traitements.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-3 text-slate-500"
                                        >
                                            Aucun traitement.
                                        </td>
                                    </tr>
                                )}
                            </Table>
                        </section>
                        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h2 className="text-sm font-bold text-slate-500 uppercase">
                                Tâches de la plantation
                            </h2>
                            <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                {p.taches.map((t: any) => (
                                    <li
                                        key={t.id}
                                        className="flex items-center justify-between gap-4 py-3"
                                    >
                                        <Link
                                            href={`/registre-ferme/${t.id}`}
                                            className="hover:text-emerald-600"
                                        >
                                            {fmt(t.date_due)} · {t.titre}
                                        </Link>
                                        <span className="text-xs">
                                            {String(t.statut).replaceAll(
                                                '_',
                                                ' ',
                                            )}
                                        </span>
                                    </li>
                                ))}
                                {p.taches.length === 0 && (
                                    <li className="py-3 text-slate-500">
                                        Aucune tâche générée — utilisez «
                                        Générer les tâches du plan ».
                                    </li>
                                )}
                            </ul>
                        </section>
                    </div>
                </div>
            </main>
            <Dialog
                open={action === 'treat'}
                onOpenChange={(o) => !o && setAction('')}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Traiter</DialogTitle>
                        <DialogDescription>
                            Consigner l’application et calculer le délai avant
                            récolte.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={submitTreat}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <Field
                            label="Date d'application"
                            required
                            error={treat.errors.date}
                        >
                            <input
                                type="date"
                                max={today}
                                value={treat.data.date}
                                onChange={(e) =>
                                    treat.setData('date', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Matière active"
                            help="Le groupe de résistance est rappelé : alternez les modes d'action."
                        >
                            <select
                                value={treat.data.matiere_active_id}
                                onChange={(e) => chooseMatter(e.target.value)}
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.matieres.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label="Nom commercial du produit"
                            required
                            error={treat.errors.produit}
                        >
                            <input
                                value={treat.data.produit}
                                onChange={(e) =>
                                    treat.setData('produit', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="N° de lot">
                            <input
                                value={treat.data.lot_produit}
                                onChange={(e) =>
                                    treat.setData('lot_produit', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Dose" required>
                            <input
                                type="number"
                                step="0.001"
                                value={treat.data.dose_valeur}
                                onChange={(e) =>
                                    treat.setData('dose_valeur', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Unité de dose"
                            required
                            help="Jamais de kg/ha : la dose est déjà ramenée à la planche."
                        >
                            <select
                                value={treat.data.dose_unite}
                                onChange={(e) =>
                                    treat.setData('dose_unite', e.target.value)
                                }
                                className={input}
                            >
                                {[
                                    ['g/planche', 'g par planche (10 m²)'],
                                    ['ml/planche', 'ml par planche (10 m²)'],
                                    ['g/pied', 'g par pied'],
                                    ['ml/pied', 'ml par pied'],
                                ].map((x) => (
                                    <option key={x[0]} value={x[0]}>
                                        {x[1]}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Planches / pieds traités">
                            <input
                                type="number"
                                value={treat.data.planches_traitees}
                                onChange={(e) =>
                                    treat.setData(
                                        'planches_traitees',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Ravageur ou maladie visé">
                            <input
                                value={treat.data.cible}
                                onChange={(e) =>
                                    treat.setData('cible', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Délai avant récolte (jours) — étiquette produit"
                            required
                        >
                            <input
                                type="number"
                                value={treat.data.dar_jours}
                                onChange={(e) =>
                                    treat.setData('dar_jours', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Article sorti du magasin (facultatif)">
                            <select
                                value={treat.data.article_id}
                                onChange={(e) =>
                                    treat.setData('article_id', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.articles.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.code} — {a.libelle}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Quantité sortie">
                            <input
                                type="number"
                                step="0.001"
                                value={treat.data.quantite_sortie}
                                onChange={(e) =>
                                    treat.setData(
                                        'quantite_sortie',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Photo">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    treat.setData(
                                        'photo',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className={input}
                            />
                        </Field>
                        <label className="sm:col-span-2">
                            <span className="flex items-center gap-3 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    checked={treat.data.epi_porte}
                                    onChange={(e) =>
                                        treat.setData(
                                            'epi_porte',
                                            e.target.checked,
                                        )
                                    }
                                    className="h-5 w-5"
                                />
                                EPI portés par l'opérateur
                            </span>
                            <span className="ml-8 text-xs text-slate-500">
                                Sans cette confirmation, la saisie est refusée.
                            </span>
                        </label>
                        <Actions
                            processing={treat.processing}
                            close={() => setAction('')}
                        />
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={action === 'generate'}
                onOpenChange={(open) => !open && setAction('')}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Générer les tâches du plan ?</DialogTitle>
                        <DialogDescription>
                            Les lignes J+ du plan en vigueur seront créées. Les
                            tâches existantes ne seront pas dupliquées.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => setAction('')}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    `/plantations/${p.id}/generer-taches`,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setAction(''),
                                    },
                                )
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Confirm
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={action === 'harvest'}
                onOpenChange={(o) => !o && setAction('')}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Récolter</DialogTitle>
                        <DialogDescription>
                            Enregistrer la quantité et sa destination
                            commerciale.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitHarvest} className="space-y-4">
                        <Field
                            label="Date"
                            required
                            error={harvest.errors.date}
                        >
                            <input
                                type="date"
                                value={harvest.data.date}
                                onChange={(e) =>
                                    harvest.setData('date', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Quantité" required>
                            <input
                                type="number"
                                step="0.01"
                                value={harvest.data.quantite}
                                onChange={(e) =>
                                    harvest.setData('quantite', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Unité" required>
                            <input
                                value={harvest.data.unite}
                                onChange={(e) =>
                                    harvest.setData('unite', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Qualité">
                            <select
                                value={harvest.data.qualite}
                                onChange={(e) =>
                                    harvest.setData('qualite', e.target.value)
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {['A', 'B', 'C'].map((q) => (
                                    <option key={q}>{q}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Canal commercial — OBLIGATOIRE" required>
                            <select
                                value={harvest.data.canal_commercial}
                                onChange={(e) =>
                                    harvest.setData(
                                        'canal_commercial',
                                        e.target.value,
                                    )
                                }
                                className={input}
                            >
                                <option value="">Select an option</option>
                                {options.canaux.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Pertes">
                            <input
                                type="number"
                                value={harvest.data.pertes}
                                onChange={(e) =>
                                    harvest.setData('pertes', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Valeur (USD)">
                            <input
                                type="number"
                                value={harvest.data.valeur}
                                onChange={(e) =>
                                    harvest.setData('valeur', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Actions
                            processing={harvest.processing}
                            close={() => setAction('')}
                        />
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={action === 'finish'}
                onOpenChange={(o) => !o && setAction('')}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminer</DialogTitle>
                        <DialogDescription>
                            Clôturer définitivement cette plantation.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitFinish}>
                        <Field
                            label="Motif"
                            required
                            error={finish.errors.motif}
                        >
                            <input
                                value={finish.data.motif}
                                onChange={(e) =>
                                    finish.setData('motif', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Actions
                            processing={finish.processing}
                            close={() => setAction('')}
                        />
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
function fmt(v?: string | null) {
    return v
        ? new Intl.DateTimeFormat('fr-FR').format(
              new Date(`${v.slice(0, 10)}T00:00:00`),
          )
        : '—';
}
function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
        </div>
    );
}
function Table({
    headers,
    empty,
    children,
}: {
    headers: string[];
    empty: string;
    children: ReactNode;
}) {
    return (
        <table className="mt-2 w-full text-xs">
            <thead>
                <tr className="text-left text-slate-500">
                    {headers.map((h) => (
                        <th key={h} className="py-2">
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {children || (
                    <tr>
                        <td
                            colSpan={headers.length}
                            className="py-3 text-slate-500"
                        >
                            {empty}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}
function Field({
    label,
    required,
    help,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-medium">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1 block text-xs text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            )}
        </label>
    );
}
function Actions({
    processing,
    close,
}: {
    processing: boolean;
    close: () => void;
}) {
    return (
        <DialogFooter className="mt-5 sm:col-span-2">
            <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
            >
                Cancel
            </button>
            <button
                disabled={processing}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
                Submit
            </button>
        </DialogFooter>
    );
}
