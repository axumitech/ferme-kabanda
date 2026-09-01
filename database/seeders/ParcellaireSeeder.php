<?php

namespace Database\Seeders;

use App\Models\Parcelle;
use App\Models\Site;
use Illuminate\Database\Seeder;

class ParcellaireSeeder extends Seeder
{
    public function run(): void
    {
        $k1 = Site::query()->where('code', 'K1')->value('id');
        $k2 = Site::query()->where('code', 'K2')->value('id');

        foreach (['A', 'B', 'D', 'E'] as $bloc) {
            $parent = Parcelle::query()->updateOrCreate(['code' => "K1-{$bloc}"], [
                'nom' => "Bloc {$bloc}",
                'type' => 'bloc',
                'site_id' => $k1,
                'actif' => true,
            ]);

            if ($bloc === 'B') {
                foreach (['B1', 'B2'] as $parc) {
                    Parcelle::query()->updateOrCreate(['code' => "K1-B-{$parc}"], [
                        'nom' => $parc,
                        'type' => 'parc',
                        'parent_id' => $parent->id,
                        'site_id' => $k1,
                        'actif' => true,
                        'note' => 'Surface et nombre de planches à relever sur le terrain.',
                    ]);
                }
            }
        }

        if ($k2) {
            Parcelle::query()->updateOrCreate(['code' => 'K2-BUDIMBU'], [
                'nom' => 'Budimbu',
                'type' => 'bloc',
                'site_id' => $k2,
                'actif' => true,
                'note' => 'Superficie non confirmée — recensement parcellaire à faire.',
            ]);
        }
    }
}
