<?php

namespace Database\Seeders;

use App\Models\MatiereActive;
use Illuminate\Database\Seeder;

class MatiereActiveSeeder extends Seeder
{
    public function run(): void
    {
        $interdit = 'Résistance confirmée sur le site de Kasangulu — FRAC groupe 1 proscrit à FKN.';
        foreach ([
            ['Carbendazime', 'fongicide', '1', null, null, 'Benzimidazole — inhibiteur de la β-tubuline', true],
            ['Bénomyl', 'fongicide', '1', null, null, 'Benzimidazole — inhibiteur de la β-tubuline', true],
            ['Thiophanate-méthyl', 'fongicide', '1', null, null, 'Benzimidazole (précurseur) — inhibiteur de la β-tubuline', true],
            ['Thiabendazole', 'fongicide', '1', null, null, 'Benzimidazole — inhibiteur de la β-tubuline', true],
            ['Mancozèbe', 'fongicide', 'M03', null, null, 'Multisite (dithiocarbamate) — faible risque de résistance', false],
            ['Oxychlorure de cuivre', 'fongicide', 'M01', null, null, 'Multisite (cuivre) — faible risque de résistance', false],
            ['Chlorothalonil', 'fongicide', 'M05', null, null, 'Multisite (chloronitrile)', false],
            ['Métalaxyl-M', 'fongicide', '4', null, null, 'Phénylamide — systémique, mildious', false],
            ['Azoxystrobine', 'fongicide', '11', null, null, 'QoI — inhibiteur externe du quinone', false],
            ['Difénoconazole', 'fongicide', '3', null, null, 'Triazole — inhibiteur de la déméthylation (DMI)', false],
            ['Lambda-cyhalothrine', 'insecticide', null, '3A', null, 'Pyréthrinoïde — modulateur du canal sodium', false],
            ['Deltaméthrine', 'insecticide', null, '3A', null, 'Pyréthrinoïde — modulateur du canal sodium', false],
            ['Imidaclopride', 'insecticide', null, '4A', null, 'Néonicotinoïde — agoniste nAChR', false],
            ['Abamectine', 'insecticide', null, '6', null, 'Avermectine — activateur des canaux chlore', false],
            ['Spinosad', 'insecticide', null, '5', null, 'Spinosyne — modulateur allostérique nAChR', false],
            ['Bacillus thuringiensis', 'insecticide', null, '11A', null, 'Biologique — perturbateur de la membrane intestinale', false],
            ['Huile de neem (azadirachtine)', 'insecticide', null, 'UN', null, 'Botanique — perturbateur de croissance', false],
            ['Glyphosate', 'herbicide', null, null, '9', 'Inhibiteur de l\'EPSP synthase', false],
            ['Paraquat', 'herbicide', null, null, '22', 'Détourneur d\'électrons du photosystème I', false],
        ] as [$nom, $famille, $frac, $irac, $hrac, $mode, $bloque]) {
            MatiereActive::query()->updateOrCreate(['nom' => $nom], [
                'famille' => $famille,
                'groupe_frac' => $frac,
                'groupe_irac' => $irac,
                'groupe_hrac' => $hrac,
                'mode_action' => $mode,
                'interdit' => $bloque,
                'motif_interdiction' => $bloque ? $interdit : null,
                'actif' => true,
            ]);
        }
    }
}
