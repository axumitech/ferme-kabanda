<?php

namespace Database\Seeders;

use App\Models\Departement;
use App\Models\MotifNonExecution;
use App\Models\Site;
use App\Models\Unite;
use Illuminate\Database\Seeder;

class SocleSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['K1', 'Ferme Kasangulu 1 - 19,57 ha', 'ferme'],
            ['K2', 'Budimbu Kasangulu - cultures et bovins', 'ferme'],
            ['MAISHA', 'Maisha Farm - Kinshasa', 'ferme'],
            ['LSHI', "Lubumbashi - D'Tomates", 'ferme'],
            ['SIEGE', '28 Avenue Kananga, Binza Pigeon - Kinshasa', 'bureau'],
        ] as [$code, $nom, $type]) {
            Site::query()->updateOrCreate(['code' => $code], ['nom' => $nom, 'type' => $type]);
        }

        foreach ([
            ['DG', 'Direction Générale'],
            ['AGR', 'Bureau Technique Agricole'],
            ['BTA', 'Bureau Technique Animal'],
            ['LOG', 'BTLAP - Logistique, Administration, Finance'],
            ['COM', 'Commercial'],
            ['SEC', 'Sécurité'],
            ['RH', 'Ressources Humaines'],
            ['QHSE', 'QHSE et Biosécurité'],
        ] as [$code, $nom]) {
            Departement::query()->updateOrCreate(['code' => $code], ['nom' => $nom]);
        }

        foreach ([
            ['g', 'gramme', 'masse', 1, false],
            ['kg', 'kilogramme', 'masse', 1000, false],
            ['t', 'tonne', 'masse', 1000000, false],
            ['sac_25kg', 'sac de 25 kg', 'masse', 25000, true],
            ['sac_50kg', 'sac de 50 kg', 'masse', 50000, true],
            ['ml', 'millilitre', 'volume', 1, false],
            ['l', 'litre', 'volume', 1000, false],
            ['bidon_1l', 'bidon de 1 L', 'volume', 1000, true],
            ['bidon_5l', 'bidon de 5 L', 'volume', 5000, true],
            ['bidon_20l', 'bidon de 20 L', 'volume', 20000, true],
            ['fut_200l', 'fût de 200 L', 'volume', 200000, true],
            ['u', 'unité', 'unitaire', 1, false],
            ['piece', 'pièce', 'unitaire', 1, false],
            ['paire', 'paire', 'unitaire', 2, false],
            ['boite_12', 'boîte de 12', 'unitaire', 12, true],
            ['carton_24', 'carton de 24', 'unitaire', 24, true],
            ['mm', 'millimètre', 'longueur', 1, false],
            ['m', 'mètre', 'longueur', 1000, false],
            ['rouleau_100m', 'rouleau de 100 m', 'longueur', 100000, true],
        ] as [$code, $nom, $dimension, $versBase, $conditionnement]) {
            Unite::query()->updateOrCreate(['code' => $code], [
                'nom' => $nom,
                'dimension' => $dimension,
                'vers_base' => $versBase,
                'conditionnement' => $conditionnement,
                'actif' => true,
            ]);
        }

        foreach ([
            ['PLUIE', 'Pluie ou intempérie', true, 'aucune', null, 1],
            ['INTRANT_RUPTURE', 'Intrant indisponible au magasin', true, 'article_rupture', null, 2],
            ['PANNE', "Panne d'équipement", true, 'bon_travail', null, 3],
            ['ABSENCE', 'Absence justifiée du responsable', true, 'aucune', null, 4],
            ['CONSIGNE', 'Consigne contraire de la hiérarchie', true, 'nom_hierarchie', null, 5],
            ['INCIDENT', 'Incident de sécurité', true, 'incident', null, 6],
            ['ACCES', "Accès impossible à la parcelle ou à l'atelier", true, 'aucune', null, 7],
            ['REPORT_VALIDE', 'Report autorisé par le superviseur', true, 'nom_hierarchie', null, 8],
            ['OUBLI', 'Oubli', false, 'aucune', 'Art. 2 - diligence', 20],
            ['NON_TENTEE', 'Tâche non tentée', false, 'aucune', 'Art. 2 - diligence', 21],
            ['MANQUE_TEMPS', 'Manque de temps non justifié', false, 'aucune', 'Art. 2 - diligence', 22],
            ['REFUS', "Refus d'exécuter", false, 'aucune', 'Art. 8 - conduite et hiérarchie', 23],
            ['AUCUN_MOTIF', 'Aucun motif fourni', false, 'aucune', 'Art. 2 et Art. 8', 24],
        ] as [$code, $libelle, $recevable, $preuve, $article, $ordre]) {
            MotifNonExecution::query()->updateOrCreate(['code' => $code], [
                'libelle' => $libelle,
                'recevable' => $recevable,
                'preuve_requise' => $preuve,
                'article_reglement' => $article,
                'ordre' => $ordre,
            ]);
        }
    }
}
