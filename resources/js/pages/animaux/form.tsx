import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';

type Option = {
    id: number;
    code?: string;
    nom?: string;
    atelier?: string;
    numero?: string;
};
type Animal = Record<string, string | number | boolean | null> & { id: number };
type Props = {
    mode: 'create' | 'edit';
    animal: Animal | null;
    especes: Record<string, string>;
    cohortes: Record<string, string>;
    meres: Option[];
    loges: Option[];
    sites: Option[];
    stades: string[];
};
type Data = {
    code: string;
    espece: string;
    categorie: string;
    sexe: string;
    effectif: string;
    ligne: string;
    cohorte: string;
    encoche: string;
    naissance: string;
    origine: string;
    mere_id: string;
    pere: string;
    atelier: string;
    loge_id: string;
    site_id: string;
    stade_alimentaire: string;
    _create_another: boolean;
};
const input =
    'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-slate-600 dark:bg-slate-900';
const value = (animal: Animal | null, key: string, fallback = '') =>
    animal?.[key] != null ? String(animal[key]) : fallback;

export default function AnimalForm({
    mode,
    animal,
    especes,
    cohortes,
    meres,
    loges,
    sites,
    stades,
}: Props) {
    const form = useForm<Data>({
        code: value(animal, 'code'),
        espece: value(animal, 'espece'),
        categorie: value(animal, 'categorie'),
        sexe: value(animal, 'sexe'),
        effectif: value(animal, 'effectif', '1'),
        ligne: value(animal, 'ligne'),
        cohorte: value(animal, 'cohorte'),
        encoche: value(animal, 'encoche'),
        naissance: value(animal, 'naissance').slice(0, 10),
        origine: value(animal, 'origine'),
        mere_id: value(animal, 'mere_id'),
        pere: value(animal, 'pere'),
        atelier: value(animal, 'atelier'),
        loge_id: value(animal, 'loge_id'),
        site_id: value(animal, 'site_id'),
        stade_alimentaire: value(animal, 'stade_alimentaire'),
        _create_another: false,
    });
    const title =
        mode === 'create'
            ? 'Create Animal'
            : `Edit ${value(animal, 'code', 'Animal')}`;
    const submit = (again: boolean) => {
        form.transform((data) => ({ ...data, _create_another: again }));

        if (mode === 'create') {
form.post('/animaux');
} else if (animal) {
form.put(`/animaux/${animal.id}`);
}
    };

    return (
        <>
            <Head title={title} />
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
                        {mode === 'create' ? 'Create' : 'Edit'}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    <form
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            submit(false);
                        }}
                        className="grid gap-x-6 gap-y-5 lg:grid-cols-2"
                    >
                        <Field
                            label="Code — boucle gauche, jamais réattribué"
                            required
                            error={form.errors.code}
                        >
                            <input
                                autoFocus
                                required
                                value={form.data.code}
                                onChange={(e) =>
                                    form.setData('code', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Espèce"
                            required
                            error={form.errors.espece}
                        >
                            <Select
                                value={form.data.espece}
                                set={(v) => form.setData('espece', v)}
                                options={especes}
                                required
                            />
                        </Field>
                        <Field
                            label="Catégorie"
                            required
                            help="Truie reproductrice, Verrat, Engraissement, Cochette, Vache, Lot SASSO…"
                            error={form.errors.categorie}
                        >
                            <input
                                required
                                value={form.data.categorie}
                                onChange={(e) =>
                                    form.setData('categorie', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Sexe" error={form.errors.sexe}>
                            <Select
                                value={form.data.sexe}
                                set={(v) => form.setData('sexe', v)}
                                options={{
                                    femelle: 'Femelle',
                                    male: 'Mâle',
                                    mixte: 'Mixte',
                                }}
                            />
                        </Field>
                        <Field
                            label="Effectif — 1 pour un individu, n pour un lot"
                            required
                            error={form.errors.effectif}
                        >
                            <input
                                type="number"
                                min="1"
                                required
                                value={form.data.effectif}
                                onChange={(e) =>
                                    form.setData('effectif', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        {form.data.espece === 'porc' && (
                            <>
                                <Field
                                    label="Ligne génétique"
                                    error={form.errors.ligne}
                                >
                                    <Select
                                        value={form.data.ligne}
                                        set={(v) => form.setData('ligne', v)}
                                        options={{
                                            Pure: 'Pure (verte) — reproduction',
                                            Terminale:
                                                'Terminale (jaune) — chair',
                                        }}
                                    />
                                </Field>
                                <Field
                                    label="Cohorte — couleur du père"
                                    error={form.errors.cohorte}
                                >
                                    <Select
                                        value={form.data.cohorte}
                                        set={(v) => form.setData('cohorte', v)}
                                        options={Object.fromEntries(
                                            Object.keys(cohortes).map((key) => [
                                                key,
                                                key,
                                            ]),
                                        )}
                                    />
                                </Field>
                            </>
                        )}
                        <Field label="Verrat interdit — consanguinité">
                            <input
                                readOnly
                                value={cohortes[form.data.cohorte] ?? ''}
                                className={`${input} bg-slate-100`}
                            />
                        </Field>
                        <Field
                            label="Encoche — numéro de portée (J1)"
                            error={form.errors.encoche}
                        >
                            <input
                                value={form.data.encoche}
                                onChange={(e) =>
                                    form.setData('encoche', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Naissance" error={form.errors.naissance}>
                            <input
                                type="date"
                                value={form.data.naissance}
                                onChange={(e) =>
                                    form.setData('naissance', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Origine" error={form.errors.origine}>
                            <Select
                                value={form.data.origine}
                                set={(v) => form.setData('origine', v)}
                                options={{
                                    'Né sur le site': 'Né sur le site',
                                    Acheté: 'Acheté',
                                    Transfert: 'Transfert',
                                    Don: 'Don',
                                }}
                            />
                        </Field>
                        <Field label="Mère" error={form.errors.mere_id}>
                            <Select
                                value={form.data.mere_id}
                                set={(v) => form.setData('mere_id', v)}
                                options={Object.fromEntries(
                                    meres.map((m) => [
                                        String(m.id),
                                        m.code ?? '',
                                    ]),
                                )}
                            />
                        </Field>
                        <Field
                            label="Père — code du verrat"
                            error={form.errors.pere}
                        >
                            <input
                                value={form.data.pere}
                                onChange={(e) =>
                                    form.setData('pere', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field
                            label="Atelier"
                            help="Porcherie A — K1, Étable K2…"
                            error={form.errors.atelier}
                        >
                            <input
                                value={form.data.atelier}
                                onChange={(e) =>
                                    form.setData('atelier', e.target.value)
                                }
                                className={input}
                            />
                        </Field>
                        <Field label="Loge" error={form.errors.loge_id}>
                            <Select
                                value={form.data.loge_id}
                                set={(v) => form.setData('loge_id', v)}
                                options={Object.fromEntries(
                                    loges.map((l) => [
                                        String(l.id),
                                        `${l.atelier} · ${l.numero}`,
                                    ]),
                                )}
                            />
                        </Field>
                        <Field label="Site" error={form.errors.site_id}>
                            <Select
                                value={form.data.site_id}
                                set={(v) => form.setData('site_id', v)}
                                options={Object.fromEntries(
                                    sites.map((s) => [
                                        String(s.id),
                                        s.nom ?? '',
                                    ]),
                                )}
                            />
                        </Field>
                        <Field
                            label="Stade alimentaire — POL-BTA-001"
                            error={form.errors.stade_alimentaire}
                        >
                            <Select
                                value={form.data.stade_alimentaire}
                                set={(v) =>
                                    form.setData('stade_alimentaire', v)
                                }
                                options={Object.fromEntries(
                                    stades.map((s) => [s, s]),
                                )}
                            />
                        </Field>
                        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 lg:col-span-2 dark:border-slate-800">
                            <button
                                disabled={form.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                {mode === 'create' ? 'Create' : 'Save changes'}
                            </button>
                            {mode === 'create' && (
                                <button
                                    type="button"
                                    onClick={() => submit(true)}
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-600"
                                >
                                    Create & create another
                                </button>
                            )}
                            <Link
                                href="/animaux"
                                className="px-4 py-2.5 text-sm font-semibold"
                            >
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}

function Select({
    value,
    set,
    options,
    required,
}: {
    value: string;
    set: (value: string) => void;
    options: Record<string, string>;
    required?: boolean;
}) {
    return (
        <select
            value={value}
            onChange={(e) => set(e.target.value)}
            required={required}
            className={input}
        >
            <option value="">Select an option</option>
            {Object.entries(options).map(([key, label]) => (
                <option key={key} value={key}>
                    {label}
                </option>
            ))}
        </select>
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
        <label>
            <span className="text-sm font-medium">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs text-slate-500">
                    {help}
                </span>
            )}
            {error && (
                <span className="mt-1.5 block text-xs text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
