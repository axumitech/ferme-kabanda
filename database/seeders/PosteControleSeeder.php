<?php

namespace Database\Seeders;

use App\Models\PosteControle;
use App\Models\Site;
use Illuminate\Database\Seeder;

class PosteControleSeeder extends Seeder
{
    public function run(): void
    {
        $siteId = Site::query()->where('code', 'K1')->value('id') ?? Site::query()->value('id');

        foreach ([
            ['PC-01', 'Portail principal', 1],
            ['PC-02', 'Magasin — Local A et B', 2],
            ['PC-03', 'Porcherie', 3],
            ['PC-04', 'Station de pompage', 4],
            ['PC-05', 'Hangar machines', 5],
            ['PC-06', 'Périmètre arrière', 6],
        ] as [$code, $nom, $ordre]) {
            PosteControle::query()->updateOrCreate(['code' => $code], [
                'nom' => $nom,
                'ordre' => $ordre,
                'site_id' => $siteId,
                'actif' => true,
            ]);
        }
    }
}
