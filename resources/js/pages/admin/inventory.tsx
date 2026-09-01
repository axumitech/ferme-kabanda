import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Archive,
    Boxes,
    ClipboardList,
    History,
    PackagePlus,
    Plus,
    Search,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    UserRoundCheck,
    Warehouse,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { AdminLayout } from './AdminLayout';

type User = { id: number; name: string };
type Reference = { id: number; label: string };
type Item = {
    id: number;
    code: string;
    name: string;
    unit: string;
    quantity_on_hand: string;
    unit_price?: string | null;
    minimum_quantity?: string | null;
    cost_center?: string | null;
    active: boolean;
    user: User;
    category: { code: string; name: string };
};
type ProductStock = {
    id: number;
    product_name: string;
    unit?: string | null;
    quantity_on_hand: string;
    minimum_quantity?: string | null;
    active: boolean;
    user: User;
};
type Assignment = {
    id: number;
    assignee_name: string;
    material_name: string;
    size?: string | null;
    assigned_on: string;
    expires_on?: string | null;
    issued_by_name?: string | null;
    is_replaced: boolean;
    assignment_reason?: string | null;
    end_reason?: string | null;
    user: User;
    assignee?: { member_account?: User | null } | null;
};
type Movement = {
    id: number;
    movement_type: string;
    quantity_change: string;
    quantity_before: string;
    quantity_after: string;
    notes?: string | null;
    occurred_at: string;
    actor?: User | null;
    item?: { code: string; name: string };
    stock?: { product_name: string };
};
type MovementTarget = {
    kind: 'items' | 'products';
    id: number;
    label: string;
    unit?: string | null;
};
type Props = {
    items: Item[];
    stocks: ProductStock[];
    assignments: Assignment[];
    inventoryMovements: Movement[];
    productMovements: Movement[];
    users: User[];
    people: Reference[];
    materials: Reference[];
    stats: {
        activeItems: number;
        inventoryValue: number | null;
        lowItems: number;
        activeProducts: number;
        activeAssignments: number;
        expiredAssignments: number;
    };
    visibility: {
        stockValues: boolean;
    };
};

const categories: Record<string, string> = {
    ENG: 'Engrais et amendements',
    PHY: 'Produits phytosanitaires',
    SEM: 'Semences et plants',
    ALI: 'Aliments du bétail',
    VET: 'Produits vétérinaires',
    PIE: 'Pièces détachées',
    OUT: 'Outillage',
    EPI: 'Équipements de protection',
    CAR: 'Carburants et lubrifiants',
    CON: 'Matériaux de construction',
    IRR: "Matériel d'irrigation",
    BUR: 'Fournitures de bureau',
    DIV: 'Divers',
};
const units = [
    'g',
    'kg',
    't',
    'litre',
    'sac 50 kg',
    'sac 25 kg',
    'ml',
    'pièce',
    'bidon',
    'fut_200l',
    'boîte',
    'carton_24',
    'paire',
    'mm',
    'mètre',
    'rouleau_100m',
];

