<?php

namespace Database\Seeders;

use App\Models\Culture;
use Illuminate\Database\Seeder;

class CultureSeeder extends Seeder
{
    public function run(): void
    {
        $delais = [
            'Solanacées' => 3,
            'Crucifères' => 3,
            'Alliacées' => 2,
            'Apiacées' => 2,
            'Malvacées' => 2,
            'Amaranthacées' => 1,
        ];

        foreach ([
            ['CHOU', 'Chou', 'Crucifères', 'planches', 'kg'],
            ['TOMATE', 'Tomate', 'Solanacées', 'pieds', 'kg'],
            ['AUBERGINE', 'Aubergine', 'Solanacées', 'pieds', 'kg'],
            ['PIMENT', 'Piment', 'Solanacées', 'pieds', 'kg'],
            ['GOMBO', 'Gombo', 'Malvacées', 'pieds', 'kg'],
            ['AMARANTE', 'Amarante', 'Amaranthacées', 'planches', 'kg'],
            ['OSEILLE', 'Oseille', 'Polygonacées', 'planches', 'kg'],
            ['EPINARD', 'Épinard', 'Amaranthacées', 'planches', 'kg'],
            ['LAITUE', 'Laitue', 'Astéracées', 'planches', 'kg'],
            ['OIGNON', 'Oignon', 'Alliacées', 'planches', 'kg'],
            ['CAROTTE', 'Carotte', 'Apiacées', 'planches', 'kg'],
            ['MAIS', 'Maïs', 'Graminées', 'lignes', 'kg'],
            ['BANANIER', 'Bananier', 'Musacées', 'pieds', 'régimes'],
            ['GINGEMBRE', 'Gingembre', 'Zingibéracées', 'planches', 'kg'],
        ] as [$code, $nom, $famille, $uniteTravail, $uniteRecolte]) {
            Culture::query()->updateOrCreate(['code' => $code], [
                'nom' => $nom,
                'famille' => $famille,
                'delai_rotation' => $delais[$famille] ?? null,
                'unite_recolte' => $uniteRecolte,
                'unite_travail' => $uniteTravail,
                'actif' => true,
            ]);
        }
    }
}
