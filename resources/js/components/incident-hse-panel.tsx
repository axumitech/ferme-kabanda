import { Link, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    ClipboardCheck,
    LockKeyhole,
    Plus,
    ShieldAlert,
    Tag,
    Wrench,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Category = {
    id: number;
    code: string;
    libelle: string;
    nature: string;
};
type Incident = {
    id: number;
    reference: string;
    nature: string;
    survenu_le: string;
    lieu?: string | null;
    description: string;
    actions_immediates?: string | null;
    temoins?: string | null;
    personnes_impliquees?: string | null;
    tiers_implique?: boolean;
    cout_estime?: string | null;
    statut: string;
    cinq_pourquoi?: string[] | null;
    cause_racine?: string | null;
    facteurs_contributifs?: string | null;
    categorie?: { code: string; libelle: string } | null;
    categorie_finale?: { code: string; libelle: string } | null;
    site?: { code: string; nom: string } | null;
    departement?: { code: string; nom: string } | null;
    actions: Array<{
        id: number;
        action: string;
        statut: string;
        responsable?: { id: number; name: string } | null;
        tache?: { reference: string; statut: string } | null;
    }>;
    ordres_travail: Array<{
        id: number;
        reference: string;
        statut: string;
    }>;
};
type Dialog =
    'create' | 'classify' | 'causes' | 'work-order' | 'capa' | 'close' | null;

const natureLabels: Record<string, string> = {
    securite: 'Sécurité (SST)',
    surete: 'Sûreté (malveillance)',
    environnement: 'Environnement',
};
const statusLabels: Record<string, string> = {
    signale: 'Signalé',
    classifie: 'Classifié',
    en_investigation: 'En investigation',
    cloture: 'Clôturé',
};
const statusTones: Record<string, string> = {
    signale: 'bg-red-50 text-red-700 ring-red-200',
    classifie: 'bg-amber-50 text-amber-700 ring-amber-200',
    en_investigation: 'bg-sky-50 text-sky-700 ring-sky-200',
    cloture: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

function localDateTime(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return date.toISOString().slice(0, 16);
}

function futureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
}

export default function IncidentHsePanel({
    incidents,
    sites,
    departments,
    users,
    categories,
    visibility,
}: {
    incidents: Incident[];
    sites: Array<{ id: number; code: string; nom: string }>;
    departments: Array<{ id: number; code: string; nom: string }>;
    users: Array<{ id: number; name: string }>;
    categories: Category[];
    visibility: {
        incidentCosts: boolean;
    };
}) {
    const [dialog, setDialog] = useState<Dialog>(null);
    const [selected, setSelected] = useState<Incident | null>(null);
    const openCount = useMemo(
        () => incidents.filter((item) => item.statut !== 'cloture').length,
        [incidents],
    );
    const declaration = useForm({
        nature: '',
        survenu_le: localDateTime(),
        site_id: '',
        lieu: '',
        departement_id: '',
        cout_estime: '',
        description: '',
        actions_immediates: '',
        temoins: '',
        personnes_impliquees: '',
        tiers_implique: false,
    });
    const classification = useForm<{ codes: string[]; finale: boolean }>({
        codes: [],
        finale: false,
    });
    const causes = useForm({
        p1: '',
        p2: '',
        p3: '',
        p4: '',
        p5: '',
        cause_racine: '',
        facteurs: '',
    });
    const workOrder = useForm({
        objet: '',
        description: '',
        priorite: '',
        echeance: futureDate(7),
    });
    const capa = useForm({
        action: '',
        responsable_id: '',
        echeance: futureDate(7),
        type: 'corrective',
    });
    const closure = useForm({});

    const openDialog = (
        next: Exclude<Dialog, 'create' | null>,
        item: Incident,
    ) => {
        setSelected(item);
        setDialog(next);

        if (next === 'classify') {
            classification.setData({ codes: [], finale: false });
        }

        if (next === 'causes') {
            const why = item.cinq_pourquoi ?? [];
            causes.setData({
                p1: why[0] ?? '',
                p2: why[1] ?? '',
                p3: why[2] ?? '',
                p4: why[3] ?? '',
                p5: why[4] ?? '',
                cause_racine: item.cause_racine ?? '',
                facteurs: item.facteurs_contributifs ?? '',
            });
        }
    };

    const closeDialog = () => {
        setDialog(null);
        setSelected(null);
    };

    const submitDeclaration = (createAnother = false) => {
        declaration.post('/admin/processes/incidents', {
            preserveScroll: true,
            onSuccess: () => {
                declaration.reset();
                declaration.setData('survenu_le', localDateTime());

                if (!createAnother) {
                    closeDialog();
                }
            },
        });
    };

    const submitSelected = () => {
        if (!selected || !dialog) {
            return;
        }

        const options = { preserveScroll: true, onSuccess: closeDialog };

        if (dialog === 'classify') {
            classification.post(
                `/admin/processes/incidents/${selected.id}/classify`,
                options,
            );
        } else if (dialog === 'causes') {
            causes.post(
                `/admin/processes/incidents/${selected.id}/root-causes`,
                options,
            );
        } else if (dialog === 'work-order') {
            workOrder.post(
                `/admin/processes/incidents/${selected.id}/work-orders`,
                options,
            );
        } else if (dialog === 'capa') {
            capa.post(
                `/admin/processes/incidents/${selected.id}/actions`,
                options,
            );
        } else if (dialog === 'close') {
            closure.post(
                `/admin/processes/incidents/${selected.id}/close`,
                options,
            );
        }
    };

    return (
        <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-red-600" size={22} />
                            <h2 className="text-xl font-bold text-slate-950">
                                Incidents HSE
                            </h2>
                            {openCount > 0 && (
                                <Badge tone="red">{openCount} ouvert(s)</Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Déclaration, investigation, actions CAPA et clôture.
                        </p>
                    </div>
                    <Link
                        href="/incidents/create"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                    >
                        <Plus size={17} /> Déclarer incident
                    </Link>
                </header>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                            <tr className="border-b border-slate-200">
                                <th className="px-4 py-3">Référence</th>
                                <th className="px-4 py-3">Nature</th>
                                <th className="px-4 py-3">Survenu</th>
                                <th className="px-4 py-3">Lieu</th>
                                <th className="px-4 py-3">Classe</th>
                                {visibility.incidentCosts && (
                                    <th className="px-4 py-3">Coût</th>
                                )}
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {incidents.map((item, index) => {
                                const closed = item.statut === 'cloture';
                                const category =
                                    item.categorie_finale ?? item.categorie;

                                return (
                                    <tr
                                        key={item.id}
                                        className={
                                            index % 2
                                                ? 'bg-slate-50/60'
                                                : 'bg-white'
                                        }
                                    >
                                        <td className="px-4 py-3 align-top">
                                            <span className="font-bold text-slate-900">
                                                {item.reference}
                                            </span>
                                            <span className="mt-1 block max-w-64 truncate text-xs text-slate-500">
                                                {item.description}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <Badge
                                                tone={
                                                    item.nature === 'securite'
                                                        ? 'red'
                                                        : 'amber'
                                                }
                                            >
                                                {natureLabels[item.nature] ??
                                                    item.nature}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-700">
                                            {formatDateTime(item.survenu_le)}
                                        </td>
                                        <td className="px-4 py-3 align-top text-slate-700">
                                            {item.lieu || '—'}
                                            {item.site && (
                                                <span className="mt-1 block text-xs text-slate-500">
                                                    {item.site.code} —{' '}
                                                    {item.site.nom}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            {category ? (
                                                <Badge tone="slate">
                                                    {category.code} —{' '}
                                                    {category.libelle}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        {visibility.incidentCosts && (
                                            <td className="px-4 py-3 align-top font-semibold text-slate-700">
                                                {item.cout_estime
                                                    ? `${Number(item.cout_estime).toLocaleString('fr-FR')} USD`
                                                    : '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 align-top">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusTones[item.statut] ?? 'bg-slate-100 text-slate-700 ring-slate-200'}`}
                                            >
                                                {statusLabels[item.statut] ??
                                                    item.statut}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                                {!closed && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openDialog(
                                                                    'classify',
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
                                                        >
                                                            <Tag size={14} />{' '}
                                                            Classifier
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openDialog(
                                                                    'causes',
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <CircleHelp
                                                                size={14}
                                                            />{' '}
                                                            5 Pourquoi
                                                        </button>
                                                    </>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <button
                                                            type="button"
                                                            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            More actions
                                                            <ChevronDown
                                                                size={14}
                                                            />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-64 rounded-xl p-1.5"
                                                    >
                                                        {!closed && (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        openDialog(
                                                                            'work-order',
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    <Wrench
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Ouvrir un
                                                                    ordre de
                                                                    travail
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        openDialog(
                                                                            'capa',
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    <ClipboardCheck
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Ajouter une
                                                                    action CAPA
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onSelect={() =>
                                                                        openDialog(
                                                                            'close',
                                                                            item,
                                                                        )
                                                                    }
                                                                >
                                                                    <LockKeyhole
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                    Clôturer
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {closed && (
                                                            <p className="px-3 py-2 text-xs text-slate-500">
                                                                Incident clôturé
                                                            </p>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {incidents.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={
                                            visibility.incidentCosts ? 8 : 7
                                        }
                                        className="px-5 py-16 text-center text-slate-500"
                                    >
                                        Aucun incident déclaré.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {dialog === 'create' && (
                <Modal
                    title="Create Incident"
                    subtitle="Déclarer les faits sans interprétation."
                    onClose={closeDialog}
                    wide
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitDeclaration();
                        }}
                        className="space-y-5"
                    >
                        <FormErrors errors={declaration.errors} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Nature" required>
                                <select
                                    className="control"
                                    required
                                    value={declaration.data.nature}
                                    onChange={(event) =>
                                        declaration.setData(
                                            'nature',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Select an option</option>
                                    <option value="securite">
                                        Sécurité (SST)
                                    </option>
                                    <option value="surete">
                                        Sûreté (malveillance)
                                    </option>
                                    <option value="environnement">
                                        Environnement
                                    </option>
                                </select>
                            </FormField>
                            <FormField label="Survenu le" required>
                                <input
                                    className="control"
                                    type="datetime-local"
                                    required
                                    max={localDateTime()}
                                    value={declaration.data.survenu_le}
                                    onChange={(event) =>
                                        declaration.setData(
                                            'survenu_le',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField label="Site">
                                <select
                                    className="control"
                                    value={declaration.data.site_id}
                                    onChange={(event) =>
                                        declaration.setData(
                                            'site_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Select an option</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.code} — {site.nom}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label="Lieu précis">
                                <input
                                    className="control"
                                    value={declaration.data.lieu}
                                    onChange={(event) =>
                                        declaration.setData(
                                            'lieu',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField label="Département">
                                <select
                                    className="control"
                                    value={declaration.data.departement_id}
                                    onChange={(event) =>
                                        declaration.setData(
                                            'departement_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Select an option</option>
                                    {departments.map((department) => (
                                        <option
                                            key={department.id}
                                            value={department.id}
                                        >
                                            {department.code} — {department.nom}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            {visibility.incidentCosts && (
                                <FormField
                                    label="Coût estimé (USD)"
                                    help="Au-delà de 5 000 USD : remontée Siège sous 72 h."
                                >
                                    <input
                                        className="control"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={declaration.data.cout_estime}
                                        onChange={(event) =>
                                            declaration.setData(
                                                'cout_estime',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            )}
                        </div>
                        <FormField
                            label="Description factuelle — qui, quoi, où, quand, comment"
                            required
                        >
                            <textarea
                                className="control"
                                rows={4}
                                required
                                value={declaration.data.description}
                                onChange={(event) =>
                                    declaration.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Actions immédiates prises">
                            <textarea
                                className="control"
                                rows={2}
                                value={declaration.data.actions_immediates}
                                onChange={(event) =>
                                    declaration.setData(
                                        'actions_immediates',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Témoins">
                            <textarea
                                className="control"
                                rows={2}
                                value={declaration.data.temoins}
                                onChange={(event) =>
                                    declaration.setData(
                                        'temoins',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Personnes impliquées">
                            <input
                                className="control"
                                value={declaration.data.personnes_impliquees}
                                onChange={(event) =>
                                    declaration.setData(
                                        'personnes_impliquees',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <CheckRow
                            checked={declaration.data.tiers_implique}
                            onChange={(checked) =>
                                declaration.setData('tiers_implique', checked)
                            }
                            label="Tiers impliqué"
                        />
                        <ModalActions
                            processing={declaration.processing}
                            onClose={closeDialog}
                            secondarySubmit={() => submitDeclaration(true)}
                            secondaryLabel="Create & create another"
                            primaryLabel="Create"
                        />
                    </form>
                </Modal>
            )}

            {dialog === 'classify' && selected && (
                <Modal
                    title="Classifier"
                    subtitle={`${selected.reference} — classification fondée sur l’issue réelle`}
                    onClose={closeDialog}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSelected();
                        }}
                        className="space-y-5"
                    >
                        <FormErrors errors={classification.errors} />
                        <FormField
                            label="Catégories constatées — l’issue réelle, jamais le potentiel"
                            required
                        >
                            <div className="mt-2 space-y-2 rounded-xl border border-slate-200 p-3">
                                {categories.map((category) => (
                                    <label
                                        key={category.code}
                                        className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            className="mt-1 accent-amber-600"
                                            checked={classification.data.codes.includes(
                                                category.code,
                                            )}
                                            onChange={(event) =>
                                                classification.setData(
                                                    'codes',
                                                    event.target.checked
                                                        ? [
                                                              ...classification
                                                                  .data.codes,
                                                              category.code,
                                                          ]
                                                        : classification.data.codes.filter(
                                                              (code) =>
                                                                  code !==
                                                                  category.code,
                                                          ),
                                                )
                                            }
                                        />
                                        <span>
                                            <b className="text-sm">
                                                {category.code} —{' '}
                                                {category.libelle}
                                            </b>
                                            <span className="block text-xs text-slate-500">
                                                {natureLabels[
                                                    category.nature
                                                ] ?? category.nature}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </FormField>
                        <CheckRow
                            checked={classification.data.finale}
                            onChange={(checked) =>
                                classification.setData('finale', checked)
                            }
                            label="Classification FINALE (après investigation)"
                        />
                        <ModalActions
                            processing={classification.processing}
                            onClose={closeDialog}
                            primaryLabel="Submit"
                        />
                    </form>
                </Modal>
            )}

            {dialog === 'causes' && selected && (
                <Modal
                    title="5 Pourquoi"
                    subtitle={`${selected.reference} — remonter de l’effet à la cause racine`}
                    onClose={closeDialog}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSelected();
                        }}
                        className="space-y-4"
                    >
                        <FormErrors errors={causes.errors} />
                        {(['p1', 'p2', 'p3', 'p4', 'p5'] as const).map(
                            (field, index) => (
                                <FormField
                                    key={field}
                                    label={`Pourquoi ${index + 1}`}
                                    required
                                >
                                    <input
                                        className="control"
                                        required
                                        value={causes.data[field]}
                                        onChange={(event) =>
                                            causes.setData(
                                                field,
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            ),
                        )}
                        <FormField label="Cause racine retenue" required>
                            <textarea
                                className="control"
                                rows={3}
                                required
                                value={causes.data.cause_racine}
                                onChange={(event) =>
                                    causes.setData(
                                        'cause_racine',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Facteurs contributifs">
                            <textarea
                                className="control"
                                rows={3}
                                value={causes.data.facteurs}
                                onChange={(event) =>
                                    causes.setData(
                                        'facteurs',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <ModalActions
                            processing={causes.processing}
                            onClose={closeDialog}
                            primaryLabel="Submit"
                        />
                    </form>
                </Modal>
            )}

            {dialog === 'work-order' && selected && (
                <Modal
                    title="Ouvrir un ordre de travail"
                    subtitle={selected.reference}
                    onClose={closeDialog}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSelected();
                        }}
                        className="space-y-5"
                    >
                        <FormErrors errors={workOrder.errors} />
                        <FormField label="Objet des travaux" required>
                            <input
                                className="control"
                                required
                                value={workOrder.data.objet}
                                onChange={(event) =>
                                    workOrder.setData(
                                        'objet',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <FormField
                            label="Ce qu’il faut réparer ou sécuriser"
                            required
                        >
                            <textarea
                                className="control"
                                rows={4}
                                required
                                value={workOrder.data.description}
                                onChange={(event) =>
                                    workOrder.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </FormField>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Priorité" required>
                                <select
                                    className="control"
                                    required
                                    value={workOrder.data.priorite}
                                    onChange={(event) =>
                                        workOrder.setData(
                                            'priorite',
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">Select an option</option>
                                    <option value="normale">Normale</option>
                                    <option value="elevee">Élevée</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </FormField>
                            <FormField label="Échéance">
                                <input
                                    className="control"
                                    type="date"
                                    value={workOrder.data.echeance}
                                    onChange={(event) =>
                                        workOrder.setData(
                                            'echeance',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                        </div>
                        <ModalActions
                            processing={workOrder.processing}
                            onClose={closeDialog}
                            primaryLabel="Submit"
                        />
                    </form>
                </Modal>
            )}

            {dialog === 'capa' && selected && (
                <Modal
                    title="Ajouter une action CAPA"
                    subtitle={`${selected.reference} — une tâche sera créée automatiquement`}
                    onClose={closeDialog}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSelected();
                        }}
                        className="space-y-5"
                    >
                        <FormErrors errors={capa.errors} />
                        <FormField
                            label="Action corrective / préventive"
                            required
                        >
                            <textarea
                                className="control"
                                rows={4}
                                required
                                value={capa.data.action}
                                onChange={(event) =>
                                    capa.setData('action', event.target.value)
                                }
                            />
                        </FormField>
                        <FormField label="Responsable" required>
                            <select
                                className="control"
                                required
                                value={capa.data.responsable_id}
                                onChange={(event) =>
                                    capa.setData(
                                        'responsable_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Select an option</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Échéance" required>
                            <input
                                className="control"
                                type="date"
                                min={new Date().toISOString().slice(0, 10)}
                                required
                                value={capa.data.echeance}
                                onChange={(event) =>
                                    capa.setData('echeance', event.target.value)
                                }
                            />
                        </FormField>
                        <ModalActions
                            processing={capa.processing}
                            onClose={closeDialog}
                            primaryLabel="Submit"
                        />
                    </form>
                </Modal>
            )}

            {dialog === 'close' && selected && (
                <Modal
                    title="Clôturer l’incident"
                    subtitle={selected.reference}
                    onClose={closeDialog}
                >
                    <div className="space-y-5">
                        <FormErrors errors={closure.errors} />
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                            La clôture est refusée si une action CAPA reste
                            ouverte ou si une investigation obligatoire n’a pas
                            de cause racine.
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Summary
                                label="Actions CAPA"
                                value={String(selected.actions.length)}
                            />
                            <Summary
                                label="Ordres de travail"
                                value={String(selected.ordres_travail.length)}
                            />
                        </div>
                        <ModalActions
                            processing={closure.processing}
                            onClose={closeDialog}
                            primaryLabel="Clôturer"
                            primaryAction={submitSelected}
                        />
                    </div>
                </Modal>
            )}
        </>
    );
}

function Modal({
    title,
    subtitle,
    onClose,
    wide = false,
    children,
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    wide?: boolean;
    children: React.ReactNode;
}) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[2px] sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-modal-title"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_28px_90px_-24px_rgba(15,23,42,0.55)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-red-50/40 px-5 py-4 sm:px-8 sm:py-6">
                    <div className="min-w-0">
                        <span className="mb-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-red-700 uppercase ring-1 ring-red-100">
                            Sécurité &amp; QHSE
                        </span>
                        <h2
                            id="incident-modal-title"
                            className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer la fenêtre"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:outline-none"
                    >
                        <X size={20} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-5 sm:p-8">
                    {children}
                </div>
            </section>
        </div>,
        document.body,
    );
}

function FormField({
    label,
    required = false,
    help,
    children,
}: {
    label: string;
    required?: boolean;
    help?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-600">*</span>}
            </span>
            {children}
            {help && (
                <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                    {help}
                </span>
            )}
        </label>
    );
}

function CheckRow({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="size-4 accent-red-600"
            />
            <span className="text-sm font-semibold text-slate-800">
                {label}
            </span>
        </label>
    );
}

function ModalActions({
    processing,
    onClose,
    primaryLabel,
    secondaryLabel,
    secondarySubmit,
    primaryAction,
}: {
    processing: boolean;
    onClose: () => void;
    primaryLabel: string;
    secondaryLabel?: string;
    secondarySubmit?: () => void;
    primaryAction?: () => void;
}) {
    return (
        <footer className="sticky -bottom-5 z-10 -mx-5 mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-5 pt-4 pb-5 shadow-[0_-12px_28px_-24px_rgba(15,23,42,0.45)] backdrop-blur sm:-bottom-8 sm:-mx-8 sm:flex-row sm:items-center sm:justify-end sm:px-8 sm:pb-8">
            <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
                Cancel
            </button>
            {secondarySubmit && (
                <button
                    type="button"
                    disabled={processing}
                    onClick={secondarySubmit}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                    {secondaryLabel}
                </button>
            )}
            <button
                type={primaryAction ? 'button' : 'submit'}
                onClick={primaryAction}
                disabled={processing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md disabled:opacity-50"
            >
                {processing ? 'Traitement…' : primaryLabel}
                <CheckCircle2 size={16} />
            </button>
        </footer>
    );
}

function FormErrors({ errors }: { errors: Record<string, string> }) {
    const messages = Object.values(errors);

    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-bold">Le formulaire contient des erreurs.</p>
            {messages.map((message) => (
                <p key={message} className="mt-1">
                    {message}
                </p>
            ))}
        </div>
    );
}

function Badge({
    tone,
    children,
}: {
    tone: 'red' | 'amber' | 'slate';
    children: React.ReactNode;
}) {
    const tones = {
        red: 'bg-red-50 text-red-700 ring-red-200',
        amber: 'bg-amber-50 text-amber-700 ring-amber-200',
        slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    };

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}
        >
            {children}
        </span>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <span className="block text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {label}
            </span>
            <span className="mt-1 block text-xl font-bold text-slate-900">
                {value}
            </span>
        </div>
    );
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}