export default function InventoryAdmin(props: Props) {
    const { confirm, ConfirmDialog } = useConfirmDialog();
    const page = usePage();
    const requestedTab = new URLSearchParams(page.url.split('?')[1] ?? '').get(
        'tab',
    );
    const initialTab = ['items', 'products', 'assignments', 'history'].includes(
        requestedTab ?? '',
    )
        ? (requestedTab as 'items' | 'products' | 'assignments' | 'history')
        : 'items';
    const [tab, setTab] = useState<
        'items' | 'products' | 'assignments' | 'history'
    >(initialTab);
    const [query, setQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [movementTarget, setMovementTarget] = useState<MovementTarget | null>(
        null,
    );
    const [endingAssignment, setEndingAssignment] = useState<Assignment | null>(
        null,
    );
    const today = new Date().toISOString().slice(0, 10);
    const defaultUser = props.users[0]?.id ?? 0;

    const itemForm = useForm({
        category_code: 'ENG',
        category_name: categories.ENG,
        code: '',
        name: '',
        unit: 'kg',
        quantity: 0,
        unit_price: 0,
        minimum_quantity: 0,
        cost_center: 'EXA',
    });
    const productForm = useForm({
        user_id: defaultUser,
        product_name: '',
        unit: 'kg',
        quantity: 0,
        minimum_quantity: 5,
    });
    const assignmentForm = useForm({
        user_id: defaultUser,
        assignee_reference_item_id: props.people[0]?.id ?? 0,
        material_reference_item_id: props.materials[0]?.id ?? 0,
        size: '',
        assigned_on: today,
        expires_on: '',
        reason: '',
    });
    const movementForm = useForm({
        quantity_change: '',
        reason: '',
    });
    const assignmentEndForm = useForm({
        reason: '',
    });

    const filteredItems = useMemo(
        () =>
            props.items.filter((item) =>
                `${item.code} ${item.name} ${item.user.name}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
            ),
        [props.items, query],
    );
    const filteredStocks = useMemo(
        () =>
            props.stocks.filter((stock) =>
                `${stock.product_name} ${stock.user.name}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
            ),
        [props.stocks, query],
    );
    const filteredAssignments = useMemo(
        () =>
            props.assignments.filter((assignment) =>
                `${assignment.assignee_name} ${assignment.material_name}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
            ),
        [props.assignments, query],
    );

    const adjust = (target: MovementTarget) => {
        setMovementTarget(target);
        setEndingAssignment(null);
        movementForm.setData({ quantity_change: '', reason: '' });
    };
    const archive = async (
        kind: 'items' | 'products',
        id: number,
        label: string,
    ) => {
        if (
            await confirm({
                title: "Confirmation d'archivage",
                description: `Archiver « ${label} » ? Le stock doit être à zéro et l’historique sera conservé.`,
                confirmText: 'Archiver',
                variant: 'destructive',
            })
        ) {
            router.delete(`/admin/inventory/${kind}/${id}`, {
                preserveScroll: true,
            });
        }
    };
    const endAssignment = (assignment: Assignment) => {
        setEndingAssignment(assignment);
        setMovementTarget(null);
        assignmentEndForm.setData({ reason: '' });
    };
    const submitMovement = (event: React.FormEvent) => {
        event.preventDefault();

        if (!movementTarget) {
            return;
        }

        movementForm.post(
            `/admin/inventory/${movementTarget.kind}/${movementTarget.id}/adjust`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    movementForm.reset('quantity_change', 'reason');
                    setMovementTarget(null);
                },
            },
        );
    };
    const submitAssignmentEnd = (event: React.FormEvent) => {
        event.preventDefault();

        if (!endingAssignment) {
            return;
        }

        assignmentEndForm.post(
            `/admin/inventory/assignments/${endingAssignment.id}/end`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    assignmentEndForm.reset('reason');
                    setEndingAssignment(null);
                },
            },
        );
    };

    const cards = [
        {
            label: 'Articles actifs',
            value: props.stats.activeItems,
            icon: Boxes,
        },
        ...(props.visibility.stockValues && props.stats.inventoryValue !== null
            ? [
                  {
                      label: 'Valeur magasin',
                      value: `${props.stats.inventoryValue.toFixed(0)} USD`,
                      icon: Warehouse,
                  },
              ]
            : []),
        {
            label: 'Alertes stock',
            value: props.stats.lowItems,
            icon: AlertTriangle,
            danger: props.stats.lowItems > 0,
        },
        {
            label: 'Produits suivis',
            value: props.stats.activeProducts,
            icon: ClipboardList,
        },
        {
            label: 'Matériels attribués',
            value: props.stats.activeAssignments,
            icon: UserRoundCheck,
        },
        {
            label: 'Attributions expirées',
            value: props.stats.expiredAssignments,
            icon: ShieldCheck,
            danger: props.stats.expiredAssignments > 0,
        },
    ];

    return (
        <AdminLayout
            title="Magasin et matériels"
            subtitle="Le magasin devient la source unique des intrants, articles et mouvements de stock."
        >
            <ConfirmDialog />
            <Head title="Stocks et matériels — Administration" />

            <div className="admin-animate-in">
                <div className="admin-stats-grid mb-6">
                    {cards.map(({ label, value, icon: Icon, danger }) => (
                        <div
                            key={label}
                            className={`admin-stat-card ${danger ? 'border-red-300 bg-red-50/30' : ''}`}
                        >
                            <div className="admin-stat-header">
                                <span
                                    className={`admin-stat-label ${danger ? 'font-semibold text-red-700' : ''}`}
                                >
                                    {label}
                                </span>
                                <div
                                    className={`admin-stat-icon ${danger ? 'bg-red-100 text-red-600' : ''}`}
                                >
                                    <Icon size={16} />
                                </div>
                            </div>
                            <div
                                className={`admin-stat-value ${danger ? 'text-red-700' : ''}`}
                            >
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="admin-toolbar mb-6">
                    <div className="admin-tabs">
                        {(
                            [
                                ['items', 'Magasin', Boxes],
                                ['products', 'Productions suivies', Warehouse],
                                [
                                    'assignments',
                                    'Matériels attribués',
                                    UserRoundCheck,
                                ],
                                ['history', 'Historique', History],
                            ] as const
                        ).map(([key, label, Icon]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setTab(key);
                                    router.get(
                                        '/admin/inventory',
                                        { tab: key },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    );
                                    setShowForm(false);
                                    setMovementTarget(null);
                                    setEndingAssignment(null);
                                }}
                                className={`admin-tab ${tab === key ? 'admin-tab--active' : ''}`}
                            >
                                <Icon size={15} />
                                {label}
                            </button>
                        ))}
                    </div>
                    {tab !== 'history' && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="admin-btn-submit h-10 px-4"
                        >
                            <Plus size={16} /> Nouvelle opération
                        </button>
                    )}
                </div>

                {showForm && tab === 'items' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            itemForm.post('/admin/inventory/items', {
                                preserveScroll: true,
                                onSuccess: () => {
                                    itemForm.reset();
                                    setShowForm(false);
                                },
                            });
                        }}
                        className="admin-form-panel mb-6"
                    >
                        <div className="mb-5 rounded-lg border border-[#dfe6dc] bg-[#fbfaf7] p-4 text-sm leading-6 text-[#425047]">
                            Un article appartient maintenant au magasin central.
                            Les entrées et sorties se font ensuite depuis le
                            bouton
                            <span className="font-semibold text-[#17352a]">
                                {' '}
                                Entrée / sortie
                            </span>
                            , avec un motif obligatoire.
                        </div>
                        <div className="admin-form-grid md:grid-cols-3 xl:grid-cols-5">
                            <FormSelect
                                label="Catégorie"
                                value={itemForm.data.category_code}
                                onChange={(v) => {
                                    itemForm.setData('category_code', v);
                                    itemForm.setData(
                                        'category_name',
                                        categories[v],
                                    );
                                }}
                                options={Object.entries(categories)}
                            />
                            <FormInput
                                label="Code article"
                                value={itemForm.data.code}
                                onChange={(v) => itemForm.setData('code', v)}
                                placeholder="OUT-001"
                            />
                            <FormInput
                                label="Désignation"
                                value={itemForm.data.name}
                                onChange={(v) => itemForm.setData('name', v)}
                            />
                            <FormSelect
                                label="Unité"
                                value={itemForm.data.unit}
                                onChange={(v) => itemForm.setData('unit', v)}
                                options={units.map((u) => [u, u])}
                            />
                            <FormNumber
                                label="Quantité initiale"
                                value={itemForm.data.quantity}
                                onChange={(v) =>
                                    itemForm.setData('quantity', v)
                                }
                            />
                            <FormNumber
                                label="Prix unitaire USD"
                                value={itemForm.data.unit_price}
                                onChange={(v) =>
                                    itemForm.setData('unit_price', v)
                                }
                            />
                            <FormNumber
                                label="Seuil d’alerte"
                                value={itemForm.data.minimum_quantity}
                                onChange={(v) =>
                                    itemForm.setData('minimum_quantity', v)
                                }
                            />
                            <FormInput
                                label="Centre de coût"
                                value={itemForm.data.cost_center}
                                onChange={(v) =>
                                    itemForm.setData('cost_center', v)
                                }
                            />
                            <div className="flex flex-col justify-end">
                                <Submit
                                    processing={itemForm.processing}
                                    label="Créer l’article"
                                />
                            </div>
                        </div>
                    </form>
                )}

                {showForm && tab === 'products' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            productForm.post('/admin/inventory/products', {
                                preserveScroll: true,
                                onSuccess: () => {
                                    productForm.reset();
                                    setShowForm(false);
                                },
                            });
                        }}
                        className="admin-form-panel mb-6"
                    >
                        <div className="admin-form-grid md:grid-cols-3 xl:grid-cols-6">
                            <FormSelect
                                label="Responsable / compte"
                                value={productForm.data.user_id}
                                onChange={(v) =>
                                    productForm.setData('user_id', Number(v))
                                }
                                options={props.users.map((u) => [u.id, u.name])}
                            />
                            <FormInput
                                label="Produit"
                                value={productForm.data.product_name}
                                onChange={(v) =>
                                    productForm.setData('product_name', v)
                                }
                            />
                            <FormSelect
                                label="Unité"
                                value={productForm.data.unit}
                                onChange={(v) => productForm.setData('unit', v)}
                                options={units.map((u) => [u, u])}
                            />
                            <FormNumber
                                label="Quantité initiale"
                                value={productForm.data.quantity}
                                onChange={(v) =>
                                    productForm.setData('quantity', v)
                                }
                            />
                            <FormNumber
                                label="Seuil d’alerte"
                                value={productForm.data.minimum_quantity}
                                onChange={(v) =>
                                    productForm.setData('minimum_quantity', v)
                                }
                            />
                            <div className="flex flex-col justify-end">
                                <Submit
                                    processing={productForm.processing}
                                    label="Créer le stock"
                                />
                            </div>
                        </div>
                    </form>
                )}

                {showForm && tab === 'assignments' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            assignmentForm.post(
                                '/admin/inventory/assignments',
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        assignmentForm.reset();
                                        setShowForm(false);
                                    },
                                },
                            );
                        }}
                        className="admin-form-panel mb-6"
                    >
                        <div className="admin-form-grid md:grid-cols-3 xl:grid-cols-4">
                            <FormSelect
                                label="Compte responsable"
                                value={assignmentForm.data.user_id}
                                onChange={(v) =>
                                    assignmentForm.setData('user_id', Number(v))
                                }
                                options={props.users.map((u) => [u.id, u.name])}
                            />
                            <FormSelect
                                label="Personne"
                                value={
                                    assignmentForm.data
                                        .assignee_reference_item_id
                                }
                                onChange={(v) =>
                                    assignmentForm.setData(
                                        'assignee_reference_item_id',
                                        Number(v),
                                    )
                                }
                                options={props.people.map((p) => [
                                    p.id,
                                    p.label,
                                ])}
                            />
                            <FormSelect
                                label="Matériel / EPI"
                                value={
                                    assignmentForm.data
                                        .material_reference_item_id
                                }
                                onChange={(v) =>
                                    assignmentForm.setData(
                                        'material_reference_item_id',
                                        Number(v),
                                    )
                                }
                                options={props.materials.map((m) => [
                                    m.id,
                                    m.label,
                                ])}
                            />
                            <FormInput
                                label="Taille"
                                value={assignmentForm.data.size}
                                onChange={(v) =>
                                    assignmentForm.setData('size', v)
                                }
                            />
                            <FormInput
                                label="Date de remise"
                                type="date"
                                value={assignmentForm.data.assigned_on}
                                onChange={(v) =>
                                    assignmentForm.setData('assigned_on', v)
                                }
                            />
                            <FormInput
                                label="Expiration"
                                type="date"
                                value={assignmentForm.data.expires_on}
                                onChange={(v) =>
                                    assignmentForm.setData('expires_on', v)
                                }
                            />
                            <FormInput
                                label="Motif / observation"
                                value={assignmentForm.data.reason}
                                onChange={(v) =>
                                    assignmentForm.setData('reason', v)
                                }
                            />
                            <div className="flex flex-col justify-end">
                                <Submit
                                    processing={assignmentForm.processing}
                                    label="Attribuer"
                                />
                            </div>
                        </div>
                    </form>
                )}

                {movementTarget && (
                    <form
                        onSubmit={submitMovement}
                        className="admin-form-panel mb-6 border-[#cfe0cf] bg-[#fbfff9]"
                    >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="admin-section-eyebrow">
                                    Mouvement magasin
                                </div>
                                <h3 className="admin-section-title text-[20px]">
                                    {movementTarget.label}
                                </h3>
                                <p className="admin-section-desc mb-0">
                                    Saisissez une quantité positive pour une
                                    entrée, négative pour une sortie.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => setMovementTarget(null)}
                            >
                                Annuler
                            </button>
                        </div>
                        <div className="admin-form-grid md:grid-cols-[220px_minmax(0,1fr)_auto]">
                            <div className="admin-field">
                                <label>Variation</label>
                                <input
                                    required
                                    type="number"
                                    step="0.001"
                                    value={movementForm.data.quantity_change}
                                    onChange={(event) =>
                                        movementForm.setData(
                                            'quantity_change',
                                            event.target.value,
                                        )
                                    }
                                    placeholder={`Ex: 10 ou -3${movementTarget.unit ? ` ${movementTarget.unit}` : ''}`}
                                />
                                <p className="admin-form-hint">
                                    Quantité positive = entrée, quantité
                                    négative = sortie.
                                </p>
                                {movementForm.errors.quantity_change && (
                                    <span className="admin-form-error">
                                        {movementForm.errors.quantity_change}
                                    </span>
                                )}
                            </div>
                            <div className="admin-field">
                                <label>Motif obligatoire</label>
                                <input
                                    required
                                    value={movementForm.data.reason}
                                    onChange={(event) =>
                                        movementForm.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Réception fournisseur, sortie terrain, correction inventaire..."
                                />
                                <p className="admin-form-hint">
                                    Le motif rend le mouvement traçable et
                                    auditable.
                                </p>
                                {movementForm.errors.reason && (
                                    <span className="admin-form-error">
                                        {movementForm.errors.reason}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col justify-end">
                                <button
                                    type="submit"
                                    disabled={movementForm.processing}
                                    className="admin-btn-submit h-11 px-4"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {endingAssignment && (
                    <form
                        onSubmit={submitAssignmentEnd}
                        className="admin-form-panel mb-6 border-amber-200 bg-amber-50/50"
                    >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="admin-section-eyebrow">
                                    Retrait matériel
                                </div>
                                <h3 className="admin-section-title text-[20px]">
                                    {endingAssignment.material_name}
                                </h3>
                                <p className="admin-section-desc mb-0">
                                    Retrait à {endingAssignment.assignee_name}.
                                    Le motif sera conservé dans l’historique.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => setEndingAssignment(null)}
                            >
                                Annuler
                            </button>
                        </div>
                        <div className="admin-form-grid md:grid-cols-[1fr_auto]">
                            <div className="admin-field">
                                <label>Motif du retrait</label>
                                <input
                                    required
                                    value={assignmentEndForm.data.reason}
                                    onChange={(event) =>
                                        assignmentEndForm.setData(
                                            'reason',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Remplacement, fin de contrat, matériel rendu..."
                                />
                                <p className="admin-form-hint">
                                    Ce retrait n’efface pas l’attribution : il
                                    clôture son historique.
                                </p>
                                {assignmentEndForm.errors.reason && (
                                    <span className="admin-form-error">
                                        {assignmentEndForm.errors.reason}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col justify-end">
                                <button
                                    type="submit"
                                    disabled={assignmentEndForm.processing}
                                    className="admin-btn-submit h-11 px-4"
                                >
                                    Confirmer le retrait
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {tab !== 'history' && (
                    <div className="admin-search mb-4">
                        <Search size={16} />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher par article, produit, personne ou responsable…"
                        />
                    </div>
                )}

                {tab === 'items' && (
                    <ItemTable
                        items={filteredItems}
                        showStockValues={props.visibility.stockValues}
                        onAdjust={(i) =>
                            adjust({
                                kind: 'items',
                                id: i.id,
                                label: i.name,
                                unit: i.unit,
                            })
                        }
                        onArchive={(i) => archive('items', i.id, i.name)}
                    />
                )}
                {tab === 'products' && (
                    <ProductTable
                        stocks={filteredStocks}
                        onAdjust={(s) =>
                            adjust({
                                kind: 'products',
                                id: s.id,
                                label: s.product_name,
                                unit: s.unit,
                            })
                        }
                        onArchive={(s) =>
                            archive('products', s.id, s.product_name)
                        }
                    />
                )}
                {tab === 'assignments' && (
                    <AssignmentTable
                        assignments={filteredAssignments}
                        onEnd={endAssignment}
                    />
                )}
                {tab === 'history' && (
                    <HistoryTable
                        inventory={props.inventoryMovements}
                        products={props.productMovements}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

function FormInput({
    label,
    value,
    onChange,
    placeholder = '',
    type = 'text',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div className="admin-field">
            <label>{label}</label>
            <input
                required={
                    label !== 'Taille' &&
                    label !== 'Expiration' &&
                    label !== 'Motif / observation'
                }
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}
function FormNumber({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="admin-field">
            <label>{label}</label>
            <input
                required
                type="number"
                min="0"
                step="0.001"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
function FormSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    options: (readonly [string | number, string])[];
}) {
    return (
        <div className="admin-field">
            <label>{label}</label>
            <select
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map(([key, name]) => (
                    <option key={key} value={key}>
                        {name}
                    </option>
                ))}
            </select>
        </div>
    );
}
function Submit({ processing, label }: { processing: boolean; label: string }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="admin-btn-submit h-11 w-full"
        >
            <PackagePlus size={16} />
            {label}
        </button>
    );
}
function Empty() {
    return <div className="admin-empty">Aucune donnée à afficher.</div>;
}

function ItemTable({
    items,
    showStockValues,
    onAdjust,
    onArchive,
}: {
    items: Item[];
    showStockValues: boolean;
    onAdjust: (item: Item) => void;
    onArchive: (item: Item) => void;
}) {
    return (
        <Table
            headers={[
                'Article',
                'Responsable',
                'Quantité',
                ...(showStockValues ? ['Prix / valeur'] : []),
                'Seuil',
                'Actions',
            ]}
        >
            {items.length ? (
                items.map((item) => {
                    const low =
                        item.minimum_quantity != null &&
                        Number(item.quantity_on_hand) <=
                            Number(item.minimum_quantity);

                    return (
                        <tr
                            key={item.id}
                            className={`border-b border-[#e5e1d8] transition-colors last:border-0 hover:bg-[#f9f8f5] ${!item.active ? 'bg-[#faf9f5] opacity-50' : ''}`}
                        >
                            <Cell>
                                <b className="text-[14px] text-[#17352a]">
                                    {item.code}
                                </b>
                                <div className="text-[13px] text-[#4a5750]">
                                    {item.name}
                                </div>
                                <span className="admin-badge admin-badge--gray mt-1 inline-block">
                                    {item.category.name}
                                </span>
                            </Cell>
                            <Cell>
                                <span className="text-[13.5px] font-medium text-[#17352a]">
                                    {item.user.name}
                                </span>
                                {showStockValues && (
                                    <div className="mt-0.5 text-[12px] text-[#79837d]">
                                        Centre: {item.cost_center || '—'}
                                    </div>
                                )}
                            </Cell>
                            <Cell>
                                <strong
                                    className={`text-[14px] ${low ? 'text-[#c0392b]' : 'text-[#267049]'}`}
                                >
                                    {Number(item.quantity_on_hand).toFixed(3)}{' '}
                                    {item.unit}
                                </strong>
                                {low && (
                                    <div className="mt-0.5 inline-block rounded bg-[#fdf2f1] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#c0392b]">
                                        Stock critique
                                    </div>
                                )}
                            </Cell>
                            {showStockValues && (
                                <Cell>
                                    <div className="text-[13.5px] font-medium text-[#17352a]">
                                        {Number(item.unit_price).toFixed(2)} USD
                                    </div>
                                    <div className="mt-0.5 text-[12px] text-[#79837d]">
                                        {(
                                            Number(item.quantity_on_hand) *
                                            Number(item.unit_price)
                                        ).toFixed(2)}{' '}
                                        USD total
                                    </div>
                                </Cell>
                            )}
                            <Cell>
                                <span className="text-[13px] text-[#4a5750]">
                                    {item.minimum_quantity ?? '—'}
                                </span>
                            </Cell>
                            <Actions
                                active={item.active}
                                onAdjust={() => onAdjust(item)}
                                onArchive={() => onArchive(item)}
                            />
                        </tr>
                    );
                })
            ) : (
                <tr>
                    <td colSpan={showStockValues ? 6 : 5}>
                        <Empty />
                    </td>
                </tr>
            )}
        </Table>
    );
}
function ProductTable({
    stocks,
    onAdjust,
    onArchive,
}: {
    stocks: ProductStock[];
    onAdjust: (stock: ProductStock) => void;
    onArchive: (stock: ProductStock) => void;
}) {
    return (
        <Table
            headers={[
                'Produit',
                'Responsable',
                'Quantité',
                'Seuil / état',
                'Actions',
            ]}
        >
            {stocks.length ? (
                stocks.map((stock) => {
                    const low =
                        stock.minimum_quantity != null &&
                        Number(stock.quantity_on_hand) <=
                            Number(stock.minimum_quantity);

                    return (
                        <tr
                            key={stock.id}
                            className={`border-b border-[#e5e1d8] transition-colors last:border-0 hover:bg-[#f9f8f5] ${!stock.active ? 'bg-[#faf9f5] opacity-50' : ''}`}
                        >
                            <Cell>
                                <b className="text-[14px] text-[#17352a]">
                                    {stock.product_name}
                                </b>
                            </Cell>
                            <Cell>
                                <span className="text-[13.5px] font-medium text-[#17352a]">
                                    {stock.user.name}
                                </span>
                            </Cell>
                            <Cell>
                                <strong
                                    className={`text-[14px] ${low ? 'text-[#c0392b]' : 'text-[#267049]'}`}
                                >
                                    {Number(stock.quantity_on_hand).toFixed(3)}{' '}
                                    {stock.unit || 'kg/L'}
                                </strong>
                            </Cell>
                            <Cell>
                                <span className="text-[13px] text-[#4a5750]">
                                    {stock.minimum_quantity ?? '—'}
                                </span>
                                {low && (
                                    <div className="mt-0.5 inline-block rounded bg-[#fdf2f1] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#c0392b]">
                                        Stock critique
                                    </div>
                                )}
                            </Cell>
                            <Actions
                                active={stock.active}
                                onAdjust={() => onAdjust(stock)}
                                onArchive={() => onArchive(stock)}
                            />
                        </tr>
                    );
                })
            ) : (
                <tr>
                    <td colSpan={5}>
                        <Empty />
                    </td>
                </tr>
            )}
        </Table>
    );
}
function AssignmentTable({
    assignments,
    onEnd,
}: {
    assignments: Assignment[];
    onEnd: (assignment: Assignment) => void;
}) {
    return (
        <Table
            headers={[
                'Personne',
                'Matériel',
                'Remise / expiration',
                'Enregistré par',
                'État',
                'Action',
            ]}
        >
            {assignments.length ? (
                assignments.map((a) => {
                    const expired =
                        !!a.expires_on &&
                        a.expires_on < new Date().toISOString().slice(0, 10);

                    return (
                        <tr
                            key={a.id}
                            className="border-b border-[#e5e1d8] transition-colors last:border-0 hover:bg-[#f9f8f5]"
                        >
                            <Cell>
                                <b className="text-[14px] text-[#17352a]">
                                    {a.assignee_name}
                                </b>
                                <div className="mt-1">
                                    {a.assignee?.member_account ? (
                                        <span className="admin-badge admin-badge--green">
                                            Compte :{' '}
                                            {a.assignee.member_account.name}
                                        </span>
                                    ) : (
                                        <span className="admin-badge admin-badge--gray">
                                            Sans compte lié
                                        </span>
                                    )}
                                </div>
                            </Cell>
                            <Cell>
                                <b className="text-[14px] text-[#17352a]">
                                    {a.material_name}
                                </b>
                                <div className="mt-0.5 text-[12.5px] text-[#637069]">
                                    {a.size
                                        ? `Taille ${a.size}`
                                        : 'Taille non précisée'}
                                </div>
                            </Cell>
                            <Cell>
                                <span className="text-[13.5px] text-[#17352a]">
                                    {a.assigned_on.slice(0, 10)}
                                </span>
                                <div className="mt-0.5 text-[12px] text-[#79837d]">
                                    {a.expires_on
                                        ? `Expire : ${a.expires_on.slice(0, 10)}`
                                        : 'Sans expiration'}
                                </div>
                            </Cell>
                            <Cell>
                                <span className="text-[13px] text-[#4a5750]">
                                    {a.issued_by_name || a.user.name}
                                </span>
                            </Cell>
                            <Cell>
                                <span
                                    className={`admin-badge ${a.is_replaced ? 'admin-badge--gray' : expired ? 'admin-badge--gold' : 'admin-badge--green'}`}
                                >
                                    {a.is_replaced
                                        ? 'CLÔTURÉE'
                                        : expired
                                          ? 'EXPIRÉE'
                                          : 'ACTIVE'}
                                </span>
                                {a.end_reason && (
                                    <div className="mt-1 text-[12px] text-[#79837d]">
                                        {a.end_reason}
                                    </div>
                                )}
                            </Cell>
                            <td className="px-4 py-3 align-top">
                                {!a.is_replaced && (
                                    <button
                                        onClick={() => onEnd(a)}
                                        className="admin-btn-secondary !border-[#f5c6c2] !text-[#c0392b] hover:!bg-[#fdf2f1]"
                                    >
                                        Retirer
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })
            ) : (
                <tr>
                    <td colSpan={6}>
                        <Empty />
                    </td>
                </tr>
            )}
        </Table>
    );
}
function HistoryTable({
    inventory,
    products,
}: {
    inventory: Movement[];
    products: Movement[];
}) {
    const rows = [
        ...inventory.map((m) => ({
            ...m,
            label: `${m.item?.code} — ${m.item?.name}`,
            family: 'Article',
        })),
        ...products.map((m) => ({
            ...m,
            label: m.stock?.product_name,
            family: 'Produit',
        })),
    ].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

    return (
        <Table
            headers={[
                'Date',
                'Type',
                'Élément',
                'Variation',
                'Registre',
                'Auteur / motif',
            ]}
        >
            {rows.length ? (
                rows.map((m) => (
                    <tr
                        key={`${m.family}-${m.id}`}
                        className="border-b border-[#e5e1d8] transition-colors last:border-0 hover:bg-[#f9f8f5]"
                    >
                        <Cell>
                            <span className="text-[13.5px] font-medium text-[#17352a]">
                                {new Date(m.occurred_at).toLocaleString(
                                    'fr-FR',
                                    {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    },
                                )}
                            </span>
                        </Cell>
                        <Cell>
                            <span className="text-[14px] text-[#17352a]">
                                {m.family}
                            </span>
                            <div className="mt-0.5 text-[12.5px] text-[#637069]">
                                {m.movement_type}
                            </div>
                        </Cell>
                        <Cell>
                            <b className="text-[14px] text-[#17352a]">
                                {m.label}
                            </b>
                        </Cell>
                        <Cell>
                            <span
                                className={`inline-flex items-center gap-1 text-[14px] font-bold ${Number(m.quantity_change) > 0 ? 'text-[#267049]' : 'text-[#c0392b]'}`}
                            >
                                {Number(m.quantity_change) > 0 ? (
                                    <TrendingUp size={16} />
                                ) : (
                                    <TrendingDown size={16} />
                                )}
                                {Number(m.quantity_change) > 0 ? '+' : ''}
                                {m.quantity_change}
                            </span>
                        </Cell>
                        <Cell>
                            <span className="text-[13.5px] text-[#4a5750]">
                                {m.family === 'Article'
                                    ? 'Somme des mouvements'
                                    : `${m.quantity_before} → ${m.quantity_after}`}
                            </span>
                        </Cell>
                        <Cell>
                            <span className="text-[13.5px] font-medium text-[#17352a]">
                                {m.actor?.name || 'Système'}
                            </span>
                            <div className="mt-0.5 text-[12.5px] text-[#79837d]">
                                {m.notes || '—'}
                            </div>
                        </Cell>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={6}>
                        <Empty />
                    </td>
                </tr>
            )}
        </Table>
    );
}
function Table({
    headers,
    children,
}: {
    headers: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="admin-table-wrap">
            <table className="admin-table">
                <thead>
                    <tr>
                        {headers.map((h) => (
                            <th key={h}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}
function Cell({ children }: { children: React.ReactNode }) {
    return <td className="px-4 py-3.5 align-top">{children}</td>;
}
function Actions({
    active,
    onAdjust,
    onArchive,
}: {
    active: boolean;
    onAdjust: () => void;
    onArchive: () => void;
}) {
    return (
        <td className="px-4 py-3.5 align-top">
            <div className="flex gap-2">
                {active && (
                    <button
                        onClick={onAdjust}
                        className="admin-btn-submit h-8 px-3 text-[12px]"
                    >
                        Entrée / sortie
                    </button>
                )}
                {active && (
                    <button
                        onClick={onArchive}
                        className="admin-btn-icon"
                        title="Archiver"
                    >
                        <Archive size={14} />
                    </button>
                )}
            </div>
        </td>
    );
}
