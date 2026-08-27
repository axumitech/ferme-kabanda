import FarmApp from './farm-app';

type Reference = { id: number; label: string; description?: string | null };
type MapFeature = {
    id: number;
    name: string;
    feature_type: 'limite' | 'parc' | 'bloc' | 'bati';
    area_ha: string | null;
    area_m2: number | null;
    points: [number, number][];
};

export default function FieldApp({
    references,
    mapFeatures,
}: {
    references: Record<string, Reference[]>;
    mapFeatures: MapFeature[];
}) {
    return <FarmApp references={references} mapFeatures={mapFeatures} />;
}
