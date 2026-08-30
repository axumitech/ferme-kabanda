import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ClipboardList,
    Sprout,
    ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';

type User = { id: number; name: string };
type Site = { id: number; code: string; nom: string };
type Culture = { id: number; nom: string; unite_travail: string };
type Plantation = {
    id: number;
    reference: string;
    lieu: string;
    j0: string;
    culture: Culture;
};
type Requisition = {
    id: number;
    reference: string;
    objet: string;
    type: string;
    valeur?: string | null;
    statut: string;
    tache_service?: { reference: string; statut: string } | null;
};
type Incident = {
    id: number;
    reference: string;
    nature: string;
    description: string;
    statut: string;
    categorie?: { code: string; libelle: string } | null;
    actions: Array<{
        id: number;
        action: string;
        statut: string;
        tache?: { reference: string; statut: string } | null;
    }>;
};

export default function ProcessesAdmin({
    cultures,
    plantations,
    requisitions,
    incidents,
    plans,
    sites,
    users,
    visibility,
}: {
    cultures: Culture[];
    plantations: Plantation[];
    requisitions: Requisition[];
    incidents: Incident[];
    plans: Array<{
        id: number;
        code: string;
        version: number;
        statut: string;
        lignes_count: number;
    }>;
    sites: Site[];
    users: User[];
    visibility: {
        requisitionAmounts: boolean;
        incidentCosts: boolean;
        incidentsSurete: boolean;
    };
}) {
    const [tab, setTab] = useState<
        'cultures' | 'requisitions' | 'incidents' | 'plans'
    >('cultures');
    const plant = useForm({
        culture_id: String(cultures[0]?.id ?? ''),
        site_id: String(sites[0]?.id ?? ''),
        lieu: '',
        j0: new Date().toISOString().slice(0, 10),
        quantite: '',
        unite: '',
        forcer_rotation: false,
        note: '',
    });
    const harvest = useForm({
        date: new Date().toISOString().slice(0, 10),
        quantite: '',
        unite: '',
        qualite: '',
        canal_commercial: 'Vente marché',
        pertes: '',
        valeur: '',
    });
    const requisition = useForm({
        type: 'CSH',
        objet: '',
        montant: '',
        site_id: String(sites[0]?.id ?? ''),
        departement_id: '',
    });
    const incident = useForm({
        nature: 'securite',
        survenu_le: new Date().toISOString().slice(0, 16),
        description: '',
        site_id: String(sites[0]?.id ?? ''),
        lieu: '',
        departement_id: '',
        cout_estime: '',
        actions_immediates: '',
    });
    const capa = useForm({
        action: '',
        responsable_id: String(users[0]?.id ?? ''),
        echeance: new Date().toISOString().slice(0, 10),
        type: 'corrective',
    });
    const [selectedPlantation, setSelectedPlantation] =
        useState<Plantation | null>(plantations[0] ?? null);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
        incidents[0] ?? null,
    );

    return (
        <AdminLayout
            title="Processus FKN"
            subtitle="Les circuits métier sont fermés : chaque décision crée sa suite opérationnelle."
        >
            <Head title="Processus FKN" />
            <div className="admin-animate-in space-y-6">
                <div className="admin-tabs">
                    {[
                        ['cultures', 'Cultures & récoltes', Sprout],
                        ['requisitions', 'Réquisitions', ShoppingCart],
                        ['incidents', 'Incidents & CAPA', AlertTriangle],
                        ['plans', 'Plans en vigueur', ClipboardList],
                    ].map(([key, label, Icon]) => (
                        <button
                            key={key as string}
                            type="button"
                            onClick={() => setTab(key as typeof tab)}
                            className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
                        >
                            <Icon size={15} /> {label as string}
                        </button>
                    ))}
                </div>
                {tab === 'cultures' && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        <form
                            className="admin-form-panel"
                            onSubmit={(e) => {
                                e.preventDefault();
                                plant.post('/admin/processes/plantations');
                            }}
                        >
                            <h2 className="admin-section-title">
                                Nouvelle plantation
                            </h2>
                            <p className="admin-section-desc">
                                Une plantation est une instance datée : culture
                                × lieu × J0.
                            </p>
                            <div className="admin-form-grid">
                                <Field label="Culture">
                                    <select
                                        value={plant.data.culture_id}
                                        onChange={(e) =>
                                            plant.setData(
                                                'culture_id',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {cultures.map((x) => (
                                            <option value={x.id} key={x.id}>
                                                {x.nom}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Lieu">
                                    <input
                                        required
                                        value={plant.data.lieu}
                                        onChange={(e) =>
                                            plant.setData(
                                                'lieu',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Parc 3 / serre A"
                                    />
                                </Field>
                                <Field label="J0">
                                    <input
                                        type="date"
                                        required
                                        value={plant.data.j0}
                                        onChange={(e) =>
                                            plant.setData('j0', e.target.value)
                                        }
                                    />
                                </Field>
                                <Field label="Quantité">
                                    <input
                                        type="number"
                                        value={plant.data.quantite}
                                        onChange={(e) =>
                                            plant.setData(
                                                'quantite',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <button
                                className="admin-btn-submit mt-4"
                                disabled={plant.processing}
                            >
                                Créer la plantation
                            </button>
                        </form>
                        <div className="admin-card">
                            <div className="admin-card-body">
                                <h2 className="admin-section-title">
                                    Plantations actives
                                </h2>
                                {plantations.map((p) => (
                                    <button
                                        type="button"
                                        key={p.id}
                                        className="block w-full border-b p-3 text-left"
                                        onClick={() => setSelectedPlantation(p)}
                                    >
                                        <b>{p.culture.nom}</b> · {p.lieu}
                                        <span className="admin-cell-sub">
                                            {p.reference} · J0 {p.j0}
                                        </span>
                                    </button>
                                ))}
                                {selectedPlantation && (
                                    <form
                                        className="mt-4 rounded border p-3"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            harvest.post(
                                                `/admin/processes/plantations/${selectedPlantation.id}/harvests`,
                                            );
                                        }}
                                    >
                                        <b>
                                            Récolte :{' '}
                                            {selectedPlantation.culture.nom}
                                        </b>
                                        <div className="admin-form-grid mt-2">
                                            <Field label="Quantité">
                                                <input
                                                    required
                                                    type="number"
                                                    value={
                                                        harvest.data.quantite
                                                    }
                                                    onChange={(e) =>
                                                        harvest.setData(
                                                            'quantite',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </Field>
                                            <Field label="Destination">
                                                <select
                                                    value={
                                                        harvest.data
                                                            .canal_commercial
                                                    }
                                                    onChange={(e) =>
                                                        harvest.setData(
                                                            'canal_commercial',
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    {[
                                                        'Vente marché',
                                                        'EZHL / offtake',
                                                        'Cuisine du personnel',
                                                        'Semence / réserve',
                                                        'Stock frigo',
                                                        'PERTE — invendable',
                                                    ].map((x) => (
                                                        <option key={x}>
                                                            {x}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                        </div>
                                        <button className="admin-btn-submit mt-3">
                                            Enregistrer la récolte
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {tab === 'requisitions' && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        <form
                            className="admin-form-panel"
                            onSubmit={(e) => {
                                e.preventDefault();
                                requisition.post(
                                    '/admin/processes/requisitions',
                                );
                            }}
                        >
                            <h2 className="admin-section-title">
                                Nouvelle réquisition
                            </h2>
                            <div className="admin-form-grid">
                                <Field label="Type">
                                    <select
                                        value={requisition.data.type}
                                        onChange={(e) =>
                                            requisition.setData(
                                                'type',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="CSH">Fonds</option>
                                        <option value="NEW">
                                            Nouvel achat
                                        </option>
                                        <option value="STK">
                                            Sortie de stock
                                        </option>
                                    </select>
                                </Field>
                                <Field label="Objet">
                                    <input
                                        required
                                        value={requisition.data.objet}
                                        onChange={(e) =>
                                            requisition.setData(
                                                'objet',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Montant USD">
                                    <input
                                        type="number"
                                        value={requisition.data.montant}
                                        onChange={(e) =>
                                            requisition.setData(
                                                'montant',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <button className="admin-btn-submit mt-4">
                                Soumettre
                            </button>
                        </form>
                        <List
                            title="Circuit réquisitions"
                            items={requisitions}
                            render={(r) => (
                                <div>
                                    <b>{r.reference}</b> · {r.objet}
                                    <span className="admin-cell-sub">
                                        {r.statut}
                                        {visibility.requisitionAmounts &&
                                        r.valeur !== null &&
                                        r.valeur !== undefined
                                            ? ` · ${r.valeur} USD`
                                            : ''}
                                    </span>
                                    {r.statut === 'demandee' && (
                                        <Action
                                            label="Vérifier"
                                            path={`/admin/processes/requisitions/${r.id}/verify`}
                                        />
                                    )}
                                    {r.statut === 'verifiee' && (
                                        <Action
                                            label="Approuver"
                                            path={`/admin/processes/requisitions/${r.id}/approve`}
                                        />
                                    )}
                                    {r.statut === 'approuvee' && (
                                        <Action
                                            label="Servir"
                                            path={`/admin/processes/requisitions/${r.id}/serve`}
                                        />
                                    )}
                                </div>
                            )}
                        />
                    </div>
                )}
                {tab === 'incidents' && (
                    <div className="grid gap-6 xl:grid-cols-2">
                        <form
                            className="admin-form-panel"
                            onSubmit={(e) => {
                                e.preventDefault();
                                incident.post('/admin/processes/incidents');
                            }}
                        >
                            <h2 className="admin-section-title">
                                Déclarer un incident
                            </h2>
                            <div className="admin-form-grid">
                                <Field label="Nature">
                                    <select
                                        value={incident.data.nature}
                                        onChange={(e) =>
                                            incident.setData(
                                                'nature',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="securite">
                                            Sécurité
                                        </option>
                                        {visibility.incidentsSurete && (
                                            <option value="surete">
                                                Sûreté
                                            </option>
                                        )}
                                        <option value="environnement">
                                            Environnement
                                        </option>
                                    </select>
                                </Field>
                                <Field label="Survenu le">
                                    <input
                                        type="datetime-local"
                                        required
                                        value={incident.data.survenu_le}
                                        onChange={(e) =>
                                            incident.setData(
                                                'survenu_le',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <Field label="Description">
                                <textarea
                                    required
                                    value={incident.data.description}
                                    onChange={(e) =>
                                        incident.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <button className="admin-btn-submit mt-4">
                                Déclarer et calculer les échéances
                            </button>
                        </form>
                        <div className="admin-card">
                            <div className="admin-card-body">
                                <h2 className="admin-section-title">
                                    Incidents / CAPA
                                </h2>
                                {incidents.map((i) => (
                                    <button
                                        key={i.id}
                                        type="button"
                                        className="block w-full border-b p-3 text-left"
                                        onClick={() => setSelectedIncident(i)}
                                    >
                                        <b>{i.reference}</b> · {i.nature}
                                        <span className="admin-cell-sub">
                                            {i.statut} · {i.description}
                                        </span>
                                    </button>
                                ))}
                                {selectedIncident && (
                                    <form
                                        className="mt-4 rounded border p-3"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            capa.post(
                                                `/admin/processes/incidents/${selectedIncident.id}/actions`,
                                            );
                                        }}
                                    >
                                        <b>Nouvelle action CAPA</b>
                                        <Field label="Action">
                                            <input
                                                required
                                                value={capa.data.action}
                                                onChange={(e) =>
                                                    capa.setData(
                                                        'action',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>
                                        <div className="admin-form-grid mt-2">
                                            <Field label="Responsable">
                                                <select
                                                    value={
                                                        capa.data.responsable_id
                                                    }
                                                    onChange={(e) =>
                                                        capa.setData(
                                                            'responsable_id',
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    {users.map((u) => (
                                                        <option
                                                            key={u.id}
                                                            value={u.id}
                                                        >
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Échéance">
                                                <input
                                                    type="date"
                                                    value={capa.data.echeance}
                                                    onChange={(e) =>
                                                        capa.setData(
                                                            'echeance',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </Field>
                                        </div>
                                        <button className="admin-btn-submit mt-3">
                                            Créer la tâche CAPA
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {tab === 'plans' && (
                    <List
                        title="Plans versionnés"
                        items={plans}
                        render={(p) => (
                            <div>
                                <b>
                                    {p.code} · v{p.version}
                                </b>
                                <span className="admin-cell-sub">
                                    {p.statut} · {p.lignes_count} lignes
                                </span>
                            </div>
                        )}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="admin-field">
            <span>{label}</span>
            {children}
        </label>
    );
}
function Action({ label, path }: { label: string; path: string }) {
    const form = useForm({});
    return (
        <button
            type="button"
            className="admin-btn-secondary mt-2"
            onClick={() => form.post(path)}
        >
            {label}
        </button>
    );
}
function List<T>({
    title,
    items,
    render,
}: {
    title: string;
    items: T[];
    render: (item: T) => React.ReactNode;
}) {
    return (
        <div className="admin-card">
            <div className="admin-card-body">
                <h2 className="admin-section-title">{title}</h2>
                {items.length ? (
                    items.map((x, i) => (
                        <div className="border-b p-3" key={i}>
                            {render(x)}
                        </div>
                    ))
                ) : (
                    <p className="admin-empty">Aucun élément.</p>
                )}
            </div>
        </div>
    );
}
