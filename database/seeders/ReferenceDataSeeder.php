<?php

namespace Database\Seeders;

use App\Models\ReferenceItem;
use Illuminate\Database\Seeder;

class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->references() as $category => $labels) {
            foreach ($labels as $order => $label) {
                ReferenceItem::query()->updateOrCreate(
                    ['category' => $category, 'label' => $label],
                    ['sort_order' => $order, 'active' => true],
                );
            }
        }
    }

    /** @return array<string, list<string>> */
    private function references(): array
    {
        return [
            'parcelles' => ['Parc 1', 'Parc 2', 'Parc 3', 'Parc 4', 'Parc 5', 'Parc 6', 'Parc 7', 'Parc 8', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'D — Bananeraie', 'E — Maïs', 'Serre / Pépinière'],
            'ateliers' => ['Porcherie A — K1', 'Porcherie B — K1', 'Poulailler — K1', 'Bovins — K2', 'Pisciculture — K1'],
            'cultures' => ['Chou', 'Tomate', 'Aubergine', 'Piment', 'Gombo', 'Amarante', 'Oseille', 'Épinard', 'Laitue', 'Oignon', 'Carotte', 'Maïs', 'Bananier', 'Gingembre'],
            'agents_agri' => ['MAMENGI DINA — chef d’équipe', 'MANZIZIKA BAKALA', 'DIMASA KIOKA', 'KAZIALA MUSONGO', 'DIMALU PAULO', 'NSINGI NGIMBANI', 'MANSONI IGNACE', 'MAKABIKA BIKULA', 'Ir Evaristo CHANDA — superviseur', 'Journalier'],
            'agents_ani' => ['Ir Andy SALANI — superviseur', 'NGOVO DINGANGA AMIGO — porcher', 'ROSSY MAYUMU KIBAL', 'Gardien de bétail K2', 'Journalier'],
            'taches_agri' => ['Arrosage', 'Désherbage', 'Paillage', 'Fertilisation', 'Traitement phyto', 'Récolte', 'Semis', 'Repiquage', 'Taille / Ébourgeonnage', 'Œilletonnage', 'Préparation de planche', 'Buttage', 'Éclaircissage', 'Contrôle irrigation', 'Nettoyage des allées', 'Arrachage', 'Autre'],
            'taches_porcherie' => ['Distribution d’aliment', 'Nettoyage des loges', 'Désinfection', 'Pesée', 'Mise bas — surveillance', 'Sevrage', 'Saillie', 'Castration', 'Curage du lisier', 'Pédiluve — renouvellement', 'Réparation de loge', 'Entretien matériel', 'Autre'],
            'taches_poulailler' => ['Distribution d’aliment', 'Ramassage des œufs', 'Nettoyage des loges', 'Désinfection', 'Litière — ajout ou remplacement', 'Pesée', 'Contrôle température couvoir', 'Abattage', 'Pédiluve — renouvellement', 'Entretien matériel', 'Autre'],
            'taches_bovins' => ['Distribution d’aliment', 'Rotation de paddock', 'Abreuvement', 'Pesée', 'Parage des onglons', 'Traite', 'Curage du lisier', 'Fauche de fourrage', 'Réparation de clôture', 'Entretien matériel', 'Autre'],
            'taches_pisciculture' => ['Distribution d’aliment', 'Contrôle qualité de l’eau', 'Changement d’eau', 'Tri par taille', 'Pêche / récolte', 'Nettoyage de bac', 'Comptage', 'Entretien matériel', 'Autre'],
            'unites' => ['planches', 'pieds', 'lignes', 'm²', 'kg', 'sacs', 'litres', 'minutes', 'caisses'],
            'produits' => ['Urée 46% N', 'MOP 60% K₂O', 'NPK 13-6-27+4MgO+0,65B', 'NPK 7.5-7.5-30+3MgO', 'Sulfate d’ammonium 21-0-0+24S', 'Compost FKN', 'Cendre de bois', 'Dolomie', 'Gypse', 'HERO MECTIN', 'GLAZE', 'AMISTAR 250 SC', 'COPSTAR (cuivre)', 'Oshothane / Mancozèbe', 'TITAN+', 'Super Métalaxyl', 'KIATA', 'SPIDER', 'ZALANG'],
            'soins' => ['Vaccination', 'Déparasitage', 'Antibiotique', 'Vitamines', 'Soin de plaie', 'Autre'],
            'destinations' => ['Vente marché', 'EZHL / offtake', 'Cuisine du personnel', 'Semence / réserve', 'PERTE — invendable', 'Stock frigo'],
            'aliments_porcherie' => ['Pré-démarrage (7-12 kg)', 'Démarrage (12-25 kg)', 'Croissance (25-60 kg)', 'Finition (60-100 kg)', 'Truie gestante', 'Truie allaitante', 'Verrat', 'Provende maison porcs', 'Son de maïs', 'Son de blé', 'Tourteau palmiste', 'Tourteau soja', 'Farine de poisson', 'Premix Koudijs', 'Autre'],
            'aliments_poulailler' => ['Démarrage 0-3 semaines', 'Croissance 3-6 semaines', 'Finition 6 semaines et +', 'Aliment ponte', 'Provende maison volaille', 'Son de maïs', 'Tourteau soja', 'Farine de poisson', 'Coquilles broyées', 'Premix volaille', 'Autre'],
            'aliments_bovins' => ['Fourrage vert (Kikuyu)', 'Ensilage', 'Foin', 'Tourteau palmiste', 'Son de maïs', 'Sel minéral', 'Bloc à lécher', 'Autre'],
            'aliments_pisciculture' => ['Aliment alevin', 'Aliment grossissement', 'Aliment finition', 'Son de maïs', 'Tourteau soja', 'Farine de poisson', 'Autre'],
            'epi_types' => ['Combinaison de pulvérisation', 'Masque respiratoire A2P3', 'Cartouches filtrantes', 'Gants nitrile (phyto)', 'Lunettes de protection', 'Tablier imperméable', 'Bottes en caoutchouc', 'Gants de travail (cuir)', 'Casquette / chapeau', 'Gilet haute visibilité', 'Bottes de sécurité', 'Protection auditive', 'Combinaison de biosécurité', 'Bottes dédiées à l’atelier'],
            'tailles' => ['36', '38', '40', '42', '44', '46', '48', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'],
        ];
    }
}
