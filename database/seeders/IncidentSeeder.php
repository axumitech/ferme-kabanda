<?php

namespace Database\Seeders;

use App\Models\CategorieIncident;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['FATALITY', 'Décès', "Décès résultant d'un incident lié au travail.", 'Tout décès sur site.', 1, 'securite', true, true],
            ['LTI', 'Blessure avec arrêt de travail', "Blessure ou maladie professionnelle empêchant les tâches normales le jour suivant l'incident.", "Fracture ou entorse grave nécessitant plusieurs jours d'arrêt.", 2, 'securite', true, true],
            ['RWI', 'Blessure avec restrictions de travail', "La personne travaille avec des restrictions après l'incident.", 'Employé affecté à des tâches modifiées.', 3, 'securite', false, false],
            ['MTI', 'Blessure nécessitant un traitement médical', 'Traitement médical au-delà des premiers soins.', 'Points de suture, radiographie ou médicament sur ordonnance.', 4, 'securite', false, false],
            ['FAI', 'Blessure aux premiers soins', 'Blessure mineure traitée uniquement avec les premiers soins.', 'Petite coupure, ecchymose ou entorse légère.', 5, 'securite', false, false],
            ['DOM', 'Dommages matériels', 'Dommages aux biens, équipements, véhicules ou biens de tiers.', 'Collision ou équipement endommagé.', 4, 'surete', true, false],
            ['NEAR', 'Quasi-incident', 'Événement sans conséquence réelle qui aurait pu causer un dommage.', "Objet tombé près d'une personne.", 6, 'securite', false, false],
            ['ENV', 'Incident environnemental', 'Rejet ou événement causant ou pouvant causer un dommage environnemental.', 'Déversement de produits chimiques.', 3, 'environnement', true, false],
            ['ACT', 'Acte ou condition dangereux', "Condition ou comportement présentant un potentiel d'incident.", 'Signalement préventif.', 7, 'securite', false, false],
        ];

        foreach ($categories as [$code, $libelle, $definition, $exemples, $gravite, $nature, $investigation, $siege]) {
            CategorieIncident::query()->updateOrCreate(['code' => $code], [
                'libelle' => $libelle,
                'definition' => $definition,
                'exemples' => $exemples,
                'gravite' => $gravite,
                'nature' => $nature,
                'investigation_obligatoire' => $investigation,
                'remontee_siege' => $siege,
            ]);
        }
    }
}
