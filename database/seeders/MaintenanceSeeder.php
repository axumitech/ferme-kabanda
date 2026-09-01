<?php

namespace Database\Seeders;

use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\Site;
use Illuminate\Database\Seeder;

class MaintenanceSeeder extends Seeder
{
    public function run(): void
    {
        $siteId = Site::query()->where('code', 'K1')->value('id');

        foreach ($this->equipements() as $donnees) {
            Equipement::query()->firstOrCreate(
                ['code' => $donnees['code']],
                array_merge($donnees, ['site_id' => $siteId]),
            );
        }

        foreach ($this->infrastructures() as $donnees) {
            $entretiens = $donnees['entretiens'];
            unset($donnees['entretiens']);

            $infrastructure = Infrastructure::query()->firstOrCreate(
                ['code' => $donnees['code']],
                array_merge($donnees, ['site_id' => $siteId]),
            );

            foreach ($entretiens as [$libelle, $jours, $operations]) {
                EntretienPlanifie::query()->firstOrCreate(
                    [
                        'infrastructure_id' => $infrastructure->id,
                        'libelle' => $libelle,
                    ],
                    [
                        'type' => 'preventif',
                        'periodicite_jours' => $jours,
                        'prochain_le' => today(),
                        'operations' => $operations,
                        'actif' => true,
                    ],
                );
            }
        }
    }

    /** @return list<array<string, mixed>> */
    private function equipements(): array
    {
        $note = 'Compteur, consommation de référence et tarifs à saisir au premier relevé.';

        return [
            ['code' => 'TR-01', 'nom' => 'Tracteur New Holland TD80', 'categorie' => 'tracteur', 'marque' => 'New Holland', 'modele' => 'TD80', 'type_compteur' => 'heures', 'carburant' => 'diesel', 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'UNI-01', 'nom' => 'Unimog 4853AA09', 'categorie' => 'vehicule', 'marque' => 'Mercedes-Benz', 'modele' => 'Unimog', 'type_compteur' => 'km', 'carburant' => 'diesel', 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'LC-01', 'nom' => 'Land Cruiser 79', 'categorie' => 'vehicule', 'marque' => 'Toyota', 'modele' => 'Land Cruiser 79', 'type_compteur' => 'km', 'carburant' => 'diesel', 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'GE-01', 'nom' => 'Groupe électrogène GE-01', 'categorie' => 'groupe', 'marque' => null, 'modele' => null, 'type_compteur' => 'heures', 'carburant' => 'diesel', 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'GE-02', 'nom' => 'Groupe électrogène GE-02', 'categorie' => 'groupe', 'marque' => null, 'modele' => null, 'type_compteur' => 'heures', 'carburant' => 'diesel', 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'PI-01', 'nom' => 'Unité de pompage PI-01', 'categorie' => 'pompe', 'marque' => null, 'modele' => null, 'type_compteur' => 'heures', 'carburant' => null, 'statut' => 'disponible', 'actif' => true, 'note' => $note],
            ['code' => 'PI-02', 'nom' => 'Unité de pompage PI-02', 'categorie' => 'pompe', 'marque' => null, 'modele' => null, 'type_compteur' => 'heures', 'carburant' => null, 'statut' => 'disponible', 'actif' => true, 'note' => $note],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function infrastructures(): array
    {
        return [
            [
                'code' => 'IRR-01', 'nom' => "Canal d'irrigation principal", 'categorie' => 'irrigation',
                'etat' => 'mauvais', 'criticite' => 1, 'periodicite_inspection_jours' => 30,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true,
                'note' => 'FUITE CONSTATÉE - signalée avant la mise en service du système, non encore traitée.',
                'entretiens' => [["Curage et contrôle d'étanchéité", 90, 'Parcourir le linéaire, curer, repérer les fuites et affaissements']],
            ],
            [
                'code' => 'IRR-02', 'nom' => 'Colonne montante - refoulement', 'categorie' => 'irrigation',
                'etat' => 'moyen', 'criticite' => 1, 'periodicite_inspection_jours' => 60,
                'prochaine_inspection' => today(), 'caracteristiques' => '40 mm HDPE', 'actif' => true,
                'note' => 'PASSAGE EN 63 mm IDENTIFIÉ comme le correctif au meilleur rendement. Exécution en attente - Ir Jonas Kutuna.',
                'entretiens' => [],
            ],
            [
                'code' => 'EAU-01', 'nom' => "Pompe solaire d'irrigation", 'categorie' => 'eau',
                'etat' => 'mauvais', 'criticite' => 1, 'periodicite_inspection_jours' => 30,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true,
                'note' => 'JAMAIS ENTRETENUE depuis la mise en service. Entretien à programmer en priorité.',
                'entretiens' => [['Contrôle de la pompe et des crépines', 90, 'Débit, pression, crépine, clapet, étanchéité']],
            ],
            [
                'code' => 'ENE-01', 'nom' => 'Onduleur hybride solaire', 'categorie' => 'energie',
                'etat' => 'bon', 'criticite' => 1, 'periodicite_inspection_jours' => 90,
                'prochaine_inspection' => today(), 'caracteristiques' => 'SY2-10.2KW-48V · 14 kWh · 11 kVA', 'actif' => true,
                'note' => null,
                'entretiens' => [
                    ['Nettoyage des panneaux', 30, 'Panneaux dépoussiérés, ombrages dégagés'],
                    ['Contrôle des connexions et serrages', 180, 'Serrage des cosses, contrôle thermique, ventilation'],
                ],
            ],
            [
                'code' => 'ENE-02', 'nom' => 'Parc de batteries Dyness', 'categorie' => 'energie',
                'etat' => 'bon', 'criticite' => 1, 'periodicite_inspection_jours' => 90,
                'prochaine_inspection' => today(), 'caracteristiques' => 'Stack Dyness 48 V', 'actif' => true,
                'note' => null,
                'entretiens' => [["Relevé d'état de charge et de température", 90, "Tension par module, température, journal de l'onduleur"]],
            ],
            [
                'code' => 'BAT-01', 'nom' => 'Porcherie', 'categorie' => 'batiment',
                'etat' => 'bon', 'criticite' => 1, 'periodicite_inspection_jours' => 90,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true, 'note' => null,
                'entretiens' => [['Contrôle des loges, abreuvoirs et évacuations', 90, "Barreaux, sols, abreuvoirs, pente d'évacuation"]],
            ],
            [
                'code' => 'BAT-02', 'nom' => 'Magasin - Local A et Local B', 'categorie' => 'stockage',
                'etat' => 'bon', 'criticite' => 2, 'periodicite_inspection_jours' => 180,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true, 'note' => null,
                'entretiens' => [['Étanchéité de toiture et lutte contre les rongeurs', 180, 'Toiture, ouvertures, pièges, propreté']],
            ],
            [
                'code' => 'CLO-01', 'nom' => 'Clôture périmétrique K1', 'categorie' => 'cloture',
                'etat' => 'moyen', 'criticite' => 2, 'periodicite_inspection_jours' => 30,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true,
                'note' => 'Contrôle à rapprocher des rondes de sécurité.', 'entretiens' => [],
            ],
            [
                'code' => 'VOI-01', 'nom' => 'Pistes et accès internes', 'categorie' => 'voirie',
                'etat' => 'moyen', 'criticite' => 3, 'periodicite_inspection_jours' => 90,
                'prochaine_inspection' => today(), 'caracteristiques' => null, 'actif' => true,
                'note' => 'Praticabilité à vérifier avant chaque saison des pluies.', 'entretiens' => [],
            ],
        ];
    }
}
