import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Edit3,
    Map,
    MousePointer2,
    Plus,
    RotateCcw,
    Save,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

type Point = [number, number];
type Feature = {
    id: number;
    name: string;
    feature_type: 'limite' | 'parc' | 'bloc' | 'bati';
    area_ha: string | null;
    area_m2: number | null;
    points: Point[];
    sort_order: number;
    active: boolean;
};

const TYPES = {
    limite: 'Limite de la ferme',
    parc: 'Parcelle',
    bloc: 'Sous-bloc',
    bati: 'Bâtiment',
};

const colors = (type: Feature['feature_type'], selected = false) => {
    if (selected) {
        return { fill: '#D8A84E', stroke: '#7A481F' };
    }

    if (type === 'limite') {
        return { fill: '#FAF7EF', stroke: '#17352A' };
    }

    if (type === 'parc') {
        return { fill: '#BFD5C4', stroke: '#25513C' };
    }

    if (type === 'bloc') {
        return { fill: '#DCE7EE', stroke: '#315F82' };
    }

    return { fill: '#AE7A4E', stroke: '#603919' };
};

export default function MapAdmin({
    features,
    canvas,
}: {
    features: Feature[];
    canvas: { width: number; height: number };
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [drawing, setDrawing] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const form = useForm({
        name: '',
        feature_type: 'parc' as Feature['feature_type'],
        area_ha: '',
        area_m2: '',
        points: [] as Point[],
        sort_order: features.length,
        active: true,
    });

    const selected = useMemo(
        () => features.find((feature) => feature.id === selectedId) || null,
        [features, selectedId],
    );
    const pointString = (points: Point[]) =>
        points.map(([x, y]) => `${x},${y}`).join(' ');

    const svgPoint = (clientX: number, clientY: number): Point => {
        const svg = svgRef.current;

        if (!svg) {
            return [0, 0];
        }

        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const transformed = point.matrixTransform(
            svg.getScreenCTM()?.inverse(),
        );

        return [
            Math.round(transformed.x * 10) / 10,
            Math.round(transformed.y * 10) / 10,
        ];
    };

    const selectFeature = (feature: Feature) => {
        setSelectedId(feature.id);
        setDrawing(false);
        form.setData({
            name: feature.name,
            feature_type: feature.feature_type,
            area_ha: feature.area_ha || '',
            area_m2: feature.area_m2 ? String(feature.area_m2) : '',
            points: feature.points,
            sort_order: feature.sort_order,
            active: feature.active,
        });
    };

    const newFeature = () => {
        setSelectedId(null);
        setDrawing(true);
        form.clearErrors();
        form.setData({
            name: '',
            feature_type: 'parc',
            area_ha: '',
            area_m2: '',
            points: [],
            sort_order: features.length,
            active: true,
        });
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (form.data.points.length < 3) {
            return;
        }

        if (selected) {
            form.put(`/admin/map/${selected.id}`, { preserveScroll: true });
        } else {
            form.post('/admin/map', {
                preserveScroll: true,
                onSuccess: () => setDrawing(false),
            });
        }
    };

    const remove = () => {
        if (
            !selected ||
            !window.confirm(`Supprimer « ${selected.name} » de la carte ?`)
        ) {
            return;
        }

        router.delete(`/admin/map/${selected.id}`, {
            preserveScroll: true,
            onSuccess: () => newFeature(),
        });
    };

    const addPoint = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!drawing || dragIndex !== null) {
            return;
        }

        form.setData('points', [
            ...form.data.points,
            svgPoint(event.clientX, event.clientY),
        ]);
    };

    const movePoint = (event: React.PointerEvent<SVGSVGElement>) => {
        if (dragIndex === null) {
            return;
        }

        const next = [...form.data.points];
        next[dragIndex] = svgPoint(event.clientX, event.clientY);
        form.setData('points', next);
    };

    return (
        <div className="admin-screen min-h-screen bg-[#f4f1e8] text-[#17352a]">
            <Head title="Éditeur du plan de la ferme" />
            <header className="border-b border-white/10 bg-[#123f29] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <div className="flex items-center gap-3">
                        <img
                            src="/brand-logo.png"
                            className="size-12 rounded-xl bg-white p-1"
                            alt="Logo"
                        />
                        <div>
                            <div className="text-xs tracking-[.18em] text-[#e2bd71]">
                                ADMINISTRATION
                            </div>
                            <h1 className="text-lg font-semibold">
                                Éditeur du plan
                            </h1>
                        </div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Link
                            href="/admin"
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:flex-none"
                        >
                            <ArrowLeft className="size-4" /> Référentiels
                        </Link>
                        <Link
                            href="/dashboard"
                            className="flex flex-1 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 sm:flex-none"
                        >
                            <span className="sm:hidden">Ferme</span>
                            <span className="hidden sm:inline">
                                Voir la ferme
                            </span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-sm font-semibold tracking-[.15em] text-[#b16a2f]">
                            CARTE INTERACTIVE
                        </p>
                        <h2 className="mt-1 text-3xl font-semibold">
                            Dessiner les zones de la ferme
                        </h2>
                        <p className="mt-2 text-sm text-[#68766e]">
                            Ajoutez des points en cliquant sur la carte.
                            Déplacez un sommet en le faisant glisser.
                        </p>
                    </div>
                    <button
                        onClick={newFeature}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#174a31] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#103b27]"
                    >
                        <Plus className="size-4" /> Nouvelle zone
                    </button>
                </div>

                <div className="grid gap-5 xl:grid-cols-[250px_minmax(420px,1fr)_330px]">
                    <aside className="max-h-64 overflow-y-auto rounded-2xl border border-[#d9d3c6] bg-white p-3 shadow-sm xl:max-h-[760px]">
                        <div className="px-3 py-2 text-xs font-semibold tracking-[.14em] text-[#879189]">
                            {features.length} FORMES
                        </div>
                        {features.map((feature) => (
                            <button
                                key={feature.id}
                                onClick={() => selectFeature(feature)}
                                className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedId === feature.id ? 'bg-[#e8f0e9]' : 'hover:bg-[#f6f3ec]'}`}
                            >
                                <span
                                    className="size-3 shrink-0 rounded-sm"
                                    style={{
                                        background: colors(feature.feature_type)
                                            .fill,
                                        border: `1px solid ${colors(feature.feature_type).stroke}`,
                                    }}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">
                                        {feature.name}
                                    </span>
                                    <span className="text-xs text-[#78847d]">
                                        {TYPES[feature.feature_type]} ·{' '}
                                        {feature.points.length} points
                                    </span>
                                </span>
                                {feature.active && (
                                    <Check className="size-4 text-[#267049]" />
                                )}
                            </button>
                        ))}
                    </aside>

                    <section className="overflow-hidden rounded-2xl border border-[#d5cfc2] bg-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-[#f4f1e9] px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                {drawing ? (
                                    <Edit3 className="size-4 text-[#b16a2f]" />
                                ) : (
                                    <MousePointer2 className="size-4" />
                                )}
                                {drawing
                                    ? `Dessin en cours · ${form.data.points.length} points`
                                    : 'Sélectionnez une forme pour la modifier'}
                            </div>
                            {drawing && (
                                <button
                                    onClick={() =>
                                        form.setData(
                                            'points',
                                            form.data.points.slice(0, -1),
                                        )
                                    }
                                    disabled={!form.data.points.length}
                                    className="flex items-center gap-1 text-xs font-semibold text-[#735b3b] disabled:opacity-40"
                                >
                                    <Undo2 className="size-4" /> Annuler le
                                    point
                                </button>
                            )}
                        </div>
                        <div className="mx-auto max-w-[620px] overflow-hidden rounded-xl border border-[#d7d2c7] bg-[#fbfaf6]">
                            <svg
                                ref={svgRef}
                                viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                                onClick={addPoint}
                                onPointerMove={movePoint}
                                onPointerUp={() => setDragIndex(null)}
                                onPointerLeave={() => setDragIndex(null)}
                                className={`block h-auto w-full touch-none ${drawing ? 'cursor-crosshair' : 'cursor-default'}`}
                            >
                                {features.map((feature) => {
                                    const isSelected =
                                        feature.id === selectedId;
                                    const palette = colors(
                                        feature.feature_type,
                                        isSelected,
                                    );

                                    return (
                                        <polygon
                                            key={feature.id}
                                            points={pointString(
                                                isSelected
                                                    ? form.data.points
                                                    : feature.points,
                                            )}
                                            fill={palette.fill}
                                            fillOpacity={
                                                feature.feature_type ===
                                                'limite'
                                                    ? 0.35
                                                    : 0.68
                                            }
                                            stroke={palette.stroke}
                                            strokeWidth={
                                                isSelected
                                                    ? 6
                                                    : feature.feature_type ===
                                                        'limite'
                                                      ? 4
                                                      : 2
                                            }
                                            strokeDasharray={
                                                feature.feature_type === 'bloc'
                                                    ? '8 6'
                                                    : undefined
                                            }
                                            onClick={(event) => {
                                                if (!drawing) {
                                                    event.stopPropagation();
                                                    selectFeature(feature);
                                                }
                                            }}
                                            className={
                                                !drawing ? 'cursor-pointer' : ''
                                            }
                                        />
                                    );
                                })}
                                {drawing && form.data.points.length > 1 && (
                                    <polyline
                                        points={pointString(form.data.points)}
                                        fill="none"
                                        stroke="#B56532"
                                        strokeWidth="5"
                                        strokeDasharray="10 7"
                                    />
                                )}
                                {(drawing || selected) &&
                                    form.data.points.map(([x, y], index) => (
                                        <g key={`${x}-${y}-${index}`}>
                                            <circle
                                                cx={x}
                                                cy={y}
                                                r="13"
                                                fill="#fff"
                                                stroke="#17352A"
                                                strokeWidth="5"
                                                onPointerDown={(event) => {
                                                    event.stopPropagation();
                                                    event.currentTarget.setPointerCapture(
                                                        event.pointerId,
                                                    );
                                                    setDragIndex(index);
                                                }}
                                                className="cursor-grab active:cursor-grabbing"
                                            />
                                            <text
                                                x={x}
                                                y={y + 4}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fontWeight="700"
                                                pointerEvents="none"
                                            >
                                                {index + 1}
                                            </text>
                                        </g>
                                    ))}
                            </svg>
                        </div>
                    </section>

                    <form
                        onSubmit={submit}
                        className="h-fit rounded-2xl border border-[#d9d3c6] bg-white p-5 shadow-sm"
                    >
                        <div className="mb-5 flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[#edf3ed] text-[#174a31]">
                                <Map className="size-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    {selected
                                        ? 'Modifier la zone'
                                        : 'Nouvelle zone'}
                                </h3>
                                <p className="text-xs text-[#77827b]">
                                    Coordonnées enregistrées en base
                                </p>
                            </div>
                        </div>
                        <label className="grid gap-1.5 text-sm font-semibold">
                            Nom
                            <input
                                required
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                className="h-11 rounded-xl border-2 border-[#d7d7cc] px-3 outline-none focus:border-[#267049]"
                                placeholder="Ex. Parc 9"
                            />
                            {form.errors.name && (
                                <span className="text-xs text-red-600">
                                    {form.errors.name}
                                </span>
                            )}
                        </label>
                        <label className="mt-4 grid gap-1.5 text-sm font-semibold">
                            Type
                            <select
                                value={form.data.feature_type}
                                onChange={(e) =>
                                    form.setData(
                                        'feature_type',
                                        e.target
                                            .value as Feature['feature_type'],
                                    )
                                }
                                className="h-11 rounded-xl border-2 border-[#d7d7cc] bg-white px-3"
                            >
                                {Object.entries(TYPES).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <label className="grid gap-1.5 text-sm font-semibold">
                                Surface ha
                                <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={form.data.area_ha}
                                    onChange={(e) =>
                                        form.setData('area_ha', e.target.value)
                                    }
                                    className="h-11 rounded-xl border-2 border-[#d7d7cc] px-3"
                                />
                            </label>
                            <label className="grid gap-1.5 text-sm font-semibold">
                                Surface m²
                                <input
                                    type="number"
                                    min="0"
                                    value={form.data.area_m2}
                                    onChange={(e) =>
                                        form.setData('area_m2', e.target.value)
                                    }
                                    className="h-11 rounded-xl border-2 border-[#d7d7cc] px-3"
                                />
                            </label>
                        </div>
                        <label className="mt-4 grid gap-1.5 text-sm font-semibold">
                            Ordre d’affichage
                            <input
                                type="number"
                                min="0"
                                value={form.data.sort_order}
                                onChange={(e) =>
                                    form.setData(
                                        'sort_order',
                                        Number(e.target.value),
                                    )
                                }
                                className="h-11 rounded-xl border-2 border-[#d7d7cc] px-3"
                            />
                        </label>
                        <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
                            <input
                                type="checkbox"
                                checked={form.data.active}
                                onChange={(e) =>
                                    form.setData('active', e.target.checked)
                                }
                                className="size-5 accent-[#174a31]"
                            />{' '}
                            Visible sur la homepage
                        </label>
                        {form.errors.points && (
                            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                                Il faut au moins trois points.
                            </div>
                        )}
                        <div className="mt-5 rounded-xl bg-[#f5f2eb] p-3 text-xs text-[#68746d]">
                            <strong>{form.data.points.length} sommet(s)</strong>
                            <br />
                            Cliquez sur « Nouvelle zone », puis sur la carte.
                            Les points peuvent ensuite être déplacés.
                        </div>
                        <button
                            disabled={
                                form.processing || form.data.points.length < 3
                            }
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#174a31] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Save className="size-4" /> Enregistrer la géométrie
                        </button>
                        {selected && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => selectFeature(selected)}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-[#d8d3c8] px-3 py-2.5 text-xs font-semibold"
                                >
                                    <RotateCcw className="size-4" /> Restaurer
                                </button>
                                <button
                                    type="button"
                                    onClick={remove}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-[#ead3cd] px-3 py-2.5 text-xs font-semibold text-[#a14530]"
                                >
                                    <Trash2 className="size-4" /> Supprimer
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}
