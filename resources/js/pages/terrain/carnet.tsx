/** FKN — Point d’entrée du carnet terrain partagé, hors-ligne. */

import { Head, usePage } from '@inertiajs/react';
import TerrainNotebook from '@/components/terrain-notebook';

export default function CarnetTerrain() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Carnet terrain" />
            <TerrainNotebook key={auth.user.id} userId={auth.user.id} />
        </>
    );
}
