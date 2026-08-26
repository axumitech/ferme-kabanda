/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

const csrfToken = () =>
    document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content') || '';

/* La maquette d'origine utilisait window.storage. Ce pont conserve cette API,
   tout en orientant les données métier vers les tables Laravel normalisées. */
window.storage = {
    async get(key) {
        if (key === 'articles') {
            const response = await fetch('/inventory/items', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok)
                throw new Error("Lecture de l'inventaire impossible");
            const data = await response.json();
            return { value: JSON.stringify(data.items) };
        }
        if (key === 'stock') {
            const response = await fetch('/inventory/product-stocks', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('Lecture du stock impossible');
            const data = await response.json();
            return { value: JSON.stringify(data.stocks) };
        }
        if (key === 'epi_dotations') {
            const response = await fetch('/inventory/material-assignments', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok)
                throw new Error('Lecture des attributions impossible');
            const data = await response.json();
            return { value: JSON.stringify(data.assignments) };
        }
        const response = await fetch(`/farm-data/${encodeURIComponent(key)}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Lecture impossible');
        return response.json();
    },
    async set(key, value) {
        const normalizedEndpoint =
            key === 'articles'
                ? '/inventory/items'
                : key === 'stock'
                  ? '/inventory/product-stocks'
                  : key === 'epi_dotations'
                    ? '/inventory/material-assignments'
                    : null;
        const payload = normalizedEndpoint
            ? key === 'articles'
                ? { items: JSON.parse(value) }
                : key === 'stock'
                  ? { stocks: JSON.parse(value) }
                  : { assignments: JSON.parse(value) }
            : { value };
        const response = await fetch(
            normalizedEndpoint || `/farm-data/${encodeURIComponent(key)}`,
            {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify(payload),
            },
        );
        if (!response.ok) throw new Error('Enregistrement impossible');
        return response.json();
    },
    async list(prefix = '') {
        const response = await fetch(
            `/farm-data?prefix=${encodeURIComponent(prefix)}`,
            {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            },
        );
        if (!response.ok) throw new Error('Liste indisponible');
        return response.json();
    },
};

/* ═════════ RÉFÉRENTIELS ═════════ */
const AGENTS_AGRI = [
    "MAMENGI DINA — chef d'équipe",
    'MANZIZIKA BAKALA',
    'DIMASA KIOKA',
    'KAZIALA MUSONGO',
    'DIMALU PAULO',
    'NSINGI NGIMBANI',
    'MANSONI IGNACE',
    'MAKABIKA BIKULA',
    'Ir Evaristo CHANDA — superviseur',
    'Journalier',
    'Autre',
];
const AGENTS_ANI = [
    'Ir Andy SALANI — superviseur',
    'NGOVO DINGANGA AMIGO — porcher',
    'ROSSY MAYUMU KIBAL',
    'Gardien de bétail K2',
    'Journalier',
    'Autre',
];
const PARCELLES = [
    'Parc 1',
    'Parc 2',
    'Parc 3',
    'Parc 4',
    'Parc 5',
    'Parc 6',
    'Parc 7',
    'Parc 8',
    'A1',
    'A2',
    'A3',
    'B1',
    'B2',
    'B3',
    'D — Bananeraie',
    'E — Maïs',
    'Serre / Pépinière',
];
const ATELIERS = [
    'Porcherie A — K1',
    'Porcherie B — K1',
    'Poulailler — K1',
    'Bovins — K2',
    'Pisciculture — K1',
];

/* Les deux porcheries partagent les mêmes tâches et les mêmes aliments : on
   déduit le type de l'atelier plutôt que de dupliquer les listes. */
const TYPE_ATELIER = (a = '') =>
    a.startsWith('Porcherie')
        ? 'Porcherie'
        : a.startsWith('Poulailler')
          ? 'Poulailler'
          : a.startsWith('Bovins')
            ? 'Bovins K2'
            : 'Pisciculture';
const CULTURES = [
    'Chou',
    'Tomate',
    'Aubergine',
    'Piment',
    'Gombo',
    'Amarante',
    'Oseille',
    'Épinard',
    'Laitue',
    'Oignon',
    'Carotte',
    'Maïs',
    'Bananier',
    'Gingembre',
];
const FAMILLE = {
    Tomate: 'Solanacées',
    Aubergine: 'Solanacées',
    Piment: 'Solanacées',
    Chou: 'Crucifères',
    Oignon: 'Alliacées',
    Carotte: 'Apiacées',
    Amarante: 'Amaranthacées',
    Épinard: 'Amaranthacées',
    Oseille: 'Polygonacées',
    Gombo: 'Malvacées',
    Laitue: 'Astéracées',
    Maïs: 'Graminées',
    Bananier: 'Musacées',
    Gingembre: 'Zingibéracées',
};
const DELAI_FAM = {
    Solanacées: 3,
    Crucifères: 3,
    Alliacées: 2,
    Apiacées: 2,
    Malvacées: 2,
    Amaranthacées: 1,
};
const UNITES = [
    'planches',
    'pieds',
    'lignes',
    'm²',
    'kg',
    'sacs',
    'litres',
    'minutes',
    'caisses',
];

/* Unités proposées selon la tâche — évite « 8 litres de désherbage » */
const UNITES_TACHE = {
    Arrosage: ['minutes', 'litres'],
    Désherbage: ['planches', 'lignes', 'm²'],
    Paillage: ['planches', 'brouettes', 'm²'],
    Fertilisation: ['planches', 'pieds', 'kg'],
    'Traitement phyto': ['planches', 'cuves', 'litres'],
    Récolte: ['kg', 'caisses', 'régimes'],
    Semis: ['planches', 'plateaux', 'g'],
    Repiquage: ['planches', 'plants'],
    'Taille / Ébourgeonnage': ['plants', 'planches'],
    Œilletonnage: ['pieds'],
    'Préparation de planche': ['planches'],
    Buttage: ['planches', 'lignes', 'pieds'],
    Éclaircissage: ['planches', 'lignes'],
    'Contrôle irrigation': ['rampes', 'minutes'],
    'Nettoyage des allées': ['allées', 'm²'],
    Arrachage: ['plants', 'planches'],
    "Distribution d'aliment": ['kg', 'sacs'],
    'Nettoyage des loges': ['loges', 'minutes'],
    Désinfection: ['loges', 'm²', 'litres'],
    Pesée: ['animaux'],
    'Curage du lisier': ['brouettes', 'kg', 'm³'],
    'Ramassage des œufs': ['œufs', 'plateaux'],
    'Litière — ajout ou remplacement': ['sacs', 'm²'],
    'Contrôle température couvoir': ['relevés'],
    Abattage: ['animaux'],
    'Rotation de paddock': ['paddocks'],
    Abreuvement: ['litres', 'minutes'],
    'Parage des onglons': ['animaux'],
    Traite: ['litres'],
    'Fauche de fourrage': ['bottes', 'kg'],
    'Réparation de clôture': ['mètres'],
    "Contrôle qualité de l'eau": ['relevés', 'bacs'],
    "Changement d'eau": ['bacs', 'litres'],
    'Tri par taille': ['bacs', 'animaux'],
    'Pêche / récolte': ['kg', 'animaux'],
    'Nettoyage de bac': ['bacs'],
    Comptage: ['animaux'],
    'Mise bas — surveillance': ['truies', 'porcelets'],
    Sevrage: ['porcelets'],
    Saillie: ['truies'],
    Castration: ['porcelets'],
    'Pédiluve — renouvellement': ['pédiluves'],
    'Réparation de loge': ['loges'],
    'Entretien matériel': ['minutes'],
    Autre: UNITES,
};
const TACHES = [
    'Arrosage',
    'Désherbage',
    'Paillage',
    'Fertilisation',
    'Traitement phyto',
    'Récolte',
    'Semis',
    'Repiquage',
    'Taille / Ébourgeonnage',
    'Œilletonnage',
    'Préparation de planche',
    'Buttage',
    'Éclaircissage',
    'Contrôle irrigation',
    'Nettoyage des allées',
    'Arrachage',
    'Autre',
];

/* Tâches proposées selon l'atelier — on ne trait pas un porc, on ne sèvre pas un poisson */
const TACHES_ATELIER = {
    Porcherie: [
        "Distribution d'aliment",
        'Nettoyage des loges',
        'Désinfection',
        'Pesée',
        'Mise bas — surveillance',
        'Sevrage',
        'Saillie',
        'Castration',
        'Curage du lisier',
        'Pédiluve — renouvellement',
        'Réparation de loge',
        'Entretien matériel',
        'Autre',
    ],
    Poulailler: [
        "Distribution d'aliment",
        'Ramassage des œufs',
        'Nettoyage des loges',
        'Désinfection',
        'Litière — ajout ou remplacement',
        'Pesée',
        'Contrôle température couvoir',
        'Abattage',
        'Pédiluve — renouvellement',
        'Entretien matériel',
        'Autre',
    ],
    'Bovins K2': [
        "Distribution d'aliment",
        'Rotation de paddock',
        'Abreuvement',
        'Pesée',
        'Parage des onglons',
        'Traite',
        'Curage du lisier',
        'Fauche de fourrage',
        'Réparation de clôture',
        'Entretien matériel',
        'Autre',
    ],
    Pisciculture: [
        "Distribution d'aliment",
        "Contrôle qualité de l'eau",
        "Changement d'eau",
        'Tri par taille',
        'Pêche / récolte',
        'Nettoyage de bac',
        'Comptage',
        'Entretien matériel',
        'Autre',
    ],
};

/* Aliments proposés selon l'atelier — les phases porcines ne s'affichent pas au poulailler */
const ALIM_ATELIER = {
    Porcherie: [
        'Pré-démarrage (7-12 kg)',
        'Démarrage (12-25 kg)',
        'Croissance (25-60 kg)',
        'Finition (60-100 kg)',
        'Truie gestante',
        'Truie allaitante',
        'Verrat',
        'Provende maison porcs',
        'Son de maïs',
        'Son de blé',
        'Tourteau palmiste',
        'Tourteau soja',
        'Farine de poisson',
        'Premix Koudijs',
        'Autre',
    ],
    Poulailler: [
        'Démarrage 0-3 semaines',
        'Croissance 3-6 semaines',
        'Finition 6 semaines et +',
        'Aliment ponte',
        'Provende maison volaille',
        'Son de maïs',
        'Tourteau soja',
        'Farine de poisson',
        'Coquilles broyées',
        'Premix volaille',
        'Autre',
    ],
    'Bovins K2': [
        'Fourrage vert (Kikuyu)',
        'Ensilage',
        'Foin',
        'Tourteau palmiste',
        'Son de maïs',
        'Sel minéral',
        'Bloc à lécher',
        'Autre',
    ],
    Pisciculture: [
        'Aliment alevin',
        'Aliment grossissement',
        'Aliment finition',
        'Son de maïs',
        'Tourteau soja',
        'Farine de poisson',
        'Autre',
    ],
};

const SOINS = [
    'Vaccination',
    'Déparasitage',
    'Antibiotique',
    'Vitamines',
    'Soin de plaie',
    'Autre',
];
const DESTINATIONS = [
    'Vente marché',
    'EZHL / offtake',
    'Cuisine du personnel',
    'Semence / réserve',
    'PERTE — invendable',
    'Stock frigo',
];

/* Doses de référence, groupes de résistance et délais avant récolte */
const REF = {
    'Urée 46% N': { d: 120, u: 'g/planche', dar: 0 },
    'MOP 60% K₂O': { d: 100, u: 'g/planche', dar: 0 },
    'NPK 13-6-27+4MgO+0,65B': { d: 200, u: 'g/planche', dar: 0, max2: true },
    'NPK 7.5-7.5-30+3MgO': { d: 200, u: 'g/planche', dar: 0 },
    "Sulfate d'ammonium 21-0-0+24S": { d: 130, u: 'g/planche', dar: 0 },
    'Compost FKN': { d: 10000, u: 'g/planche', dar: 0 },
    'Cendre de bois': { d: 200, u: 'g/planche', dar: 0 },
    Dolomie: { d: 3000, u: 'g/planche', dar: 0 },
    Gypse: { d: 500, u: 'g/planche', dar: 0 },
    'HERO MECTIN': { d: 0.3, u: 'mL/L', g: 'IRAC 6+15', dar: 7, saison1: true },
    GLAZE: { d: 1, u: 'mL/L', g: 'FRAC 11+3', dar: 14 },
    'AMISTAR 250 SC': { d: 0.8, u: 'mL/L', g: 'FRAC 11', dar: 7 },
    'COPSTAR (cuivre)': { d: 3, u: 'mL/L', g: 'FRAC M1', dar: 3 },
    'Oshothane / Mancozèbe': { d: 2.5, u: 'g/L', g: 'FRAC M3', dar: 14 },
    'TITAN+': { d: 2.5, u: 'g/L', g: 'FRAC 4+M3', dar: 14 },
    'Super Métalaxyl': { d: 2, u: 'g/L', g: 'FRAC 4', dar: 14 },
    KIATA: { d: 0.5, u: 'mL/L', g: 'IRAC 4A', dar: 14 },
    SPIDER: { d: 0.25, u: 'g/L', g: 'IRAC 4A', dar: 14 },
    ZALANG: { d: 0.5, u: 'mL/L', g: 'IRAC 3A', dar: 7 },
};
const PRODUITS = Object.keys(REF);
const INTERDITS = [
    'DAP',
    'PROTEKT',
    'THIOMEX',
    'SAAF',
    'CARBENDAZ',
    'THIOPHANATE',
];

/* Calendriers J0 — issus des fiches de culture FKN */
const CAL = {
    Chou: [
        [0, 'Repiquage', '45 plants/planche à 45×45 cm · arroser 0,5 L/plant'],
        [0, 'Cuivre foliaire', 'COPSTAR 3 mL/L'],
        [7, 'Fertilisation 1', 'Urée 120 g/planche'],
        [7, 'Remplacer les manquants', ''],
        [14, 'Désherbage + paillage', '5-8 cm'],
        [14, 'Fertilisation 2', 'Urée 120 g/planche'],
        [28, 'Fertilisation 3', 'Urée 120 g + MOP 80 g'],
        [30, 'Traitement 1', 'GLAZE 1 mL/L — DAR 14 j'],
        [45, 'Fertilisation 4', 'NPK 200 g/planche'],
        [45, 'Traitement 2', 'Mancozèbe 2,5 g/L — groupe différent'],
        [75, 'DÉBUT RÉCOLTE', 'Presser la pomme : ferme = prête'],
    ],
    Tomate: [
        [0, 'Repiquage', '37 plants/planche à 60×45 cm · après 15h00'],
        [0, 'Cuivre foliaire', 'COPSTAR 3 mL/L'],
        [7, 'Fertilisation 1', 'Urée 60 g + MOP 100 g'],
        [14, 'Désherbage + paillage', 'Évite le cul noir'],
        [21, 'TUTEURAGE', 'Un tuteur par plant'],
        [25, 'Traitement 1', 'GLAZE 1 mL/L — préventif'],
        [35, 'Ébourgeonnage', 'Lame désinfectée entre chaque plant'],
        [40, 'Fertilisation 2', 'NPK 250 g + MOP 100 g'],
        [45, 'Traitement 2', 'Mancozèbe 2,5 g/L'],
        [55, 'Traitement 3', 'GLAZE 1 mL/L'],
        [75, 'DÉBUT RÉCOLTE', 'Au tournant de couleur, avant 9h00'],
        [
            90,
            'NE PAS ARRACHER',
            'Trinity est indéterminée : continuer à nourrir et tailler',
        ],
    ],
    Aubergine: [
        [0, 'Repiquage', '33 plants/planche à 60×50 cm'],
        [14, 'Désherbage + paillage', ''],
        [21, 'Fertilisation 1', 'Urée 60 g + MOP 80 g'],
        [30, 'Traitement 1', 'GLAZE 1 mL/L'],
        [45, 'Fertilisation 2', 'NPK 250 g/planche'],
        [50, 'Traitement 2', 'Mancozèbe 2,5 g/L'],
        [80, 'DÉBUT RÉCOLTE', 'Peau BRILLANTE · tous les 3-4 jours'],
    ],
    Piment: [
        [0, 'Repiquage', '50 plants/planche à 50×40 cm'],
        [14, 'Désherbage + paillage', ''],
        [21, 'Fertilisation 1', 'Urée 60 g/planche'],
        [30, 'Traitement 1', 'GLAZE 1 mL/L'],
        [45, 'Fertilisation 2', 'NPK 250 g/planche'],
        [90, 'DÉBUT RÉCOLTE', 'GANTS obligatoires'],
    ],
    Gombo: [
        [0, 'Semis direct', '2 graines/poquet à 60×30 cm'],
        [10, 'DÉMARIAGE', 'Un seul plant par poquet'],
        [14, 'Désherbage + paillage', ''],
        [21, 'Fertilisation 1', 'Urée 100 g/planche'],
        [30, 'Traitement 1', 'GLAZE 1 mL/L'],
        [40, 'Fertilisation 2', 'NPK 250 g/planche'],
        [55, 'RÉCOLTE TOUS LES 2 JOURS', 'Gousses de 7-10 cm'],
    ],
    Amarante: [
        [0, 'Semis direct', 'Lignes à 20 cm · semer CLAIR'],
        [7, 'ÉCLAIRCISSAGE', '10 cm entre plants'],
        [14, 'Fertilisation', 'Urée 100 g/planche puis arroser'],
        [30, 'PREMIÈRE COUPE', 'À 10 cm du sol'],
        [30, 'Ressemer une planche', 'Toutes les 2-3 semaines'],
    ],
    Laitue: [
        [0, 'Repiquage', '16 plants/planche à 25×25 cm · ombrage 50 %'],
        [14, 'Fertilisation', 'Urée 80 g/planche'],
        [30, 'Fertilisation 2', 'Urée 80 g/planche'],
        [55, 'RÉCOLTE', 'Tôt le matin · livrer le jour même'],
    ],
    Oignon: [
        [0, 'Repiquage', '10×10 cm — NE PAS enterrer le collet'],
        [14, 'Désherbage manuel', 'À la main'],
        [21, 'Fertilisation 1', 'Urée 80 g/planche'],
        [45, 'Fertilisation 2', 'NPK 250 g — bulbaison'],
        [90, "RÉDUIRE L'ARROSAGE", ''],
        [90, 'PLUS AUCUN AZOTE', 'Ruine la conservation'],
        [110, "ARRÊT TOTAL DE L'EAU", ''],
        [120, 'RÉCOLTE', "Puis séchage 2 semaines à l'ombre"],
    ],
    Carotte: [
        [0, 'Semis direct', 'Lignes à 20 cm · 1 cm de profondeur'],
        [0, 'Bore', 'BORAX 15 g/planche'],
        [14, 'Maintenir humide', 'Levée 10-14 jours'],
        [21, 'DÉMARIAGE', '5 cm entre plants'],
        [30, 'Désherbage manuel', 'Ne jamais biner profond'],
        [35, 'Fertilisation', 'NPK 200 g + MOP 100 g'],
        [60, 'Buttage des collets', ''],
        [90, 'RÉCOLTE', "Arracher une carotte témoin d'abord"],
    ],
    Maïs: [
        [0, 'Semis', '75×25 cm, 3-5 cm de profondeur'],
        [10, 'Contrôle de levée', 'COMPTER les plants sur 10 m'],
        [14, 'Premier sarclage', ''],
        [21, 'Fertilisation 1', 'Urée 150 g + MOP 100 g'],
        [35, 'Sarclage + BUTTAGE', 'Fertilisation 2 : urée 150 g + MOP 60 g'],
        [45, 'Fertilisation 3', 'Urée 80 g — DERNIER azote'],
        [50, 'PLUS AUCUN AZOTE', 'Panicule sortie'],
        [50, 'IRRIGATION PRIORITAIRE', 'Stade le plus sensible'],
        [100, "Réduire l'irrigation", ''],
        [110, 'RÉCOLTE', 'PESER SÉPARÉMENT SC419 et local'],
    ],
    Bananier: [
        [0, 'Plantation', 'Trou 60×60×60 · compost 10 kg + dolomie 500 g'],
        [0, 'Paillage', 'Rayon 50 cm'],
        [30, 'Fertilisation mois 1-3', 'Urée 40 g + MOP 50 g par pied'],
        [120, 'Fertilisation mois 4-6', 'Urée 65 g + MOP 90 g par pied'],
        [120, 'ŒILLETONNAGE', 'MÈRE + FILLE + PETITE-FILLE seulement'],
        [210, 'PIC DE POTASSIUM', 'Urée 100 g + MOP 150 g par pied'],
        [300, 'Déclochage', 'Casser la fleur mâle À LA MAIN'],
        [310, 'Ensachage + tuteurage', ''],
        [365, 'RÉCOLTE', 'Doigts aux 3/4 arrondis · à 2 personnes'],
    ],
    Gingembre: [
        [0, 'Plantation', '25×20 cm, bourgeon vers le haut'],
        [0, 'PAILLAGE IMMÉDIAT', '5-8 cm'],
        [60, 'Fertilisation 1', 'Urée 80 g/planche'],
        [90, 'BUTTAGE', ''],
        [120, 'Fertilisation 2', 'NPK 200 g/planche'],
        [150, 'Buttage 2', ''],
        [180, 'Fertilisation 3', 'MOP 100 g/planche'],
        [240, "ARRÊT DE L'ARROSAGE", ''],
        [270, 'RÉCOLTE', 'Arracher À LA FOURCHE'],
    ],
    Oseille: [
        [0, 'Semis ou repiquage', '30×30 cm'],
        [14, 'Désherbage + paillage', ''],
        [21, 'Fertilisation', 'Urée 100 g/planche'],
        [45, 'COUPE', 'LAISSER LE CŒUR'],
    ],
    Épinard: [
        [0, 'Semis direct', 'Lignes à 20-30 cm'],
        [10, 'Éclaircissage', '20 cm'],
        [14, 'Désherbage + paillage', ''],
        [21, 'Fertilisation', 'Urée 100 g/planche'],
        [30, 'COUPE CONTINUE', ''],
    ],
};
const RECUR = {
    AGRI: {
        Quotidien: [
            "Tournée d'inspection (06h15)",
            'Arroser la pépinière — LE MATIN',
            'Récolte pour la cuisine',
            'Relever le pluviomètre',
            'Remplir la fiche au fur et à mesure',
        ],
        Hebdomadaire: [
            'LUNDI — contrôle irrigation, fiche signée',
            'MARDI — désherbage et paillage',
            'MERCREDI — engrais',
            'JEUDI — récolte et post-récolte',
            'VENDREDI — préparation des planches',
            'SAMEDI — rattrapage + formation',
        ],
        Mensuel: [
            'Inventaire du magasin',
            'Recharge du paillage',
            "Relevé des durées d'irrigation",
            'Bilan des récoltes en kg',
            'Entretien du matériel',
        ],
        Trimestriel: [
            'Revue du plan de culture et rotations',
            'Contrôle du registre phytosanitaire',
            'Point sur les stocks',
            'Évaluation des équipes',
        ],
        Annuel: [
            'ANALYSE DE SOL — un composite par parc',
            'Audit de la palmeraie',
            'Inventaire général',
            'Révision du plan BTAgri',
            'Contre-analyse : P a-t-il baissé ?',
        ],
    },
    ANI: {
        Quotidien: [
            'Rations aux heures fixes',
            'Eau propre — vérifier les abreuvoirs',
            'Observation : appétit, démarche, yeux',
            'Signaler tout animal isolé',
            'Nettoyage des loges',
        ],
        Hebdomadaire: [
            'Pesées de contrôle',
            'Rotation des paddocks',
            'Nettoyage et désinfection',
            'Pédiluves renouvelés',
        ],
        Mensuel: [
            'Comptage complet du cheptel',
            'Fumier livré au compost',
            "Contrôle des stocks d'aliments",
            'Visite vétérinaire',
        ],
        Trimestriel: [
            'Programme de vaccination',
            'Bilan naissances / mortalités',
            'Revue des rations',
        ],
        Annuel: [
            'INVENTAIRE ANNUEL DU CHEPTEL',
            'Bilan sanitaire',
            'Renouvellement du reproducteur',
            'Révision du plan BT Animal',
        ],
    },
};

/* Fond de plan — polygones issus du relevé GPS FKN_K1, projetés en coordonnées SVG.
   Emprise mesurée 19,57 ha. Les Parcs 1 à 8 sont le découpage officiel ;
   A1-A3, B1-B3, D et E sont des sous-blocs situés à l'intérieur. */
const CARTE_H = 1373;
const CARTE = [
    {
        n: 'Ferme Kasangulu 1',
        t: 'limite',
        ha: 19.573,
        p: '595.1,1372.5 623.7,1321.7 629.1,1316.2 632.3,1310.6 637.3,1301.5 638.7,1293.3 642.0,1287.6 642.8,1282.9 644.7,1272.2 648.4,1263.9 649.1,1260.3 650.9,1256.8 653.5,1248.3 655.5,1243.5 658.7,1238.7 662.5,1230.2 663.7,1224.0 665.0,1216.6 665.7,1212.8 666.4,1209.1 669.8,1202.9 671.9,1197.9 675.2,1186.5 677.3,1181.4 680.3,1171.1 687.2,1159.6 699.6,1138.8 722.5,1083.5 756.7,999.4 789.6,935.1 791.4,883.9 807.6,826.8 813.7,773.3 828.9,725.6 862.5,667.4 893.6,623.7 940.4,565.4 968.4,503.5 963.5,458.2 971.7,379.3 967.5,339.2 1000.0,281.1 31.4,60.8 3.4,68.1 17.4,154.8 0.0,237.4 17.1,302.0 80.3,365.8 86.9,399.3 68.2,508.9 38.6,600.7 77.7,717.5 83.7,778.9 198.7,994.8 130.1,1230.2 118.8,1288.4 595.1,1372.5',
    },
    {
        n: 'Parc 1',
        t: 'parc',
        ha: 0.554,
        p: '391.8,1202.8 370.4,1226.8 391.4,1329.5 557.0,1353.7 580.1,1283.0 554.8,1262.6 563.8,1213.8 540.4,1222.5 523.1,1197.5 467.6,1208.7 431.5,1216.6 391.8,1202.8',
    },
    {
        n: 'Parc 2',
        t: 'parc',
        ha: 1.516,
        p: '503.2,993.7 527.0,994.7 532.5,986.5 533.8,968.8 545.4,948.1 562.1,934.5 563.5,922.7 559.3,912.0 546.7,886.4 539.9,888.3 515.8,840.9 476.1,846.1 335.2,808.7 107.3,785.9 213.8,992.4 503.2,993.7',
    },
    {
        n: 'Parc 3',
        t: 'parc',
        ha: 2.744,
        p: '649.1,560.7 753.3,263.1 206.8,123.3 154.4,326.7 229.2,329.2 271.6,333.1 325.6,345.5 379.2,367.4 419.1,389.2 478.8,413.7 487.4,406.4 507.1,414.8 520.4,422.2 539.0,432.9 554.0,442.6 562.2,449.8 581.7,479.2 595.3,495.1 636.0,574.5 649.1,560.7',
    },
    {
        n: 'Parc 4',
        t: 'parc',
        ha: 2.134,
        p: '636.5,576.0 798.0,705.2 814.5,716.5 933.4,524.6 951.1,502.4 957.5,478.5 962.0,277.8 756.9,264.1 697.6,454.2 670.1,518.1 663.3,540.6 656.2,559.6 636.5,576.0',
    },
    {
        n: 'Parc 5',
        t: 'parc',
        ha: 0.634,
        p: '69.2,527.2 46.2,620.5 64.7,680.5 87.3,771.9 95.5,774.2 127.7,616.1 208.3,601.7 236.4,561.3 230.4,528.8 196.0,488.9 76.7,466.5 69.2,527.2',
    },
    {
        n: 'Parc 6',
        t: 'parc',
        ha: 1.081,
        p: '24.1,150.6 8.6,214.2 9.1,255.0 32.0,306.7 55.7,339.4 149.6,328.8 193.2,148.4 185.4,132.1 168.3,126.4 153.2,119.1 145.8,107.9 194.2,98.5 214.6,69.9 312.8,38.7 361.3,16.7 296.7,0.0 16.8,94.9 24.1,150.6',
    },
    {
        n: 'Parc 7',
        t: 'parc',
        ha: 4.282,
        p: '200.0,485.5 234.5,528.7 240.8,563.4 210.4,606.4 131.1,618.4 98.2,774.8 105.6,781.8 249.2,798.2 334.8,805.8 475.9,842.8 518.8,837.2 541.0,885.3 551.1,885.2 558.3,900.0 565.7,916.5 565.0,926.5 562.1,940.0 581.9,950.4 584.5,945.3 583.5,930.7 583.7,920.1 587.9,904.1 588.7,885.1 590.0,870.5 595.1,860.4 590.6,846.1 586.5,836.2 596.0,823.4 632.6,833.6 619.5,781.7 616.4,774.4 618.0,754.7 618.0,741.4 609.3,721.9 581.6,706.0 559.3,691.7 555.5,673.5 551.6,628.8 529.9,588.4 571.6,571.5 571.8,563.0 565.2,550.0 557.5,534.9 548.5,513.2 535.6,487.6 517.8,470.9 494.6,440.3 453.4,419.0 406.7,399.9 356.9,374.6 299.2,351.5 240.4,343.8 134.6,345.3 97.4,346.6 78.1,460.2 200.0,485.5',
    },
    {
        n: 'Parc 8',
        t: 'parc',
        ha: 2.028,
        p: '124.6,1284.3 373.1,1299.4 368.0,1221.3 394.9,1197.8 436.5,1204.6 519.6,1187.4 524.1,1007.6 207.1,998.6 124.6,1284.3',
    },
    {
        n: 'A1',
        t: 'bloc',
        ha: 0.38,
        p: '936.1,474.2 936.1,279.8 850.1,258.1 850.1,452.7 936.1,474.2',
    },
    {
        n: 'A2',
        t: 'bloc',
        ha: 0.381,
        p: '850.1,452.7 850.1,258.1 763.8,236.6 763.8,431.0 850.1,452.7',
    },
    {
        n: 'A3',
        t: 'bloc',
        ha: 0.38,
        p: '763.8,431.0 763.8,236.6 677.7,214.9 677.7,409.3 763.8,431.0',
    },
    {
        n: 'B1',
        t: 'bloc',
        ha: 0.148,
        p: '807.0,603.9 871.5,474.2 807.0,452.7 785.4,582.2 807.0,603.9',
    },
    {
        n: 'B2',
        t: 'bloc',
        ha: 0.127,
        p: '785.4,582.2 807.0,452.7 742.4,431.0 763.8,560.5 785.4,582.2',
    },
    {
        n: 'B3',
        t: 'bloc',
        ha: 0.106,
        p: '763.8,560.5 742.4,431.0 677.7,409.3 742.4,539.0 763.8,560.5',
    },
    {
        n: 'D — Bananeraie',
        t: 'bloc',
        ha: 0.476,
        p: '484.0,992.6 484.0,798.2 354.7,798.2 354.7,928.0 484.0,992.6',
    },
    {
        n: 'E — Maïs',
        t: 'bloc',
        ha: 0.38,
        p: '548.4,1187.2 354.7,1187.2 354.7,1251.8 484.0,1316.7 548.4,1187.2',
    },
    {
        n: 'Porcherie A',
        t: 'bati',
        m2: 246,
        p: '573.4,1188.6 619.8,1198.7 624.5,1175.5 579.6,1166.4 573.4,1188.6',
    },
    {
        n: 'Porcherie B',
        t: 'bati',
        m2: 388,
        p: '573.5,1050.3 591.0,994.9 563.0,987.0 544.5,1039.7 573.5,1050.3',
    },
    {
        n: 'Poulailler — parcours',
        t: 'bati',
        m2: 366,
        p: '593.0,610.1 564.2,575.7 537.1,592.2 563.0,629.8 582.2,628.6 576.7,622.1 593.0,610.1',
    },
    {
        n: 'Poulailler 2',
        t: 'bati',
        m2: 125,
        p: '677.3,740.5 695.8,716.8 681.8,706.8 671.5,717.1 662.0,727.3 677.3,740.5',
    },
    {
        n: 'Poulailler — couvoir',
        t: 'bati',
        m2: 71,
        p: '587.3,634.0 603.7,621.5 593.1,610.1 577.2,622.0 587.3,634.0',
    },
    {
        n: 'Magasin',
        t: 'bati',
        m2: 132,
        p: '546.2,953.5 540.8,973.5 568.0,979.9 573.7,959.9 546.2,953.5',
    },
    {
        n: 'Résidence',
        t: 'bati',
        m2: 81,
        p: '611.7,628.2 625.1,616.8 612.4,601.8 598.1,612.4 611.7,628.2',
    },
];

/* Précisions relevées sur le terrain — s'affichent au survol du bâtiment */
/* Équipements de protection individuelle — durée de validité en mois.
   Les durées correspondent à un usage normal ; une détérioration justifie
   un remplacement anticipé, qui doit être motivé. */
const EPI_TYPES = [
    { n: 'Combinaison de pulvérisation', m: 12, c: 'Phyto' },
    { n: 'Masque respiratoire A2P3', m: 12, c: 'Phyto' },
    { n: 'Cartouches filtrantes', m: 6, c: 'Phyto' },
    { n: 'Gants nitrile (phyto)', m: 3, c: 'Phyto' },
    { n: 'Lunettes de protection', m: 12, c: 'Phyto' },
    { n: 'Tablier imperméable', m: 12, c: 'Phyto' },
    { n: 'Bottes en caoutchouc', m: 12, c: 'Général' },
    { n: 'Gants de travail (cuir)', m: 6, c: 'Général' },
    { n: 'Casquette / chapeau', m: 12, c: 'Général' },
    { n: 'Gilet haute visibilité', m: 24, c: 'Général' },
    { n: 'Bottes de sécurité', m: 18, c: 'Général' },
    { n: 'Protection auditive', m: 12, c: 'Machines' },
    { n: 'Combinaison de biosécurité', m: 12, c: 'Élevage' },
    { n: "Bottes dédiées à l'atelier", m: 12, c: 'Élevage' },
];
const TAILLES = [
    '36',
    '38',
    '40',
    '42',
    '44',
    '46',
    '48',
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    'Unique',
];
const MOTIFS_REMPL = [
    "Détérioration à l'usage",
    'Perte',
    'Vol',
    'Changement de taille',
    'Contamination par un produit',
    'Fin de validité',
];

/* ── PARC MATÉRIEL ──
   cpt : unité de comptage (km, heures, ou aucune pour les immeubles) */
const EQUIPEMENTS = [
    { n: 'Tracteur New Holland TD80', f: 'Engin', cpt: 'heures', site: 'K1' },
    { n: 'Toyota Hilux (5L)', f: 'Véhicule', cpt: 'km', site: 'K1' },
    { n: 'Land Cruiser 79', f: 'Véhicule', cpt: 'km', site: 'K1' },
    { n: 'Unimog 4853AA09', f: 'Véhicule', cpt: 'km', site: 'K1' },
    {
        n: 'Pompe immergée solaire',
        f: 'Pompage',
        cpt: 'heures',
        site: 'Rivière',
    },
    { n: 'Booster 0,5 CV', f: 'Pompage', cpt: 'heures', site: 'K1' },
    {
        n: 'Panneaux solaires — pompage',
        f: 'Solaire',
        cpt: '',
        site: 'Rivière',
    },
    { n: 'Réseau goutte-à-goutte K1', f: 'Irrigation', cpt: '', site: 'K1' },
    { n: 'Pulvérisateur 15 L', f: 'Outillage', cpt: '', site: 'K1' },
    { n: 'Pulvérisateur 20 L', f: 'Outillage', cpt: '', site: 'K1' },
    { n: 'Porcherie A', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Porcherie B', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Poulailler — couvoir', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Poulailler — parcours', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Magasin', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Clôture périmétrale', f: 'Bâtiment', cpt: '', site: 'K1' },
    { n: 'Autre — préciser', f: 'Divers', cpt: '', site: '' },
];

/* Entretiens périodiques — u : unité de l'intervalle, i : intervalle */
const PLAN_ENTRETIEN = {
    'Tracteur New Holland TD80': [
        { t: 'Graissage général', u: 'heures', i: 50 },
        { t: 'Vidange moteur + filtre à huile', u: 'heures', i: 300 },
        { t: 'Filtre à air', u: 'heures', i: 250 },
        { t: 'Filtre hydraulique', u: 'heures', i: 600 },
        { t: 'Contrôle niveaux et courroies', u: 'mois', i: 1 },
    ],
    'Toyota Hilux (5L)': [
        {
            t: 'Vidange + filtre à huile — 6,5 L Rubia Works 1000 15W-40',
            u: 'km',
            i: 5000,
        },
        { t: 'Filtre à air', u: 'km', i: 10000 },
        { t: 'Filtre à gasoil', u: 'km', i: 10000 },
        { t: 'Plaquettes et liquide de frein', u: 'km', i: 20000 },
        { t: 'Permutation des pneus', u: 'km', i: 10000 },
    ],
    'Land Cruiser 79': [
        { t: 'Vidange + filtre à huile', u: 'km', i: 5000 },
        { t: 'Filtre à air et gasoil', u: 'km', i: 10000 },
    ],
    'Unimog 4853AA09': [
        { t: 'Vidange + filtres', u: 'km', i: 7500 },
        { t: 'Graissage des cardans', u: 'km', i: 5000 },
    ],
    'Pompe immergée solaire': [
        { t: 'Contrôle débit et pression', u: 'mois', i: 1 },
        { t: 'Nettoyage de la crépine', u: 'mois', i: 3 },
        { t: 'Contrôle isolement et câblage', u: 'mois', i: 6 },
    ],
    'Panneaux solaires — pompage': [
        { t: 'Nettoyage des panneaux', u: 'mois', i: 1 },
        { t: 'Contrôle fixations et connectique', u: 'mois', i: 6 },
    ],
    'Réseau goutte-à-goutte K1': [
        { t: 'Nettoyage des filtres', u: 'mois', i: 1 },
        { t: 'Purge des extrémités de ligne', u: 'mois', i: 1 },
        { t: 'Contrôle rampe par rampe (fiche signée)', u: 'mois', i: 1 },
    ],
    'Booster 0,5 CV': [{ t: 'Contrôle et graissage', u: 'mois', i: 1 }],
    'Pulvérisateur 15 L': [
        { t: 'Contrôle buses et joints, rinçage', u: 'mois', i: 1 },
    ],
    'Pulvérisateur 20 L': [
        { t: 'Contrôle buses et joints, rinçage', u: 'mois', i: 1 },
    ],
    'Porcherie A': [
        { t: 'Contrôle toiture, caniveaux, portes', u: 'mois', i: 3 },
    ],
    'Porcherie B': [
        { t: 'Contrôle toiture, caniveaux, portes', u: 'mois', i: 3 },
    ],
    'Clôture périmétrale': [
        { t: 'Tour complet de la clôture', u: 'mois', i: 1 },
    ],
};

/* Corps de métier — chaque bon de travail porte les champs propres au métier */
const METIERS = {
    MEC: {
        n: 'Mécanique — véhicule ou engin',
        champs: [
            'Compteur relevé (km ou heures)',
            "Nature de l'intervention",
            'Pièces remplacées',
            'Huile : type et litres',
            'Prochaine échéance',
        ],
    },
    PLB: {
        n: 'Plomberie / irrigation',
        champs: [
            'Circuit ou rampe concernée',
            'Nature de la panne (fuite, bouchage, pression)',
            'Diamètre et longueur de tuyau',
            'Raccords utilisés',
            'Pression après réparation',
        ],
    },
    ELE: {
        n: 'Électricité',
        champs: [
            'Tableau ou circuit',
            'CONSIGNATION effectuée (obligatoire)',
            'Tension mesurée',
            'Section de câble',
            'Protection installée (disjoncteur, fusible)',
        ],
    },
    SOL: {
        n: 'Solaire et pompage',
        champs: [
            'Élément (panneau, batterie, onduleur, pompe)',
            'Tension / débit mesuré',
            'Pièces remplacées',
            "Contrôle d'isolement",
        ],
    },
    BAT: {
        n: 'Bâtiment / maçonnerie',
        champs: [
            'Local ou ouvrage',
            'Nature des travaux',
            'Ciment (sacs)',
            'Sable et gravier (m³)',
            'Blocs / briques (nombre)',
        ],
    },
    MEN: {
        n: 'Menuiserie',
        champs: [
            'Ouvrage',
            'Essence et dimensions du bois',
            'Quincaillerie',
            'Traitement appliqué',
        ],
    },
    SOU: {
        n: 'Soudure / métallerie',
        champs: [
            'Ouvrage',
            'Épaisseur et nature du métal',
            'Électrodes (nombre)',
            'Contrôle de la soudure',
        ],
    },
    DIV: {
        n: 'Divers',
        champs: ['Description des travaux', 'Matériaux utilisés'],
    },
};
const PRIORITES = [
    'URGENT — arrêt de production',
    'Élevé — sous 48 h',
    'Normal — sous 7 jours',
    'Planifié',
];
const STATUTS = [
    'Demandé',
    'Approuvé',
    'En cours',
    'Exécuté',
    'Clôturé',
    'Refusé',
];

/* ── CENTRES DE COÛTS ──
   Repris du rapport mensuel Ets Kabanda (octobre 2025), complétés par
   « Exploitation Élevage » depuis la création de BT Animal. */
const CENTRES = [
    { c: 'FG', n: 'Frais Généraux' },
    { c: 'EXA', n: 'Exploitation Agricole' },
    { c: 'EXE', n: 'Exploitation Élevage' },
    { c: 'EQP', n: 'Équipements' },
    { c: 'CST', n: 'Construction' },
    { c: 'COM', n: 'Commercial' },
    { c: 'SEC', n: 'Sécurité' },
    { c: 'RH', n: 'Personnel' },
];
const CC_DEFAUT = { AGRI: 'EXA', ANI: 'EXE' };

/* ── CATÉGORIES D'INVENTAIRE — préfixe du code article ── */
const CATEG = {
    ENG: 'Engrais et amendements',
    PHY: 'Produits phytosanitaires',
    SEM: 'Semences et plants',
    ALI: 'Aliments du bétail',
    VET: 'Produits vétérinaires',
    PIE: 'Pièces détachées',
    OUT: 'Outillage',
    EPI: 'Équipements de protection',
    CAR: 'Carburants et lubrifiants',
    CON: 'Matériaux de construction',
    IRR: "Matériel d'irrigation",
    BUR: 'Fournitures de bureau',
    DIV: 'Divers',
};
const UNITES_ART = [
    'kg',
    'sac 50 kg',
    'sac 25 kg',
    'litre',
    'bidon',
    'pièce',
    'mètre',
    'rouleau',
    'boîte',
    'paire',
];

const TYPES_REQ = {
    STK: { n: 'Sortie de stock', d: 'Prélever un article déjà en magasin' },
    CSH: { n: 'Demande de fonds', d: 'Espèces pour un achat ou un service' },
    NEW: {
        n: "Achat d'un article",
        d: 'Article absent du magasin — création de la fiche',
    },
};
const STATUTS_REQ = ['Demandée', 'Approuvée', 'Servie', 'Refusée', 'Annulée'];

const DETAIL_BATI = {
    'Porcherie A': '246 m² · Large White — ligne verte pure (reproducteurs)',
    'Porcherie B':
        '388 m² · Large White — ligne jaune terminale (engraissement)',
    'Poulailler — couvoir':
        '71 m² · démarrage SASSO — bâche PVC, radiants à gaz',
    'Poulailler — parcours':
        '366 m² · parcours SASSO — Zone 1 (âge 1) et Zone 2 (finition)',
    'Poulailler 2': '125 m² · usage à confirmer',
    Magasin: '132 m² · intrants et produits phytosanitaires',
    Résidence: '81 m²',
};

const C = {
    ink: '#17352A',
    green: '#123F29',
    green2: '#267049',
    laterite: '#B56532',
    paper: '#F4F1E8',
    line: '#D6D0C2',
    red: '#B63D32',
    amber: '#D68A2D',
    ani: '#76502B',
};
const FONTS = `body{margin:0}*{box-sizing:border-box}`;
const MGMT = 'etskabanda@gmail.com';

const Label = ({ children }) => (
    <div
        style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: 13,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: C.green,
            marginBottom: 6,
            fontWeight: 600,
        }}
    >
        {children}
    </div>
);
const Sel = ({ value, onChange, options, placeholder }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
            width: '100%',
            padding: '14px 12px',
            fontSize: 17,
            borderRadius: 4,
            border: `2px solid ${C.line}`,
            background: '#fff',
            color: C.ink,
            fontFamily: 'Inter, sans-serif',
            marginBottom: 14,
        }}
    >
        <option value="">{placeholder}</option>
        {options.map((o) => (
            <option key={o} value={o}>
                {o}
            </option>
        ))}
    </select>
);
const Txt = ({ value, onChange, placeholder, lines }) =>
    React.createElement(lines ? 'textarea' : 'input', {
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        rows: lines || undefined,
        style: {
            width: '100%',
            padding: '14px 12px',
            fontSize: 17,
            borderRadius: 4,
            border: `2px solid ${C.line}`,
            background: '#fff',
            color: C.ink,
            fontFamily: 'Inter, sans-serif',
            marginBottom: 14,
            resize: 'vertical',
        },
    });
const Card = ({ children, tone }) => (
    <div
        style={{
            background: '#fff',
            border: `1px solid ${C.line}`,
            borderLeft: `5px solid ${tone || C.green2}`,
            borderRadius: 4,
            padding: 14,
            marginBottom: 10,
        }}
    >
        {children}
    </div>
);
const Btn = ({ onClick, children, tone }) => {
    const bg =
        tone === 'danger'
            ? C.red
            : tone === 'wa'
              ? '#1EA55C'
              : tone === 'mail'
                ? '#37618E'
                : tone === 'ghost'
                  ? '#fff'
                  : C.laterite;
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                padding: 18,
                fontSize: 18,
                fontWeight: 700,
                borderRadius: 4,
                border: tone === 'ghost' ? `2px solid ${C.line}` : 'none',
                background: bg,
                color: tone === 'ghost' ? C.ink : '#fff',
                fontFamily: 'Oswald, sans-serif',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                cursor: 'pointer',
                marginBottom: 10,
            }}
        >
            {children}
        </button>
    );
};
function Compteur({ value, onChange, unite, setUnite, unites }) {
    const step = (d) => onChange(Math.max(0, (parseFloat(value) || 0) + d));
    const B = ({ d, ch }) => (
        <button
            onClick={() => step(d)}
            aria-label={d > 0 ? 'plus' : 'moins'}
            style={{
                width: 62,
                height: 62,
                fontSize: 30,
                fontWeight: 700,
                borderRadius: 4,
                border: `2px solid ${C.green}`,
                background: C.green,
                color: '#fff',
                fontFamily: 'Oswald, sans-serif',
                cursor: 'pointer',
                flexShrink: 0,
            }}
        >
            {ch}
        </button>
    );
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <B d={-1} ch="−" />
                <input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'center',
                        fontSize: 40,
                        fontWeight: 700,
                        padding: '8px 4px',
                        borderRadius: 4,
                        border: `3px solid ${C.laterite}`,
                        fontFamily: 'Oswald, sans-serif',
                        color: C.ink,
                    }}
                />
                <B d={1} ch="+" />
            </div>
            {unites && (
                <select
                    value={unite}
                    onChange={(e) => setUnite(e.target.value)}
                    style={{
                        width: '100%',
                        marginTop: 10,
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 4,
                        border: `2px solid ${C.line}`,
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    {unites.map((u) => (
                        <option key={u} value={u}>
                            {u}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
function MultiSel({ options, selected, onChange, placeholder, onAjout }) {
    const toggle = (o) => {
        if (o === '+ Ajouter un nom') {
            if (onAjout) onAjout();
            return;
        }
        onChange(
            selected.includes(o)
                ? selected.filter((x) => x !== o)
                : [...selected, o],
        );
    };
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
                {placeholder}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {options.map((o) => {
                    const on = selected.includes(o);
                    return (
                        <button
                            key={o}
                            onClick={() => toggle(o)}
                            style={{
                                padding: '11px 13px',
                                fontSize: 14.5,
                                borderRadius: 4,
                                cursor: 'pointer',
                                borderWidth: 2,
                                borderColor: on ? C.green : C.line,
                                background: on ? C.green : '#fff',
                                color: on ? '#fff' : C.ink,
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: on ? 700 : 400,
                                borderStyle:
                                    o === '+ Ajouter un nom'
                                        ? 'dashed'
                                        : 'solid',
                            }}
                        >
                            {on ? '✓ ' : ''}
                            {o}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* Carte cliquable — survol à la souris, appui au doigt */
function CarteFerme({
    carte,
    assign,
    jPlus,
    tachesDues,
    lieu,
    setLieu,
    ACC,
    onOuvrir,
}) {
    const [survol, setSurvol] = useState(null);
    const actif = survol || lieu;
    const info = actif
        ? {
              nom: actif,
              ha: (carte.find((f) => f.n === actif) || {}).ha,
              m2: (carte.find((f) => f.n === actif) || {}).m2,
              cult: assign[actif],
              j: assign[actif] ? jPlus(actif) : null,
              dues: assign[actif] ? tachesDues(actif).length : 0,
          }
        : null;

    const couleur = (f) => {
        if (f.t === 'limite') return 'none';
        if (f.n === actif) return C.laterite;
        if (assign[f.n]) return f.t === 'parc' ? ACC : C.green2;
        return '#DCD6C6';
    };

    return (
        <div style={{ marginBottom: 14 }}>
            <div
                style={{
                    background: '#fff',
                    border: `1px solid ${C.line}`,
                    borderRadius: 4,
                    padding: 8,
                }}
            >
                <svg
                    viewBox={`-10 -10 1020 ${CARTE_H + 20}`}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                    {carte
                        .filter((f) => f.t === 'limite')
                        .map((f) => (
                            <polygon
                                key={f.n}
                                points={f.p}
                                fill="#FBF8F0"
                                stroke={C.ink}
                                strokeWidth="4"
                            />
                        ))}
                    {carte
                        .filter((f) => f.t === 'parc')
                        .map((f) => (
                            <polygon
                                key={f.n}
                                points={f.p}
                                fill={couleur(f)}
                                fillOpacity={f.n === actif ? 0.95 : 0.55}
                                stroke={C.ink}
                                strokeWidth={f.n === actif ? 5 : 2}
                                style={{
                                    cursor: 'pointer',
                                    transition: 'fill-opacity .12s',
                                }}
                                onMouseEnter={() => setSurvol(f.n)}
                                onMouseLeave={() => setSurvol(null)}
                                onClick={() => setLieu(f.n)}
                            />
                        ))}
                    {carte
                        .filter((f) => f.t === 'bloc')
                        .map((f) => (
                            <polygon
                                key={f.n}
                                points={f.p}
                                fill={
                                    f.n === actif
                                        ? C.laterite
                                        : assign[f.n]
                                          ? C.green2
                                          : 'none'
                                }
                                fillOpacity={f.n === actif ? 0.9 : 0.5}
                                stroke="#1B3A6B"
                                strokeWidth={f.n === actif ? 4 : 2}
                                strokeDasharray="7,5"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setSurvol(f.n)}
                                onMouseLeave={() => setSurvol(null)}
                                onClick={() => setLieu(f.n)}
                            />
                        ))}
                    {carte
                        .filter((f) => f.t === 'bati')
                        .map((f) => (
                            <polygon
                                key={f.n}
                                points={f.p}
                                fill={f.n === actif ? C.laterite : '#7A4419'}
                                fillOpacity={f.n === actif ? 1 : 0.85}
                                stroke="#3E2410"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setSurvol(f.n)}
                                onMouseLeave={() => setSurvol(null)}
                                onClick={() => setLieu(f.n)}
                            />
                        ))}
                    {carte
                        .filter((f) => f.t === 'parc')
                        .map((f) => {
                            const pts = f.p
                                .split(' ')
                                .map((q) => q.split(',').map(Number));
                            const cx =
                                pts.reduce((a, b) => a + b[0], 0) / pts.length;
                            const cy =
                                pts.reduce((a, b) => a + b[1], 0) / pts.length;
                            return (
                                <text
                                    key={f.n}
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    fontSize="34"
                                    fontWeight="700"
                                    fill={f.n === actif ? '#fff' : C.ink}
                                    style={{
                                        pointerEvents: 'none',
                                        fontFamily: 'Oswald, sans-serif',
                                    }}
                                >
                                    {f.n.replace('Parc ', 'P')}
                                </text>
                            );
                        })}
                </svg>
            </div>

            {info ? (
                <div
                    style={{
                        background: info.cult ? ACC : '#8A8A80',
                        color: '#fff',
                        padding: 14,
                        borderRadius: 4,
                        marginTop: 8,
                    }}
                >
                    <div
                        className="farm-top-row"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 10,
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 20,
                                    fontWeight: 700,
                                }}
                            >
                                {info.nom}
                            </div>
                            <div style={{ fontSize: 14.5, marginTop: 3 }}>
                                {info.ha
                                    ? `${info.ha} ha · `
                                    : info.m2
                                      ? `${info.m2} m² · `
                                      : ''}
                                {info.cult
                                    ? `${info.cult.culture} · J+${info.j}`
                                    : 'libre — aucune culture'}
                            </div>
                            {info.dues > 0 && (
                                <div
                                    style={{
                                        fontSize: 14,
                                        marginTop: 5,
                                        fontWeight: 700,
                                    }}
                                >
                                    {info.dues} tâche(s) due(s)
                                </div>
                            )}
                            {DETAIL_BATI[info.nom] && (
                                <div
                                    style={{
                                        fontSize: 13.5,
                                        marginTop: 6,
                                        lineHeight: 1.5,
                                        opacity: 0.95,
                                    }}
                                >
                                    {DETAIL_BATI[info.nom]}
                                </div>
                            )}
                        </div>
                        {lieu === info.nom && (
                            <button
                                onClick={onOuvrir}
                                style={{
                                    padding: '12px 15px',
                                    background: '#fff',
                                    color: C.ink,
                                    border: 'none',
                                    borderRadius: 4,
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Ouvrir →
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        fontSize: 14,
                        color: '#666',
                        marginTop: 8,
                        textAlign: 'center',
                        lineHeight: 1.5,
                    }}
                >
                    Passez la souris sur une parcelle — ou touchez-la — pour
                    voir la culture en place.
                </div>
            )}
            <div
                style={{
                    display: 'flex',
                    gap: 14,
                    flexWrap: 'wrap',
                    marginTop: 10,
                    fontSize: 12.5,
                    color: '#555',
                }}
            >
                <span>
                    <b style={{ color: ACC }}>■</b> cultivée
                </span>
                <span>
                    <b style={{ color: '#DCD6C6' }}>■</b> libre
                </span>
                <span>
                    <b style={{ color: C.laterite }}>■</b> sélectionnée
                </span>
                <span style={{ color: '#1B3A6B' }}>┄ sous-blocs A/B/D/E</span>
                <span>
                    <b style={{ color: '#7A4419' }}>■</b> bâtiments d'élevage
                </span>
            </div>
        </div>
    );
}

export default function App({
    references = {},
    mapFeatures = /** @type {any[]} */ ([]),
}) {
    const { auth } = usePage().props;
    const carte = mapFeatures.length
        ? mapFeatures.map((feature) => ({
              n: feature.name,
              t: feature.feature_type,
              ha: feature.area_ha ? Number(feature.area_ha) : null,
              m2: feature.area_m2,
              p: feature.points.map(([x, y]) => `${x},${y}`).join(' '),
          }))
        : CARTE;
    const configured = (key, fallback) =>
        references[key]?.length
            ? references[key].map((item) => item.label)
            : fallback;
    const agentsAgri = configured('agents_agri', AGENTS_AGRI);
    const agentsAni = configured('agents_ani', AGENTS_ANI);
    const parcelles = configured('parcelles', PARCELLES);
    const ateliers = configured('ateliers', ATELIERS);
    const cultures = configured('cultures', CULTURES);
    const tachesAgri = configured('taches_agri', TACHES);
    const unites = configured('unites', UNITES);
    const produitsCatalogue = configured('produits', PRODUITS);
    const soins = configured('soins', SOINS);
    const destinations = configured('destinations', DESTINATIONS);
    const tailles = configured('tailles', TAILLES);
    const epiTypes = configured(
        'epi_types',
        EPI_TYPES.map((item) => item.n),
    ).map(
        (name) =>
            EPI_TYPES.find((item) => item.n === name) || {
                n: name,
                m: 12,
                c: 'Général',
            },
    );
    const tachesAtelier = {
        Porcherie: configured('taches_porcherie', TACHES_ATELIER.Porcherie),
        Poulailler: configured('taches_poulailler', TACHES_ATELIER.Poulailler),
        'Bovins K2': configured('taches_bovins', TACHES_ATELIER['Bovins K2']),
        Pisciculture: configured(
            'taches_pisciculture',
            TACHES_ATELIER.Pisciculture,
        ),
    };
    const alimentsAtelier = {
        Porcherie: configured('aliments_porcherie', ALIM_ATELIER.Porcherie),
        Poulailler: configured('aliments_poulailler', ALIM_ATELIER.Poulailler),
        'Bovins K2': configured('aliments_bovins', ALIM_ATELIER['Bovins K2']),
        Pisciculture: configured(
            'aliments_pisciculture',
            ALIM_ATELIER.Pisciculture,
        ),
    };
    const today = new Date().toISOString().slice(0, 10);
    const [bureau, setBureau] = useState('AGRI');
    const [date, setDate] = useState(today);
    const [vue, setVue] = useState('accueil');
    const [lieu, setLieu] = useState('');
    const [etat, setEtat] = useState('');
    const [assign, setAssign] = useState({});
    const [histoCult, setHistoCult] = useState({});
    const [dars, setDars] = useState({});
    const [stock, setStock] = useState({});
    const [journal, setJournal] = useState([]);
    const [histo, setHisto] = useState([]);
    const [agentsPerso, setAgentsPerso] = useState([]);
    const [epis, setEpis] = useState([]);
    const [bts, setBts] = useState([]);
    const [compteurs, setCompteurs] = useState({});
    const [articles, setArticles] = useState([]);
    const [reqs, setReqs] = useState([]);
    const [cc, setCc] = useState('');
    const [meteo, setMeteo] = useState('');
    const [pluie, setPluie] = useState('');
    const [presents, setPresents] = useState('');
    const [absents, setAbsents] = useState('');
    const [redacteur, setRedacteur] = useState('');
    const [travaux, setTravaux] = useState([]);
    const [produits, setProduits] = useState([]);
    const [eau, setEau] = useState([]);
    const [recoltes, setRecoltes] = useState([]);
    const [cheptel, setCheptel] = useState([]);
    const [alim, setAlim] = useState([]);
    const [sante, setSante] = useState([]);
    const [problemes, setProblemes] = useState([]);
    const [formFreq, setFormFreq] = useState([]);

    const AGENTS = [
        ...(bureau === 'AGRI' ? agentsAgri : agentsAni).filter(
            (a) => a !== 'Autre',
        ),
        ...agentsPerso,
        '+ Ajouter un nom',
    ];
    /* Tâches et unités contextuelles */
    const TACHES_DISPO =
        bureau === 'AGRI'
            ? tachesAgri
            : tachesAtelier[TYPE_ATELIER(lieu)] || ['Autre'];
    const ALIM_DISPO = alimentsAtelier[TYPE_ATELIER(lieu)] || [];
    const unitesPour = (t) => UNITES_TACHE[t] || unites;
    const LIEUX = bureau === 'AGRI' ? parcelles : ateliers;
    const ACC = bureau === 'AGRI' ? C.green : C.ani;
    const cle = `rap:${bureau}:${date}`;
    const CC = cc || CC_DEFAUT[bureau];
    const flash = (m, ms = 2400) => {
        setEtat(m);
        setTimeout(() => setEtat(''), ms);
    };

    /* ── EPI : validité et remise ── */
    const finValidite = (d) => {
        const r = epis.find((e) => e.id === d);
        return r;
    };
    const ajouteMois = (iso, m) => {
        const x = new Date(iso);
        x.setMonth(x.getMonth() + m);
        return x.toISOString().slice(0, 10);
    };
    const joursRestants = (e) =>
        Math.round((new Date(e.expire) - new Date(date)) / 86400000);
    const statutEpi = (e) => {
        const j = joursRestants(e);
        if (e.remplace) return { t: 'REMPLACÉ', c: '#8A8A80', j };
        if (j < 0) return { t: 'EXPIRÉ', c: C.red, j };
        if (j <= 30) return { t: 'BIENTÔT', c: C.amber, j };
        return { t: 'VALIDE', c: C.green2, j };
    };
    /* La règle : un agent ne peut recevoir un EPI si le sien est encore valide */
    const epiValide = (agent, type) =>
        epis.find(
            (e) =>
                e.agent === agent &&
                e.type === type &&
                !e.remplace &&
                new Date(e.expire) >= new Date(date),
        );

    /* Ajout manuel d'un nom absent de la liste */
    const ajouterAgent = async () => {
        const nom = (
            window.prompt('Nom de la personne à ajouter :') || ''
        ).trim();
        if (!nom) return;
        if (AGENTS.includes(nom)) return flash('Ce nom est déjà dans la liste');
        const n = [...agentsPerso, nom];
        setAgentsPerso(n);
        try {
            await window.storage.set('agents_perso', JSON.stringify(n), true);
        } catch {
            /* non bloquant */
        }
        log(`Nom ajouté à la liste : ${nom}`);
        flash(`${nom} ajouté — touchez son nom pour le sélectionner`, 3000);
    };

    const log = async (txt) => {
        try {
            const r = await window.storage.get('journal', true);
            const a = r && r.value ? JSON.parse(r.value) : [];
            a.unshift({
                t: new Date().toISOString(),
                u: redacteur || '—',
                a: txt,
                b: bureau,
            });
            await window.storage.set(
                'journal',
                JSON.stringify(a.slice(0, 300)),
                true,
            );
        } catch {
            /* non critique */
        }
    };

    const vider = () => {
        setMeteo('');
        setPluie('');
        setPresents('');
        setAbsents('');
        setRedacteur('');
        setTravaux([]);
        setProduits([]);
        setEau([]);
        setRecoltes([]);
        setCheptel([]);
        setAlim([]);
        setSante([]);
        setProblemes([]);
        setFormFreq([]);
    };

    useEffect(() => {
        (async () => {
            try {
                const r = await window.storage.get(cle, true);
                if (r && r.value) {
                    const d = JSON.parse(r.value);
                    setMeteo(d.meteo || '');
                    setPluie(d.pluie || '');
                    setPresents(d.presents || '');
                    setAbsents(d.absents || '');
                    setRedacteur(d.redacteur || '');
                    setTravaux(d.travaux || []);
                    setProduits(d.produits || []);
                    setEau(d.eau || []);
                    setRecoltes(d.recoltes || []);
                    setCheptel(d.cheptel || []);
                    setAlim(d.alim || []);
                    setSante(d.sante || []);
                    setProblemes(d.problemes || []);
                    setFormFreq(d.formFreq || []);
                } else vider();
            } catch {
                vider();
            }
            for (const [k, set] of [
                ['assignations', setAssign],
                ['histo_cultures', setHistoCult],
                ['dars', setDars],
                ['stock', setStock],
                ['agents_perso', setAgentsPerso],
                ['epi_dotations', setEpis],
                ['bons_travaux', setBts],
                ['compteurs', setCompteurs],
                ['articles', setArticles],
                ['requisitions', setReqs],
            ]) {
                try {
                    const v = await window.storage.get(k, true);
                    if (v && v.value) set(JSON.parse(v.value));
                } catch {
                    /* vide */
                }
            }
        })();
    }, [date, bureau]);

    const sauver = async (next) => {
        const d = {
            meteo,
            pluie,
            presents,
            absents,
            redacteur,
            travaux,
            produits,
            eau,
            recoltes,
            cheptel,
            alim,
            sante,
            problemes,
            formFreq,
            bureau,
            ...next,
        };
        try {
            await window.storage.set(cle, JSON.stringify(d), true);
            flash(
                'Enregistré à ' +
                    new Date().toLocaleTimeString('fr-FR').slice(0, 5),
                2000,
            );
        } catch {
            flash("Échec de l'enregistrement");
        }
    };

    /* ── remise d'un EPI ── */
    const [ep, setEp] = useState({
        agent: '',
        type: '',
        taille: '',
        motif: '',
    });
    const remettreEpi = async () => {
        if (!ep.agent || !ep.type)
            return flash("Agent et type d'EPI obligatoires");
        const encore = epiValide(ep.agent, ep.type);
        if (encore && !ep.motif) {
            return flash(
                `REFUSÉ — ${ep.agent.split(' —')[0]} détient déjà un ${ep.type} valide jusqu'au ${encore.expire}. Indiquez un motif de remplacement.`,
                5200,
            );
        }
        const t = epiTypes.find((x) => x.n === ep.type);
        const rec = {
            id: `${Date.now()}`,
            agent: ep.agent,
            type: ep.type,
            taille: ep.taille,
            remise: date,
            expire: ajouteMois(date, t ? t.m : 12),
            motif: ep.motif || '',
            remisPar: redacteur || '—',
            remplace: false,
        };
        let liste = [...epis];
        if (encore) {
            liste = liste.map((e) =>
                e.id === encore.id
                    ? { ...e, remplace: true, finMotif: ep.motif }
                    : e,
            );
        }
        liste = [rec, ...liste];
        setEpis(liste);
        try {
            await window.storage.set(
                'epi_dotations',
                JSON.stringify(liste.slice(0, 400)),
                true,
            );
        } catch {
            /* non bloquant */
        }
        log(
            `EPI ${ep.type} remis à ${ep.agent}${ep.motif ? ` (${ep.motif})` : ''}`,
        );
        setEp({ agent: '', type: '', taille: '', motif: '' });
        flash(`${ep.type} remis — valide jusqu'au ${rec.expire}`, 3600);
    };

    /* ── Inventaire ── */
    const [art, setArt] = useState({
        cat: '',
        lib: '',
        unite: '',
        qte: '',
        pu: '',
        mini: '',
        cc: '',
    });
    const codeArticle = (cat) =>
        `${cat}-${String(articles.filter((a) => a.code.startsWith(cat + '-')).length + 1).padStart(3, '0')}`;
    const creerArticle = async (a) => {
        const rec = { ...a, code: codeArticle(a.cat), cree: date };
        const l = [...articles, rec];
        setArticles(l);
        try {
            await window.storage.set('articles', JSON.stringify(l), true);
        } catch {
            /* non bloquant */
        }
        log(`Article ${rec.code} créé — ${rec.lib}`);
        return rec;
    };
    const valeurStock = () =>
        articles.reduce(
            (s, a) => s + (parseFloat(a.qte) || 0) * (parseFloat(a.pu) || 0),
            0,
        );
    const sousMini = () =>
        articles.filter(
            (a) => a.mini && parseFloat(a.qte) <= parseFloat(a.mini),
        );

    /* ── Réquisitions ── */
    const [rq, setRq] = useState({
        type: '',
        article: '',
        qte: '',
        montant: '',
        objet: '',
        justif: '',
        urgence: '',
        cc: '',
        nouvCat: '',
        nouvLib: '',
        nouvUnite: '',
        nouvPu: '',
    });
    const numeroRQ = (t) => {
        const jour = date.replace(/-/g, '');
        const n =
            reqs.filter((r) => r.num && r.num.includes(`-${t}-${jour}-`))
                .length + 1;
        return `RQ-${t}-${jour}-${String(n).padStart(2, '0')}`;
    };
    const creerReq = async () => {
        if (!rq.type) return flash('Choisissez le type de réquisition');
        if (!rq.objet) return flash("L'objet de la demande est obligatoire");
        if (rq.type === 'STK' && (!rq.article || !rq.qte))
            return flash('Article et quantité obligatoires');
        if (rq.type === 'CSH' && !rq.montant)
            return flash('Montant obligatoire');
        if (rq.type === 'NEW' && (!rq.nouvCat || !rq.nouvLib || !rq.qte))
            return flash('Catégorie, libellé et quantité obligatoires');
        if (rq.type === 'STK') {
            const a = articles.find((x) => x.code === rq.article);
            if (a && parseFloat(rq.qte) > parseFloat(a.qte))
                return flash(
                    `STOCK INSUFFISANT — il reste ${a.qte} ${a.unite} de ${a.lib}`,
                    4500,
                );
        }
        let valeur = 0;
        if (rq.type === 'STK') {
            const a = articles.find((x) => x.code === rq.article);
            valeur =
                (parseFloat(rq.qte) || 0) * (parseFloat(a ? a.pu : 0) || 0);
        }
        if (rq.type === 'CSH') valeur = parseFloat(rq.montant) || 0;
        if (rq.type === 'NEW')
            valeur = (parseFloat(rq.qte) || 0) * (parseFloat(rq.nouvPu) || 0);
        const rec = {
            ...rq,
            num: numeroRQ(rq.type),
            date,
            statut: 'Demandée',
            valeur,
            cc: rq.cc || CC,
            demandeur: redacteur || '—',
            bureau,
            approbations: {},
        };
        const l = [rec, ...reqs];
        setReqs(l);
        try {
            await window.storage.set(
                'requisitions',
                JSON.stringify(l.slice(0, 300)),
                true,
            );
        } catch {
            /* */
        }
        log(`Réquisition ${rec.num} — ${valeur} USD — ${rec.cc}`);
        setRq({
            type: '',
            article: '',
            qte: '',
            montant: '',
            objet: '',
            justif: '',
            urgence: '',
            cc: '',
            nouvCat: '',
            nouvLib: '',
            nouvUnite: '',
            nouvPu: '',
        });
        flash(`${rec.num} créée — en attente d'approbation`, 3600);
    };
    const statutReq = async (num, st) => {
        const r = reqs.find((x) => x.num === num);
        if (!r) return;
        if (
            st === 'Approuvée' &&
            !window.confirm(
                `APPROBATION — ${num}\n\nValeur : ${r.valeur} USD\nCentre de coût : ${r.cc}\n\nToute dépense ou sortie de stock exige un accord écrit (Art. 15 du Règlement d'Entreprise).\n\nApprouver ?`,
            )
        )
            return;
        let arts = [...articles];
        if (st === 'Servie') {
            if (r.type === 'STK') {
                arts = arts.map((a) =>
                    a.code === r.article
                        ? {
                              ...a,
                              qte: Math.max(
                                  0,
                                  (parseFloat(a.qte) || 0) -
                                      (parseFloat(r.qte) || 0),
                              ),
                          }
                        : a,
                );
            }
            if (r.type === 'NEW') {
                const dejaCree = articles.some(
                    (a) => a.lib === r.nouvLib && a.cat === r.nouvCat,
                );
                if (!dejaCree) {
                    const rec = {
                        cat: r.nouvCat,
                        lib: r.nouvLib,
                        unite: r.nouvUnite,
                        qte: r.qte,
                        pu: r.nouvPu,
                        mini: '',
                        cc: r.cc,
                        code: `${r.nouvCat}-${String(arts.filter((a) => a.code.startsWith(r.nouvCat + '-')).length + 1).padStart(3, '0')}`,
                        cree: date,
                    };
                    arts = [...arts, rec];
                    flash(`Article ${rec.code} créé au magasin`, 3600);
                }
            }
            setArticles(arts);
            try {
                await window.storage.set(
                    'articles',
                    JSON.stringify(arts),
                    true,
                );
            } catch {
                /* */
            }
        }
        const l = reqs.map((x) =>
            x.num === num
                ? {
                      ...x,
                      statut: st,
                      approbations: {
                          ...x.approbations,
                          [st]: { par: redacteur || '—', le: date },
                      },
                  }
                : x,
        );
        setReqs(l);
        try {
            await window.storage.set('requisitions', JSON.stringify(l), true);
        } catch {
            /* */
        }
        log(`${num} → ${st}`);
        flash(`${num} : ${st}`);
    };
    const texteReq = (r) => {
        const L = [
            `RÉQUISITION ${r.num}`,
            `Ets Kabanda — Ferme Kabanda Naweza`,
            ``,
            `Type : ${TYPES_REQ[r.type] ? TYPES_REQ[r.type].n : r.type}`,
            `Date : ${r.date}`,
            `Demandeur : ${r.demandeur}`,
            `Centre de coût : ${r.cc} — ${(CENTRES.find((c) => c.c === r.cc) || {}).n || ''}`,
            `Bureau : ${r.bureau === 'AGRI' ? 'BT Agri' : 'BT Animal'}`,
            ``,
            `Objet : ${r.objet}`,
        ];
        if (r.type === 'STK') {
            const a = articles.find((x) => x.code === r.article);
            L.push(`Article : ${r.article} — ${a ? a.lib : ''}`);
            L.push(`Quantité : ${r.qte} ${a ? a.unite : ''}`);
        }
        if (r.type === 'CSH') L.push(`Montant demandé : ${r.montant} USD`);
        if (r.type === 'NEW') {
            L.push(
                `Article à acheter : ${r.nouvLib} (${CATEG[r.nouvCat] || r.nouvCat})`,
            );
            L.push(`Quantité : ${r.qte} ${r.nouvUnite}`);
            L.push(`Prix unitaire estimé : ${r.nouvPu} USD`);
        }
        L.push(`VALEUR : ${r.valeur} USD`);
        if (r.urgence) L.push(`Urgence : ${r.urgence}`);
        if (r.justif) L.push(``, `Justification : ${r.justif}`);
        L.push(``, `Statut : ${r.statut}`);
        Object.entries(r.approbations || {}).forEach(([k, v]) =>
            L.push(`${k} par ${v.par} le ${v.le}`),
        );
        L.push(
            ``,
            `Approbations requises (Art. 15) :`,
            `  Responsable département : ____________`,
            `  Direction : ____________`,
            `  Comptabilité : ____________`,
        );
        return L.join('\n');
    };
    const reqWA = (r) =>
        window.open(
            `https://wa.me/?text=${encodeURIComponent(texteReq(r))}`,
            '_blank',
        );
    const reqMail = (r) => {
        window.location.href = `mailto:${MGMT}?subject=${encodeURIComponent(`Réquisition ${r.num} — ${r.valeur} USD — ${r.cc}`)}&body=${encodeURIComponent(texteReq(r))}`;
    };

    /* ── Bons de travail ── */
    const [bt, setBt] = useState({
        metier: '',
        equip: '',
        desc: '',
        prio: '',
        detail: {},
        demandeur: '',
        cout: '',
    });
    const numeroBT = (met) => {
        const jour = date.replace(/-/g, '');
        const n =
            bts.filter((b) => b.num && b.num.includes(`-${met}-${jour}-`))
                .length + 1;
        return `BT-${met}-${jour}-${String(n).padStart(2, '0')}`;
    };
    const creerBT = async () => {
        if (!bt.metier || !bt.equip || !bt.desc)
            return flash('Métier, équipement et description obligatoires');
        const rec = {
            ...bt,
            num: numeroBT(bt.metier),
            date,
            statut: 'Demandé',
            cc: CC,
            demandeur: bt.demandeur || redacteur || '—',
            bureau,
            approbations: {},
        };
        const l = [rec, ...bts];
        setBts(l);
        try {
            await window.storage.set(
                'bons_travaux',
                JSON.stringify(l.slice(0, 300)),
                true,
            );
        } catch {
            /* non bloquant */
        }
        log(`Bon de travail ${rec.num} créé`);
        setBt({
            metier: '',
            equip: '',
            desc: '',
            prio: '',
            detail: {},
            demandeur: '',
            cout: '',
        });
        flash(`${rec.num} créé — en attente d'approbation`, 3600);
    };
    const changerStatut = async (num, st) => {
        if (
            st === 'Approuvé' &&
            !window.confirm(
                "APPROBATION\n\nToute dépense exige un accord écrit (Art. 15 du Règlement d'Entreprise).\n\nApprouver ce bon de travail ?",
            )
        )
            return;
        const l = bts.map((b) =>
            b.num === num
                ? {
                      ...b,
                      statut: st,
                      approbations: {
                          ...b.approbations,
                          [st]: { par: redacteur || '—', le: date },
                      },
                  }
                : b,
        );
        setBts(l);
        try {
            await window.storage.set('bons_travaux', JSON.stringify(l), true);
        } catch {
            /* non bloquant */
        }
        log(`${num} → ${st}`);
        flash(`${num} : ${st}`);
    };
    /* Entretiens dus d'après le compteur ou la date du dernier passage */
    const entretiensDus = () => {
        const out = [];
        Object.entries(PLAN_ENTRETIEN).forEach(([eq, taches]) => {
            const c = compteurs[eq] || {};
            taches.forEach((t) => {
                const dernier = c[t.t];
                if (!dernier) {
                    out.push({
                        eq,
                        t: t.t,
                        etat: 'JAMAIS FAIT',
                        u: t.u,
                        i: t.i,
                    });
                    return;
                }
                if (t.u === 'mois') {
                    const j = Math.round(
                        (new Date(date) - new Date(dernier.le)) / 86400000,
                    );
                    if (j >= t.i * 30)
                        out.push({
                            eq,
                            t: t.t,
                            etat: `${j} j depuis le dernier`,
                            u: t.u,
                            i: t.i,
                        });
                } else {
                    const actuel = parseFloat(c.valeur || 0),
                        fait = parseFloat(dernier.valeur || 0);
                    if (actuel - fait >= t.i)
                        out.push({
                            eq,
                            t: t.t,
                            etat: `${Math.round(actuel - fait)} ${t.u} depuis le dernier`,
                            u: t.u,
                            i: t.i,
                        });
                }
            });
        });
        return out;
    };

    /* ── assignation + rotation ── */
    const [nc, setNc] = useState({ culture: '', j0: today });
    const avertRotation = (l, cult) => {
        const h = histoCult[l] || [];
        const fam = FAMILLE[cult];
        const d = DELAI_FAM[fam];
        if (!d) return null;
        const recents = h.slice(0, d).map((x) => FAMILLE[x.culture]);
        return recents.includes(fam)
            ? `${fam} déjà cultivée dans les ${d} derniers cycles sur ${l}`
            : null;
    };
    const assigner = async () => {
        if (assign[lieu]) return flash("Libérez d'abord la culture en place");
        if (!nc.culture || !nc.j0)
            return flash('Culture et date J0 obligatoires');
        const w = avertRotation(lieu, nc.culture);
        if (
            w &&
            !window.confirm(
                `ROTATION : ${w}.\n\nLe plan V32 demande d'attendre. Assigner quand même ?`,
            )
        )
            return;
        const a = { ...assign, [lieu]: { culture: nc.culture, j0: nc.j0 } };
        setAssign(a);
        await window.storage.set('assignations', JSON.stringify(a), true);
        log(`Culture ${nc.culture} assignée à ${lieu}`);
        setNc({ culture: '', j0: today });
        flash('Culture assignée');
    };
    const liberer = async () => {
        const old = assign[lieu];
        const a = { ...assign };
        delete a[lieu];
        const h = { ...histoCult };
        h[lieu] = [
            { culture: old.culture, j0: old.j0, fin: date },
            ...(h[lieu] || []),
        ].slice(0, 8);
        setAssign(a);
        setHistoCult(h);
        await window.storage.set('assignations', JSON.stringify(a), true);
        await window.storage.set('histo_cultures', JSON.stringify(h), true);
        log(`Culture ${old.culture} retirée de ${lieu}`);
        flash('Parcelle libérée — historique conservé', 2800);
    };

    const jPlus = (l) => {
        const a = assign[l];
        return a
            ? Math.floor((new Date(date) - new Date(a.j0)) / 86400000)
            : null;
    };
    const tachesDues = (l) => {
        const a = assign[l];
        if (!a) return [];
        const j = jPlus(l);
        return (CAL[a.culture] || [])
            .map(([jour, t, dd]) => ({
                jour,
                t,
                d: dd,
                statut:
                    j === jour
                        ? "AUJOURD'HUI"
                        : j > jour && j - jour <= 5
                          ? 'EN RETARD'
                          : jour > j && jour - j <= 10
                            ? 'BIENTÔT'
                            : null,
            }))
            .filter((x) => x.statut);
    };

    /* ── DÛ ET NON SAISI ── */
    const nonSaisi = () => {
        const out = [];
        Object.keys(assign)
            .filter((l) => LIEUX.includes(l))
            .forEach((l) => {
                tachesDues(l)
                    .filter((t) => t.statut !== 'BIENTÔT')
                    .forEach((t) => {
                        const fait =
                            travaux.some((x) => x.lieu === l) ||
                            produits.some((x) => x.lieu === l) ||
                            recoltes.some((x) => x.lieu === l);
                        if (!fait) out.push({ lieu: l, ...t });
                    });
            });
        return out;
    };

    /* ── saisies ── */
    const [tv, setTv] = useState({
        tache: '',
        qte: '',
        unite: 'planches',
        qui: [],
    });
    const [pr, setPr] = useState({ prods: [], doses: {}, sortie: '', qui: [] });
    const [ea, setEa] = useState({ minutes: '', doigt: '', souci: '' });
    const [rc, setRc] = useState({ kg: '', qualite: '', dest: '', perte: '' });
    const [ch, setCh] = useState({
        effectif: '',
        naissances: '',
        mortalites: '',
        cause: '',
    });
    const [al, setAl] = useState({ aliment: '', kg: '', eau: '' });
    const [sa, setSa] = useState({ soin: '', produit: '', nb: '', qui: [] });
    const [pb, setPb] = useState({ quoi: '', photo: '' });
    const [stk, setStk] = useState({ produit: '', qte: '' });

    const add = (ok, l, s, c, item, reset, msg) => {
        if (!ok) return flash(msg);
        const n = [...l, { ...item, lieu }];
        s(n);
        sauver({ [c]: n });
        reset();
        log(`${c} sur ${lieu}`);
    };
    const del = (l, s, i, c) => {
        const n = l.filter((_, k) => k !== i);
        s(n);
        sauver({ [c]: n });
    };

    /* ── contrôle de dose ── */
    const verifDose = (p, val) => {
        const r = REF[p];
        const v = parseFloat(val);
        if (!r || !v) return null;
        const k = v / r.d;
        if (k > 1.5)
            return {
                n: 'HAUT',
                m: `${k.toFixed(1)} × la dose de référence (${r.d} ${r.u})`,
            };
        if (k < 0.5)
            return {
                n: 'BAS',
                m: `${(k * 100).toFixed(0)} % de la dose de référence (${r.d} ${r.u})`,
            };
        return null;
    };
    const dernierGroupe = () => {
        const g = [];
        produits.forEach((p) =>
            (p.prods || []).forEach((x) => {
                if (REF[x] && REF[x].g) g.push(REF[x].g);
            }),
        );
        return g;
    };

    const ajoutProduit = async () => {
        if (!lieu || !pr.prods.length)
            return flash('Lieu et produit obligatoires');
        for (const p of pr.prods) {
            const w = verifDose(p, pr.doses[p]);
            if (
                w &&
                !window.confirm(
                    `DOSE ${w.n} — ${p}\n\n${w.m}\n\nConfirmer cette dose ?`,
                )
            )
                return;
        }
        const gNew = pr.prods.map((p) => REF[p] && REF[p].g).filter(Boolean);
        const gOld = dernierGroupe();
        const rep = gNew.filter((g) => gOld.includes(g));
        if (
            rep.length &&
            !window.confirm(
                `RÉSISTANCE — le groupe ${rep.join(', ')} a déjà été appliqué aujourd'hui.\n\nAlterner les groupes protège l'efficacité. Continuer ?`,
            )
        )
            return;
        const darMax = Math.max(
            0,
            ...pr.prods.map((p) => (REF[p] && REF[p].dar) || 0),
        );
        const dd = new Date(date);
        dd.setDate(dd.getDate() + darMax);
        const darDate = dd.toISOString().slice(0, 10);
        const n = [...produits, { ...pr, lieu, dar: darDate }];
        setProduits(n);
        const nd = { ...dars, [lieu]: darDate };
        setDars(nd);
        await window.storage.set('dars', JSON.stringify(nd), true);
        if (pr.sortie) {
            const s = { ...stock };
            pr.prods.forEach((p) => {
                s[p] = Math.max(
                    0,
                    (parseFloat(s[p]) || 0) -
                        parseFloat(pr.sortie) / pr.prods.length,
                );
            });
            setStock(s);
            await window.storage.set('stock', JSON.stringify(s), true);
        }
        sauver({ produits: n });
        setPr({ prods: [], doses: {}, sortie: '', qui: [] });
        log(`Traitement sur ${lieu} — DAR ${darDate}`);
        flash(`Enregistré · récolte autorisée dès le ${darDate}`, 3200);
    };

    const ajoutRecolte = () => {
        if (!lieu || !rc.kg) return flash('Lieu et quantité obligatoires');
        const d = dars[lieu];
        if (d && date < d)
            return flash(
                `RÉCOLTE INTERDITE — délai avant récolte jusqu'au ${d}`,
                4500,
            );
        add(
            true,
            recoltes,
            setRecoltes,
            'recoltes',
            rc,
            () => setRc({ kg: '', qualite: '', dest: '', perte: '' }),
            '',
        );
    };

    const alerte = produits.some((p) =>
        (p.prods || []).some((x) =>
            INTERDITS.some((y) => x.toUpperCase().includes(y)),
        ),
    );
    const totalRec = recoltes.reduce((s, r) => s + (parseFloat(r.kg) || 0), 0);
    const totalMorts = cheptel.reduce(
        (s, c) => s + (parseFloat(c.mortalites) || 0),
        0,
    );

    const rapport = () => {
        const L = [
            `RAPPORT ${bureau === 'AGRI' ? 'BT AGRI' : 'BT ANIMAL'} — ${date}`,
        ];
        L.push(
            `Centre de coût : ${CC} — ${(CENTRES.find((c) => c.c === CC) || {}).n || ''}`,
        );
        if (meteo)
            L.push(`Météo : ${meteo}${pluie ? ` · pluie ${pluie} mm` : ''}`);
        if (presents)
            L.push(
                `Présents : ${presents}${absents ? ' | Absents : ' + absents : ''}`,
            );
        if (redacteur) L.push(`Rédigé par : ${redacteur}`);
        L.push('');
        const occ = Object.entries(assign).filter(([k]) => LIEUX.includes(k));
        if (occ.length) {
            L.push('CULTURES EN PLACE');
            occ.forEach(([k, v]) =>
                L.push(`  ${k} — ${v.culture} — J+${jPlus(k)}`),
            );
            L.push('');
        }
        const bloc = (t, arr, fn) => {
            L.push(t);
            arr.length
                ? arr.forEach((x, i) => L.push(`  ${i + 1}. ${fn(x)}`))
                : L.push('  (aucun)');
            L.push('');
        };
        bloc(
            'TRAVAUX',
            travaux,
            (t) =>
                `${t.lieu} — ${t.tache} — ${t.qte} ${t.unite} — ${(t.qui || []).join(', ') || '—'}`,
        );
        if (bureau === 'AGRI') {
            bloc(
                'PRODUITS',
                produits,
                (p) =>
                    `${p.lieu} — ${(p.prods || []).map((x) => `${x} ${p.doses && p.doses[x] ? p.doses[x] + ' ' + (REF[x] ? REF[x].u : '') : ''}`).join(' + ')}${p.dar ? ` — RÉCOLTE AUTORISÉE DÈS LE ${p.dar}` : ''}`,
            );
            bloc(
                'IRRIGATION',
                eau,
                (e) =>
                    `${e.lieu} — ${e.minutes} min — doigt : ${e.doigt || 'non fait'}${e.souci ? ' — ' + e.souci : ''}`,
            );
            bloc(
                `RÉCOLTE — TOTAL ${totalRec} kg`,
                recoltes,
                (r) =>
                    `${r.lieu} — ${r.kg} kg${r.qualite ? ' — ' + r.qualite : ''}${r.dest ? ' → ' + r.dest : ''}${r.perte ? ' — pertes ' + r.perte + ' kg' : ''}`,
            );
        } else {
            bloc(
                `CHEPTEL — mortalités : ${totalMorts}`,
                cheptel,
                (c) =>
                    `${c.lieu} — effectif ${c.effectif}${c.naissances ? ' — naissances ' + c.naissances : ''}${c.mortalites ? ' — MORTALITÉS ' + c.mortalites + (c.cause ? ' (' + c.cause + ')' : '') : ''}`,
            );
            bloc(
                'ALIMENTATION',
                alim,
                (a) =>
                    `${a.lieu} — ${a.aliment} — ${a.kg} kg${a.eau ? ' — eau : ' + a.eau : ''}`,
            );
            bloc(
                'SANTÉ',
                sante,
                (s) =>
                    `${s.lieu} — ${s.soin}${s.produit ? ' — ' + s.produit : ''} — ${s.nb} animaux`,
            );
        }
        if (formFreq.length)
            bloc(
                'FORMULAIRES PÉRIODIQUES',
                formFreq,
                (f) => `${f.freq} — ${f.faits}/${f.total} points`,
            );
        bloc('PROBLÈMES', problemes, (p) => `${p.lieu} — ${p.quoi}`);
        const epiJour = epis.filter((e) => e.remise === date);
        if (epiJour.length)
            bloc(
                "EPI REMIS AUJOURD'HUI",
                epiJour,
                (e) =>
                    `${e.agent.split(' —')[0]} — ${e.type}${e.taille ? ' taille ' + e.taille : ''} — valide jusqu'au ${e.expire}${e.motif ? ' (' + e.motif + ')' : ''}`,
            );
        const rqJour = reqs.filter((r) => r.date === date);
        if (rqJour.length)
            bloc(
                'RÉQUISITIONS DU JOUR',
                rqJour,
                (r) =>
                    `${r.num} — ${TYPES_REQ[r.type] ? TYPES_REQ[r.type].n : r.type} — ${r.objet} — ${r.valeur} USD — centre ${r.cc} [${r.statut}]`,
            );
        const bas = sousMini();
        if (bas.length)
            bloc(
                '⚠️ ARTICLES SOUS LE SEUIL',
                bas,
                (a) => `${a.code} ${a.lib} — reste ${a.qte} ${a.unite}`,
            );
        const btJour = bts.filter((b) => b.date === date);
        if (btJour.length)
            bloc(
                'BONS DE TRAVAIL DU JOUR',
                btJour,
                (b) =>
                    `${b.num} — ${b.equip} — ${b.desc} [${b.statut}]${b.cout ? ` — ${b.cout} USD` : ''}`,
            );
        const ed = entretiensDus();
        if (ed.length)
            bloc(
                '⚠️ ENTRETIENS DUS',
                ed,
                (x) => `${x.eq} — ${x.t} (${x.etat})`,
            );
        const epiExp = epis.filter((e) => !e.remplace && joursRestants(e) < 0);
        if (epiExp.length)
            bloc(
                '⚠️ EPI EXPIRÉS',
                epiExp,
                (e) =>
                    `${e.agent.split(' —')[0]} — ${e.type} — expiré depuis le ${e.expire}`,
            );
        const ns = nonSaisi();
        if (ns.length) {
            L.push("⚠️ DÛ D'APRÈS LE PLAN ET NON SAISI");
            ns.forEach((x, i) =>
                L.push(
                    `  ${i + 1}. ${x.lieu} — J+${x.jour} — ${x.t} [${x.statut}]`,
                ),
            );
            L.push('');
        }
        return L.join('\n');
    };

    const csv = () => {
        const R = [
            [
                'date',
                'bureau',
                'section',
                'lieu',
                'culture',
                'detail',
                'quantite',
                'unite',
                'personnes',
            ],
        ];
        travaux.forEach((t) =>
            R.push([
                date,
                bureau,
                'travail',
                t.lieu,
                (assign[t.lieu] || {}).culture || '',
                t.tache,
                t.qte,
                t.unite,
                (t.qui || []).join(' / '),
            ]),
        );
        produits.forEach((p) =>
            R.push([
                date,
                bureau,
                'produit',
                p.lieu,
                (assign[p.lieu] || {}).culture || '',
                (p.prods || []).join(' + '),
                p.sortie || '',
                '',
                p.dar || '',
            ]),
        );
        eau.forEach((e) =>
            R.push([
                date,
                bureau,
                'irrigation',
                e.lieu,
                '',
                e.doigt || '',
                e.minutes,
                'minutes',
                e.souci || '',
            ]),
        );
        recoltes.forEach((r) =>
            R.push([
                date,
                bureau,
                'recolte',
                r.lieu,
                (assign[r.lieu] || {}).culture || '',
                r.dest || '',
                r.kg,
                'kg',
                r.qualite || '',
            ]),
        );
        cheptel.forEach((c) =>
            R.push([
                date,
                bureau,
                'cheptel',
                c.lieu,
                '',
                c.cause || '',
                c.effectif,
                'animaux',
                `morts:${c.mortalites || 0}`,
            ]),
        );
        alim.forEach((a) =>
            R.push([
                date,
                bureau,
                'aliment',
                a.lieu,
                '',
                a.aliment,
                a.kg,
                'kg',
                a.eau || '',
            ]),
        );
        sante.forEach((s) =>
            R.push([
                date,
                bureau,
                'sante',
                s.lieu,
                '',
                s.soin,
                s.nb,
                'animaux',
                s.produit || '',
            ]),
        );
        problemes.forEach((p) =>
            R.push([
                date,
                bureau,
                'probleme',
                p.lieu,
                '',
                p.quoi,
                '',
                '',
                p.photo || '',
            ]),
        );
        nonSaisi().forEach((x) =>
            R.push([
                date,
                bureau,
                'NON_SAISI',
                x.lieu,
                (assign[x.lieu] || {}).culture || '',
                x.t,
                x.jour,
                'J+',
                x.statut,
            ]),
        );
        return R.map((l) =>
            l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
        ).join('\n');
    };
    const telechargerCSV = () => {
        try {
            const b = new Blob([csv()], { type: 'text/csv;charset=utf-8' });
            const u = URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u;
            a.download = `FKN_${bureau}_${date}.csv`;
            a.click();
            URL.revokeObjectURL(u);
            log('Export CSV');
            flash('Fichier CSV téléchargé');
        } catch {
            flash('Export impossible — copiez le texte du rapport');
        }
    };

    const versWA = () => {
        log('Envoi WhatsApp');
        window.open(
            `https://wa.me/?text=${encodeURIComponent(rapport())}`,
            '_blank',
        );
    };
    const versMail = (dest) => {
        const suj = `Rapport ${bureau === 'AGRI' ? 'BT Agri' : 'BT Animal'} — ${date}`;
        const cc = dest === MGMT ? '' : `&cc=${encodeURIComponent(MGMT)}`;
        log(`E-mail à ${dest}`);
        window.location.href = `mailto:${dest}?subject=${encodeURIComponent(suj)}${cc}&body=${encodeURIComponent(rapport())}`;
    };

    const chargerHisto = async () => {
        try {
            const r = await window.storage.list(`rap:${bureau}:`, true);
            const ks = r && r.keys ? [...r.keys].sort().reverse() : [];
            const out = [];
            for (const k of ks.slice(0, 40)) {
                try {
                    const v = await window.storage.get(k, true);
                    if (v && v.value) {
                        const d = JSON.parse(v.value);
                        out.push({
                            cle: k,
                            date: k.split(':')[2],
                            n:
                                (d.travaux || []).length +
                                (d.cheptel || []).length,
                            pb: (d.problemes || []).length,
                        });
                    }
                } catch {
                    /* illisible */
                }
            }
            setHisto(out);
        } catch {
            flash('Historique indisponible');
        }
    };
    const chargerJournal = async () => {
        try {
            const r = await window.storage.get('journal', true);
            setJournal(r && r.value ? JSON.parse(r.value) : []);
        } catch {
            setJournal([]);
        }
    };
    useEffect(() => {
        if (vue === 'histo') chargerHisto();
        if (vue === 'journal') chargerJournal();
    }, [vue, bureau]);

    const SECTIONS =
        bureau === 'AGRI'
            ? [
                  ['travaux', 'Travaux'],
                  ['produits', 'Produits'],
                  ['eau', 'Irrigation'],
                  ['recolte', 'Récolte'],
                  ['soucis', 'Problèmes'],
              ]
            : [
                  ['cheptel', 'Cheptel'],
                  ['alim', 'Aliment'],
                  ['sante', 'Santé'],
                  ['travaux', 'Travaux'],
                  ['soucis', 'Problèmes'],
              ];
    const ORDRE = [
        'accueil',
        'jour',
        ...SECTIONS.map((s) => s[0]),
        'freq',
        'rapport',
    ];
    const idx = ORDRE.indexOf(vue);
    const NavBas = () => (
        <div
            style={{
                display: 'flex',
                gap: 10,
                marginTop: 22,
                paddingTop: 16,
                borderTop: `2px solid ${C.line}`,
            }}
        >
            <button
                onClick={() => setVue(ORDRE[Math.max(0, idx - 1)])}
                disabled={idx <= 0}
                style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 4,
                    border: `2px solid ${C.line}`,
                    background: '#fff',
                    color: idx <= 0 ? '#bbb' : C.ink,
                    fontFamily: 'Oswald, sans-serif',
                    cursor: idx <= 0 ? 'default' : 'pointer',
                }}
            >
                ← Retour
            </button>
            <button
                onClick={() =>
                    setVue(ORDRE[Math.min(ORDRE.length - 1, idx + 1)])
                }
                disabled={idx >= ORDRE.length - 1}
                style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 4,
                    border: 'none',
                    background: idx >= ORDRE.length - 1 ? '#ccc' : C.laterite,
                    color: '#fff',
                    fontFamily: 'Oswald, sans-serif',
                    cursor: 'pointer',
                }}
            >
                Suivant →
            </button>
        </div>
    );

    const EnTete = () => {
        const a = assign[lieu];
        const dues = tachesDues(lieu);
        const d = dars[lieu];
        return (
            <>
                <div
                    style={{
                        background: a ? ACC : '#8A8A80',
                        color: '#fff',
                        padding: 16,
                        borderRadius: 4,
                        marginBottom: 14,
                    }}
                >
                    <div
                        style={{
                            fontFamily: 'Oswald, sans-serif',
                            fontSize: 21,
                            fontWeight: 700,
                        }}
                    >
                        {lieu}
                    </div>
                    {a ? (
                        <>
                            <div style={{ fontSize: 16, marginTop: 4 }}>
                                {a.culture} · planté le {a.j0}
                            </div>
                            <div
                                style={{
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 34,
                                    fontWeight: 700,
                                    marginTop: 6,
                                }}
                            >
                                J+{jPlus(lieu)}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 15, marginTop: 6 }}>
                            Aucune culture assignée
                        </div>
                    )}
                </div>
                {d && date < d && (
                    <div
                        style={{
                            background: C.red,
                            color: '#fff',
                            padding: 14,
                            borderRadius: 4,
                            marginBottom: 14,
                            fontWeight: 700,
                            fontSize: 15,
                        }}
                    >
                        ⚠️ DÉLAI AVANT RÉCOLTE en cours — aucune récolte
                        autorisée avant le {d}
                    </div>
                )}
                {dues.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <Label>Tâches dues d'après le calendrier</Label>
                        {dues.map((x, i) => {
                            const col =
                                x.statut === 'EN RETARD'
                                    ? C.red
                                    : x.statut === "AUJOURD'HUI"
                                      ? C.laterite
                                      : C.green2;
                            return (
                                <Card key={i} tone={col}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 16,
                                                fontWeight: 700,
                                            }}
                                        >
                                            J+{x.jour} — {x.t}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: '#fff',
                                                background: col,
                                                padding: '3px 8px',
                                                borderRadius: 3,
                                                whiteSpace: 'nowrap',
                                                height: 'fit-content',
                                            }}
                                        >
                                            {x.statut}
                                        </div>
                                    </div>
                                    {x.d && (
                                        <div
                                            style={{
                                                fontSize: 14.5,
                                                marginTop: 5,
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {x.d}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </>
        );
    };

    return (
        <div
            className="farm-app"
            style={{
                minHeight: '100vh',
                background: C.paper,
                fontFamily: 'Inter, sans-serif',
                color: C.ink,
            }}
        >
            <Head title="Pilotage de la ferme" />
            <style>{FONTS}</style>
            <div
                style={{
                    background: ACC,
                    padding: '14px 16px',
                    boxShadow: '0 8px 30px rgba(20,45,30,.18)',
                }}
            >
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <div
                            className="farm-brand"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            <img
                                src="/brand-logo.png"
                                alt="Logo Ferme Kabanda Naweza"
                                style={{
                                    width: 46,
                                    height: 46,
                                    objectFit: 'contain',
                                    borderRadius: 10,
                                    background: '#fff',
                                    padding: 3,
                                }}
                            />
                            <div className="farm-brand-copy">
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 11,
                                        letterSpacing: 2.2,
                                        color: '#C9DCCF',
                                    }}
                                >
                                    FERME KABANDA NAWEZA
                                </div>
                                <div
                                    style={{
                                        color: '#fff',
                                        fontSize: 13,
                                        marginTop: 3,
                                    }}
                                >
                                    Bonjour, {auth?.user?.name || 'Utilisateur'}
                                </div>
                            </div>
                        </div>
                        <div
                            className="farm-header-actions"
                            style={{ display: 'flex', gap: 6 }}
                        >
                            {auth?.user?.is_admin && (
                                <button
                                    onClick={() => router.visit('/admin')}
                                    style={{
                                        border: '1px solid rgba(255,255,255,.45)',
                                        background: '#D8A84E',
                                        color: '#17352A',
                                        padding: '8px 11px',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Admin
                                </button>
                            )}
                            <button
                                onClick={() => router.post('/logout')}
                                style={{
                                    border: '1px solid rgba(255,255,255,.45)',
                                    background: 'rgba(255,255,255,.12)',
                                    color: '#fff',
                                    padding: '8px 11px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Sortir
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {[
                            ['AGRI', 'BT AGRI'],
                            ['ANI', 'BT ANIMAL'],
                        ].map(([k, l]) => (
                            <button
                                key={k}
                                onClick={() => {
                                    setBureau(k);
                                    setVue('accueil');
                                    setLieu('');
                                }}
                                style={{
                                    flex: 1,
                                    padding: '11px 8px',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    borderRadius: 4,
                                    border:
                                        bureau === k
                                            ? '3px solid #fff'
                                            : '2px solid rgba(255,255,255,.45)',
                                    background:
                                        bureau === k ? '#fff' : 'transparent',
                                    color: bureau === k ? ACC : '#fff',
                                    fontFamily: 'Oswald, sans-serif',
                                    cursor: 'pointer',
                                }}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            marginTop: 8,
                            width: '100%',
                            padding: 11,
                            fontSize: 16,
                            borderRadius: 4,
                            border: 'none',
                        }}
                    />
                </div>
            </div>

            <div
                style={{
                    padding: 16,
                    maxWidth: 640,
                    margin: '0 auto',
                    paddingBottom: 40,
                }}
            >
                {alerte && (
                    <div
                        style={{
                            background: C.red,
                            color: '#fff',
                            padding: 14,
                            borderRadius: 4,
                            marginBottom: 14,
                            fontWeight: 700,
                        }}
                    >
                        ⚠️ Produit INTERDIT saisi — ne pas appliquer sans accord
                        de la Direction.
                    </div>
                )}

                {vue === 'accueil' && (
                    <>
                        {epis.filter((e) => !e.remplace && joursRestants(e) < 0)
                            .length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        epis.filter(
                                            (e) =>
                                                !e.remplace &&
                                                joursRestants(e) < 0,
                                        ).length
                                    }{' '}
                                    EPI EXPIRÉ(S)
                                </div>
                                <div style={{ fontSize: 14, marginTop: 4 }}>
                                    Aucun traitement phytosanitaire sans EPI
                                    valide.
                                </div>
                            </div>
                        )}
                        {reqs.filter((r) => r.statut === 'Demandée').length >
                            0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        reqs.filter(
                                            (r) => r.statut === 'Demandée',
                                        ).length
                                    }{' '}
                                    RÉQUISITION(S) EN ATTENTE —{' '}
                                    {reqs
                                        .filter((r) => r.statut === 'Demandée')
                                        .reduce(
                                            (s, r) =>
                                                s + (parseFloat(r.valeur) || 0),
                                            0,
                                        )
                                        .toFixed(0)}{' '}
                                    USD
                                </div>
                            </div>
                        )}
                        {sousMini().length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {sousMini().length} ARTICLE(S) SOUS LE SEUIL
                                    MINIMUM
                                </div>
                            </div>
                        )}
                        {bts.filter((b) => b.statut === 'Demandé').length >
                            0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        bts.filter(
                                            (b) => b.statut === 'Demandé',
                                        ).length
                                    }{' '}
                                    BON(S) DE TRAVAIL EN ATTENTE D'APPROBATION
                                </div>
                            </div>
                        )}
                        {nonSaisi().length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {nonSaisi().length} TÂCHE(S) DUE(S) NON
                                    SAISIE(S)
                                </div>
                                <div style={{ fontSize: 14, marginTop: 4 }}>
                                    {nonSaisi()
                                        .slice(0, 4)
                                        .map((x) => `${x.lieu} : ${x.t}`)
                                        .join(' · ')}
                                </div>
                            </div>
                        )}
                        <>
                            <Label>
                                Plan de la ferme — K1, 19,57 ha mesurés
                            </Label>
                            <CarteFerme
                                carte={carte}
                                assign={assign}
                                jPlus={jPlus}
                                tachesDues={tachesDues}
                                lieu={lieu}
                                setLieu={setLieu}
                                ACC={ACC}
                                onOuvrir={() => setVue('parcelle')}
                            />
                        </>
                        <Label>
                            Choisir{' '}
                            {bureau === 'AGRI' ? 'la parcelle' : "l'atelier"}
                        </Label>
                        {LIEUX.map((l) => {
                            const a = assign[l];
                            const n = a ? tachesDues(l).length : 0;
                            return (
                                <button
                                    key={l}
                                    onClick={() => {
                                        setLieu(l);
                                        setVue('parcelle');
                                    }}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: 15,
                                        marginBottom: 9,
                                        borderRadius: 4,
                                        border: `1px solid ${C.line}`,
                                        borderLeft: `6px solid ${a ? ACC : '#C9C4B4'}`,
                                        background: '#fff',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 10,
                                        }}
                                    >
                                        <div>
                                            <div
                                                style={{
                                                    fontFamily:
                                                        'Oswald, sans-serif',
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    color: C.ink,
                                                }}
                                            >
                                                {l}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    color: a
                                                        ? C.green2
                                                        : '#999',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {a
                                                    ? `${a.culture} · J+${jPlus(l)}`
                                                    : 'libre'}
                                            </div>
                                        </div>
                                        {n > 0 && (
                                            <div
                                                style={{
                                                    background: C.laterite,
                                                    color: '#fff',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    padding: '5px 10px',
                                                    borderRadius: 3,
                                                }}
                                            >
                                                {n} tâche(s)
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        <div
                            style={{ display: 'flex', gap: 10, marginTop: 16 }}
                        >
                            <Btn tone="ghost" onClick={() => setVue('jour')}>
                                Journée
                            </Btn>
                            <Btn tone="ghost" onClick={() => setVue('freq')}>
                                Formulaires
                            </Btn>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Btn tone="ghost" onClick={() => setVue('stock')}>
                                Stock
                            </Btn>
                            <Btn tone="ghost" onClick={() => setVue('epi')}>
                                EPI
                            </Btn>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Btn tone="ghost" onClick={() => setVue('maint')}>
                                Maintenance
                            </Btn>
                            <Btn tone="ghost" onClick={() => setVue('inv')}>
                                Inventaire
                            </Btn>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Btn tone="ghost" onClick={() => setVue('req')}>
                                Réquisitions
                            </Btn>
                            <Btn tone="ghost" onClick={() => setVue('rapport')}>
                                Rapport
                            </Btn>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Btn tone="ghost" onClick={() => setVue('histo')}>
                                Historique
                            </Btn>
                            <Btn tone="ghost" onClick={() => setVue('journal')}>
                                Journal
                            </Btn>
                        </div>
                    </>
                )}

                {vue === 'parcelle' && lieu && (
                    <>
                        <EnTete />
                        {bureau === 'AGRI' &&
                            carte.some((f) => f.n === lieu) && (
                                <CarteFerme
                                    carte={carte}
                                    assign={assign}
                                    jPlus={jPlus}
                                    tachesDues={tachesDues}
                                    lieu={lieu}
                                    setLieu={setLieu}
                                    ACC={ACC}
                                    onOuvrir={() => {}}
                                />
                            )}
                        {!assign[lieu] ? (
                            <>
                                {(histoCult[lieu] || []).length > 0 && (
                                    <div
                                        style={{
                                            background: '#fff',
                                            borderLeft: `5px solid ${C.amber}`,
                                            padding: 14,
                                            borderRadius: 4,
                                            marginBottom: 14,
                                            fontSize: 14.5,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <b>Cultures précédentes :</b>{' '}
                                        {(histoCult[lieu] || [])
                                            .map(
                                                (h) =>
                                                    `${h.culture} (fin ${h.fin})`,
                                            )
                                            .join(' · ')}
                                    </div>
                                )}
                                <Label>Assigner une culture</Label>
                                <Sel
                                    value={nc.culture}
                                    onChange={(v) =>
                                        setNc({ ...nc, culture: v })
                                    }
                                    options={cultures}
                                    placeholder="Choisir la culture"
                                />
                                {nc.culture &&
                                    avertRotation(lieu, nc.culture) && (
                                        <div
                                            style={{
                                                background: C.red,
                                                color: '#fff',
                                                padding: 12,
                                                borderRadius: 4,
                                                marginBottom: 14,
                                                fontSize: 14.5,
                                                fontWeight: 600,
                                            }}
                                        >
                                            ⚠️ ROTATION :{' '}
                                            {avertRotation(lieu, nc.culture)}
                                        </div>
                                    )}
                                <Label>Date de plantation (J0)</Label>
                                <input
                                    type="date"
                                    value={nc.j0}
                                    onChange={(e) =>
                                        setNc({ ...nc, j0: e.target.value })
                                    }
                                    style={{
                                        width: '100%',
                                        padding: 14,
                                        fontSize: 17,
                                        borderRadius: 4,
                                        border: `2px solid ${C.line}`,
                                        marginBottom: 14,
                                    }}
                                />
                                <Btn onClick={assigner}>
                                    Assigner cette culture
                                </Btn>
                            </>
                        ) : (
                            <>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 10,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {SECTIONS.map(([k, l]) => (
                                        <button
                                            key={k}
                                            onClick={() => setVue(k)}
                                            style={{
                                                flex: '1 0 44%',
                                                padding: 16,
                                                fontSize: 15,
                                                fontWeight: 700,
                                                borderRadius: 4,
                                                border: 'none',
                                                background: C.laterite,
                                                color: '#fff',
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <Btn tone="danger" onClick={liberer}>
                                        Libérer la parcelle
                                    </Btn>
                                    <div
                                        style={{
                                            fontSize: 13.5,
                                            color: '#666',
                                            marginTop: -4,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        L'historique de culture est conservé :
                                        l'application vérifiera la rotation à la
                                        prochaine assignation.
                                    </div>
                                </div>
                            </>
                        )}
                        <NavBas />
                    </>
                )}

                {vue === 'jour' && (
                    <>
                        <Label>Météo</Label>
                        <Sel
                            value={meteo}
                            onChange={(v) => {
                                setMeteo(v);
                                sauver({ meteo: v });
                            }}
                            options={['Sec', 'Pluie', 'Couvert', 'Forte pluie']}
                            placeholder="Choisir"
                        />
                        <Label>Pluviomètre — combien de mm</Label>
                        <Compteur value={pluie} onChange={setPluie} />
                        <Label>Personnes présentes</Label>
                        <Compteur value={presents} onChange={setPresents} />
                        <Label>Absents</Label>
                        <Txt
                            value={absents}
                            onChange={setAbsents}
                            placeholder="Noms, ou « aucun »"
                        />
                        <Label>Qui remplit ce rapport</Label>
                        <Sel
                            value={redacteur}
                            onChange={(v) => {
                                setRedacteur(v);
                                sauver({
                                    redacteur: v,
                                    presents,
                                    absents,
                                    pluie,
                                });
                            }}
                            options={AGENTS}
                            placeholder="Choisir"
                        />
                        <Label>Centre de coût de la journée</Label>
                        <Sel
                            value={cc}
                            onChange={setCc}
                            options={CENTRES.map((c) => `${c.c} — ${c.n}`)}
                            placeholder={`Par défaut : ${CC_DEFAUT[bureau]} — ${(CENTRES.find((c) => c.c === CC_DEFAUT[bureau]) || {}).n}`}
                        />
                        <div
                            style={{
                                fontSize: 13.5,
                                color: '#666',
                                marginTop: -8,
                                marginBottom: 14,
                                lineHeight: 1.5,
                            }}
                        >
                            Toutes les saisies de la journée — travaux,
                            produits, bons de travail, réquisitions — seront
                            imputées à <b>{CC}</b> sauf indication contraire.
                        </div>
                        <NavBas />
                    </>
                )}

                {vue === 'travaux' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir le lieu"
                            />
                        )}
                        <Label>Quelle tâche</Label>
                        {!lieu && bureau === 'ANI' && (
                            <div
                                style={{
                                    fontSize: 14,
                                    color: C.red,
                                    marginBottom: 10,
                                }}
                            >
                                Choisissez d'abord l'atelier — les tâches
                                proposées en dépendent.
                            </div>
                        )}
                        <Sel
                            value={tv.tache}
                            onChange={(v) =>
                                setTv({
                                    ...tv,
                                    tache: v,
                                    unite: (UNITES_TACHE[v] || unites)[0],
                                })
                            }
                            options={TACHES_DISPO}
                            placeholder="Choisir"
                        />
                        <Label>Combien</Label>
                        <Compteur
                            value={tv.qte}
                            onChange={(v) => setTv({ ...tv, qte: v })}
                            unite={tv.unite}
                            setUnite={(u) => setTv({ ...tv, unite: u })}
                            unites={unitesPour(tv.tache)}
                        />
                        <Label>Qui a travaillé — plusieurs possibles</Label>
                        <MultiSel
                            options={AGENTS}
                            selected={tv.qui}
                            onChange={(q) => setTv({ ...tv, qui: q })}
                            placeholder="Touchez chaque personne"
                            onAjout={ajouterAgent}
                        />
                        <Btn
                            onClick={() =>
                                add(
                                    lieu && tv.tache && tv.qte,
                                    travaux,
                                    setTravaux,
                                    'travaux',
                                    tv,
                                    () =>
                                        setTv({
                                            tache: '',
                                            qte: '',
                                            unite: 'planches',
                                            qui: [],
                                        }),
                                    'Lieu, tâche et quantité obligatoires',
                                )
                            }
                        >
                            Ajouter
                        </Btn>
                        {travaux.map((t, i) => (
                            <Card key={i}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {t.lieu} — {t.tache}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b
                                        style={{
                                            color: C.laterite,
                                            fontSize: 19,
                                        }}
                                    >
                                        {t.qte} {t.unite}
                                    </b>
                                    {(t.qui || []).length
                                        ? ` · ${t.qui.join(', ')}`
                                        : ''}
                                </div>
                                <button
                                    onClick={() =>
                                        del(travaux, setTravaux, i, 'travaux')
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'produits' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir le lieu"
                            />
                        )}
                        <Label>Produits — plusieurs si mélange en cuve</Label>
                        <MultiSel
                            options={produitsCatalogue}
                            selected={pr.prods}
                            onChange={(p) => setPr({ ...pr, prods: p })}
                            placeholder="Touchez chaque produit"
                        />
                        {pr.prods.map((p) => {
                            const w = verifDose(p, pr.doses[p]);
                            const r = REF[p];
                            return (
                                <div key={p} style={{ marginBottom: 14 }}>
                                    <Label>
                                        {p} — dose en {r?.u || 'unité'}{' '}
                                        {r ? (
                                            <span
                                                style={{
                                                    color: '#888',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                (référence {r.d})
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    color: '#888',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                (dose libre — aucune référence
                                                définie)
                                            </span>
                                        )}
                                    </Label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={pr.doses[p] || ''}
                                        onChange={(e) =>
                                            setPr({
                                                ...pr,
                                                doses: {
                                                    ...pr.doses,
                                                    [p]: e.target.value,
                                                },
                                            })
                                        }
                                        style={{
                                            width: '100%',
                                            padding: 14,
                                            fontSize: 20,
                                            fontWeight: 700,
                                            borderRadius: 4,
                                            textAlign: 'center',
                                            border: `3px solid ${w ? C.red : C.line}`,
                                            fontFamily: 'Oswald, sans-serif',
                                        }}
                                    />
                                    {w && (
                                        <div
                                            style={{
                                                background: C.red,
                                                color: '#fff',
                                                padding: 10,
                                                borderRadius: 4,
                                                marginTop: 6,
                                                fontSize: 14,
                                                fontWeight: 600,
                                            }}
                                        >
                                            ⚠️ DOSE {w.n} — {w.m}
                                        </div>
                                    )}
                                    {r.g && (
                                        <div
                                            style={{
                                                fontSize: 13,
                                                color: '#666',
                                                marginTop: 4,
                                            }}
                                        >
                                            Groupe {r.g} · délai avant récolte{' '}
                                            {r.dar} j
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <Label>
                            Quantité totale sortie du magasin (kg ou L)
                        </Label>
                        <Compteur
                            value={pr.sortie}
                            onChange={(v) => setPr({ ...pr, sortie: v })}
                        />
                        <Label>Qui a mesuré</Label>
                        <MultiSel
                            options={AGENTS}
                            selected={pr.qui}
                            onChange={(q) => setPr({ ...pr, qui: q })}
                            placeholder="Choisir"
                            onAjout={ajouterAgent}
                        />
                        <Btn onClick={ajoutProduit}>
                            Ajouter — la date de récolte sera calculée
                        </Btn>
                        {produits.map((p, i) => (
                            <Card key={i} tone={C.red}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16.5,
                                        fontWeight: 600,
                                    }}
                                >
                                    {(p.prods || []).join(' + ')}
                                </div>
                                <div style={{ fontSize: 14.5, marginTop: 4 }}>
                                    {(p.prods || [])
                                        .map(
                                            (x) =>
                                                `${x} : ${(p.doses && p.doses[x]) || '?'} ${REF[x] ? REF[x].u : ''}`,
                                        )
                                        .join(' · ')}
                                </div>
                                {p.dar && (
                                    <div
                                        style={{
                                            fontSize: 14,
                                            marginTop: 5,
                                            color: C.red,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Récolte autorisée dès le {p.dar}
                                    </div>
                                )}
                                <button
                                    onClick={() =>
                                        del(
                                            produits,
                                            setProduits,
                                            i,
                                            'produits',
                                        )
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'eau' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir le lieu"
                            />
                        )}
                        <Label>Combien de minutes</Label>
                        <Compteur
                            value={ea.minutes}
                            onChange={(v) => setEa({ ...ea, minutes: v })}
                        />
                        <Label>Test du doigt — humide à 10 cm ?</Label>
                        <Sel
                            value={ea.doigt}
                            onChange={(v) => setEa({ ...ea, doigt: v })}
                            options={[
                                'Oui — humide',
                                'Non — encore sec',
                                'Trop mouillé',
                            ]}
                            placeholder="Répondre"
                        />
                        <Label>Problème sur la ligne</Label>
                        <Txt
                            value={ea.souci}
                            onChange={(v) => setEa({ ...ea, souci: v })}
                            placeholder="Goutteur bouché, tuyau enterré…"
                        />
                        <Btn
                            onClick={() =>
                                add(
                                    lieu && ea.minutes,
                                    eau,
                                    setEau,
                                    'eau',
                                    ea,
                                    () =>
                                        setEa({
                                            minutes: '',
                                            doigt: '',
                                            souci: '',
                                        }),
                                    'Lieu et durée obligatoires',
                                )
                            }
                        >
                            Ajouter
                        </Btn>
                        {eau.map((e, i) => (
                            <Card key={i}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {e.lieu}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b style={{ color: C.laterite }}>
                                        {e.minutes} min
                                    </b>{' '}
                                    · doigt : {e.doigt || 'non fait'}
                                </div>
                                {e.souci && (
                                    <div
                                        style={{
                                            fontSize: 14,
                                            color: C.red,
                                            marginTop: 4,
                                        }}
                                    >
                                        ⚠️ {e.souci}
                                    </div>
                                )}
                                <button
                                    onClick={() => del(eau, setEau, i, 'eau')}
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'recolte' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir le lieu"
                            />
                        )}
                        <div
                            style={{
                                background: C.green,
                                color: '#fff',
                                padding: 16,
                                borderRadius: 4,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 13,
                                    letterSpacing: 1.4,
                                    fontFamily: 'Oswald, sans-serif',
                                }}
                            >
                                TOTAL RÉCOLTÉ AUJOURD'HUI
                            </div>
                            <div
                                style={{
                                    fontSize: 38,
                                    fontWeight: 700,
                                    fontFamily: 'Oswald, sans-serif',
                                }}
                            >
                                {totalRec} kg
                            </div>
                        </div>
                        <Label>Combien de kg</Label>
                        <Compteur
                            value={rc.kg}
                            onChange={(v) => setRc({ ...rc, kg: v })}
                        />
                        <Label>Où va cette récolte</Label>
                        <Sel
                            value={rc.dest}
                            onChange={(v) => setRc({ ...rc, dest: v })}
                            options={destinations}
                            placeholder="Choisir la destination"
                        />
                        <Label>Qualité</Label>
                        <Sel
                            value={rc.qualite}
                            onChange={(v) => setRc({ ...rc, qualite: v })}
                            options={[
                                'Grade A — parfait',
                                'Grade B — imperfections',
                                'Grade C — transformation',
                            ]}
                            placeholder="Choisir"
                        />
                        <Label>Pertes / rebuts (kg)</Label>
                        <Compteur
                            value={rc.perte}
                            onChange={(v) => setRc({ ...rc, perte: v })}
                        />
                        <Btn onClick={ajoutRecolte}>Ajouter cette récolte</Btn>
                        {recoltes.map((r, i) => (
                            <Card key={i}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {r.lieu}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b
                                        style={{
                                            color: C.laterite,
                                            fontSize: 19,
                                        }}
                                    >
                                        {r.kg} kg
                                    </b>
                                    {r.dest ? ` → ${r.dest}` : ''}
                                </div>
                                {r.perte > 0 && (
                                    <div
                                        style={{
                                            fontSize: 14,
                                            color: C.red,
                                            marginTop: 4,
                                        }}
                                    >
                                        Pertes : {r.perte} kg
                                    </div>
                                )}
                                <button
                                    onClick={() =>
                                        del(
                                            recoltes,
                                            setRecoltes,
                                            i,
                                            'recoltes',
                                        )
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'cheptel' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir l'atelier"
                            />
                        )}
                        {totalMorts > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                    fontWeight: 700,
                                }}
                            >
                                ⚠️ {totalMorts} mortalité(s) — prévenir la
                                Direction
                            </div>
                        )}
                        <Label>Effectif compté</Label>
                        <Compteur
                            value={ch.effectif}
                            onChange={(v) => setCh({ ...ch, effectif: v })}
                        />
                        <Label>Naissances</Label>
                        <Compteur
                            value={ch.naissances}
                            onChange={(v) => setCh({ ...ch, naissances: v })}
                        />
                        <Label>Mortalités</Label>
                        <Compteur
                            value={ch.mortalites}
                            onChange={(v) => setCh({ ...ch, mortalites: v })}
                        />
                        <Label>Cause présumée</Label>
                        <Txt
                            value={ch.cause}
                            onChange={(v) => setCh({ ...ch, cause: v })}
                            placeholder="Écrasement, maladie, prédateur…"
                        />
                        <Btn
                            onClick={() =>
                                add(
                                    lieu && ch.effectif,
                                    cheptel,
                                    setCheptel,
                                    'cheptel',
                                    ch,
                                    () =>
                                        setCh({
                                            effectif: '',
                                            naissances: '',
                                            mortalites: '',
                                            cause: '',
                                        }),
                                    'Atelier et effectif obligatoires',
                                )
                            }
                        >
                            Ajouter
                        </Btn>
                        {cheptel.map((c, i) => (
                            <Card
                                key={i}
                                tone={c.mortalites > 0 ? C.red : C.green2}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {c.lieu}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b
                                        style={{
                                            color: C.laterite,
                                            fontSize: 19,
                                        }}
                                    >
                                        {c.effectif}
                                    </b>{' '}
                                    animaux
                                    {c.naissances > 0
                                        ? ` · +${c.naissances}`
                                        : ''}
                                </div>
                                {c.mortalites > 0 && (
                                    <div
                                        style={{
                                            fontSize: 14,
                                            color: C.red,
                                            marginTop: 4,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {c.mortalites} mortalité(s)
                                        {c.cause ? ` — ${c.cause}` : ''}
                                    </div>
                                )}
                                <button
                                    onClick={() =>
                                        del(cheptel, setCheptel, i, 'cheptel')
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'alim' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir l'atelier"
                            />
                        )}
                        <Label>Aliment distribué</Label>
                        {!lieu && (
                            <div
                                style={{
                                    fontSize: 14,
                                    color: C.red,
                                    marginBottom: 10,
                                }}
                            >
                                Choisissez d'abord l'atelier — les aliments
                                proposés en dépendent.
                            </div>
                        )}
                        <Sel
                            value={al.aliment}
                            onChange={(v) => setAl({ ...al, aliment: v })}
                            options={ALIM_DISPO}
                            placeholder="Choisir"
                        />
                        <Label>Combien de kg</Label>
                        <Compteur
                            value={al.kg}
                            onChange={(v) => setAl({ ...al, kg: v })}
                        />
                        <Label>Abreuvoirs propres et pleins ?</Label>
                        <Sel
                            value={al.eau}
                            onChange={(v) => setAl({ ...al, eau: v })}
                            options={[
                                'Oui — propres et pleins',
                                "Nettoyés aujourd'hui",
                                "Non — problème d'eau",
                            ]}
                            placeholder="Répondre"
                        />
                        <Btn
                            onClick={() =>
                                add(
                                    lieu && al.aliment && al.kg,
                                    alim,
                                    setAlim,
                                    'alim',
                                    al,
                                    () =>
                                        setAl({ aliment: '', kg: '', eau: '' }),
                                    'Atelier, aliment et quantité obligatoires',
                                )
                            }
                        >
                            Ajouter
                        </Btn>
                        {alim.map((a, i) => (
                            <Card key={i}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {a.lieu} — {a.aliment}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b
                                        style={{
                                            color: C.laterite,
                                            fontSize: 19,
                                        }}
                                    >
                                        {a.kg} kg
                                    </b>
                                    {a.eau ? ` · ${a.eau}` : ''}
                                </div>
                                <button
                                    onClick={() =>
                                        del(alim, setAlim, i, 'alim')
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'sante' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir l'atelier"
                            />
                        )}
                        <Label>Type de soin</Label>
                        <Sel
                            value={sa.soin}
                            onChange={(v) => setSa({ ...sa, soin: v })}
                            options={soins}
                            placeholder="Choisir"
                        />
                        <Label>Produit et dose</Label>
                        <Txt
                            value={sa.produit}
                            onChange={(v) => setSa({ ...sa, produit: v })}
                            placeholder="Nom + dose par animal"
                        />
                        <Label>Combien d'animaux</Label>
                        <Compteur
                            value={sa.nb}
                            onChange={(v) => setSa({ ...sa, nb: v })}
                        />
                        <Label>Qui a fait le soin</Label>
                        <MultiSel
                            options={AGENTS}
                            selected={sa.qui}
                            onChange={(q) => setSa({ ...sa, qui: q })}
                            placeholder="Choisir"
                            onAjout={ajouterAgent}
                        />
                        <Btn
                            onClick={() =>
                                add(
                                    lieu && sa.soin && sa.nb,
                                    sante,
                                    setSante,
                                    'sante',
                                    sa,
                                    () =>
                                        setSa({
                                            soin: '',
                                            produit: '',
                                            nb: '',
                                            qui: [],
                                        }),
                                    'Atelier, soin et nombre obligatoires',
                                )
                            }
                        >
                            Ajouter
                        </Btn>
                        {sante.map((s, i) => (
                            <Card key={i}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                    }}
                                >
                                    {s.lieu} — {s.soin}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    <b style={{ color: C.laterite }}>
                                        {s.nb} animaux
                                    </b>
                                    {s.produit ? ` · ${s.produit}` : ''}
                                </div>
                                <button
                                    onClick={() =>
                                        del(sante, setSante, i, 'sante')
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'soucis' && (
                    <>
                        {lieu ? (
                            <EnTete />
                        ) : (
                            <Sel
                                value={lieu}
                                onChange={setLieu}
                                options={LIEUX}
                                placeholder="Choisir le lieu"
                            />
                        )}
                        <div
                            style={{
                                background: '#fff',
                                borderLeft: `5px solid ${C.red}`,
                                padding: 14,
                                borderRadius: 4,
                                marginBottom: 16,
                                fontSize: 15,
                                lineHeight: 1.5,
                            }}
                        >
                            <b>Écrivez tout ce qui n'est pas normal</b>, même
                            sans savoir ce que c'est. Ce n'est pas à vous de
                            savoir — c'est à vous de signaler.
                        </div>
                        <Label>Ce que vous avez vu</Label>
                        <Txt
                            value={pb.quoi}
                            onChange={(v) => setPb({ ...pb, quoi: v })}
                            lines={3}
                            placeholder="Ex : 12 plants de chou, cœur jauni, déjections brunes"
                        />
                        <Label>Photo prise ?</Label>
                        <Sel
                            value={pb.photo}
                            onChange={(v) => setPb({ ...pb, photo: v })}
                            options={['Oui — envoyée sur WhatsApp', 'Non']}
                            placeholder="Répondre"
                        />
                        <Btn
                            tone="danger"
                            onClick={() =>
                                add(
                                    lieu && pb.quoi,
                                    problemes,
                                    setProblemes,
                                    'problemes',
                                    pb,
                                    () => setPb({ quoi: '', photo: '' }),
                                    'Lieu et description obligatoires',
                                )
                            }
                        >
                            Signaler
                        </Btn>
                        {problemes.map((p, i) => (
                            <Card key={i} tone={C.red}>
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 17,
                                        fontWeight: 600,
                                        color: C.red,
                                    }}
                                >
                                    {p.lieu}
                                </div>
                                <div style={{ fontSize: 15, marginTop: 4 }}>
                                    {p.quoi}
                                </div>
                                <button
                                    onClick={() =>
                                        del(
                                            problemes,
                                            setProblemes,
                                            i,
                                            'problemes',
                                        )
                                    }
                                    style={{
                                        marginTop: 8,
                                        background: 'none',
                                        border: 'none',
                                        color: C.red,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontWeight: 600,
                                    }}
                                >
                                    Retirer
                                </button>
                            </Card>
                        ))}
                        <NavBas />
                    </>
                )}

                {vue === 'inv' && (
                    <>
                        <Label>Inventaire du magasin</Label>
                        <div
                            style={{
                                background: C.green,
                                color: '#fff',
                                padding: 16,
                                borderRadius: 4,
                                marginBottom: 14,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 13,
                                    letterSpacing: 1.4,
                                    fontFamily: 'Oswald, sans-serif',
                                }}
                            >
                                VALEUR TOTALE DU STOCK
                            </div>
                            <div
                                style={{
                                    fontSize: 34,
                                    fontWeight: 700,
                                    fontFamily: 'Oswald, sans-serif',
                                }}
                            >
                                {valeurStock().toFixed(0)} USD
                            </div>
                            <div style={{ fontSize: 14, marginTop: 2 }}>
                                {articles.length} article(s) référencé(s)
                            </div>
                        </div>
                        {sousMini().length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {sousMini().length} ARTICLE(S) SOUS LE SEUIL
                                    MINIMUM
                                </div>
                                {sousMini()
                                    .slice(0, 5)
                                    .map((a) => (
                                        <div
                                            key={a.code}
                                            style={{
                                                fontSize: 14,
                                                marginTop: 4,
                                            }}
                                        >
                                            · {a.code} {a.lib} — reste {a.qte}{' '}
                                            {a.unite}
                                        </div>
                                    ))}
                            </div>
                        )}

                        <Label>Créer un article</Label>
                        <Sel
                            value={art.cat}
                            onChange={(v) => setArt({ ...art, cat: v })}
                            options={Object.keys(CATEG).map(
                                (k) => `${k} — ${CATEG[k]}`,
                            )}
                            placeholder="Catégorie"
                        />
                        {art.cat && (
                            <div
                                style={{
                                    fontSize: 13.5,
                                    color: '#666',
                                    marginTop: -8,
                                    marginBottom: 12,
                                }}
                            >
                                Code attribué :{' '}
                                <b>{codeArticle(art.cat.split(' —')[0])}</b>
                            </div>
                        )}
                        <Txt
                            value={art.lib}
                            onChange={(v) => setArt({ ...art, lib: v })}
                            placeholder="Libellé — nom exact tel qu'il est sur l'emballage"
                        />
                        <Sel
                            value={art.unite}
                            onChange={(v) => setArt({ ...art, unite: v })}
                            options={UNITES_ART}
                            placeholder="Unité"
                        />
                        <Label>Quantité en magasin</Label>
                        <Compteur
                            value={art.qte}
                            onChange={(v) => setArt({ ...art, qte: v })}
                        />
                        <Label>Prix unitaire (USD)</Label>
                        <Compteur
                            value={art.pu}
                            onChange={(v) => setArt({ ...art, pu: v })}
                        />
                        <Label>Seuil minimum d'alerte</Label>
                        <Compteur
                            value={art.mini}
                            onChange={(v) => setArt({ ...art, mini: v })}
                        />
                        <Sel
                            value={art.cc}
                            onChange={(v) => setArt({ ...art, cc: v })}
                            options={CENTRES.map((c) => `${c.c} — ${c.n}`)}
                            placeholder="Centre de coût par défaut"
                        />
                        <Btn
                            onClick={async () => {
                                if (!art.cat || !art.lib || !art.unite)
                                    return flash(
                                        'Catégorie, libellé et unité obligatoires',
                                    );
                                await creerArticle({
                                    ...art,
                                    cat: art.cat.split(' —')[0],
                                    cc: (art.cc || CC).split(' —')[0],
                                });
                                setArt({
                                    cat: '',
                                    lib: '',
                                    unite: '',
                                    qte: '',
                                    pu: '',
                                    mini: '',
                                    cc: '',
                                });
                                flash('Article créé');
                            }}
                        >
                            Créer l'article
                        </Btn>

                        <Label>Articles référencés</Label>
                        {!articles.length && (
                            <div
                                style={{
                                    fontSize: 15,
                                    color: '#666',
                                    padding: 12,
                                }}
                            >
                                Aucun article. Créez-en un ci-dessus.
                            </div>
                        )}
                        {articles.map((a) => {
                            const bas =
                                a.mini &&
                                parseFloat(a.qte) <= parseFloat(a.mini);
                            return (
                                <Card
                                    key={a.code}
                                    tone={bas ? C.red : C.green2}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 15.5,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {a.code}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 20,
                                                fontWeight: 700,
                                                color: bas ? C.red : C.ink,
                                            }}
                                        >
                                            {a.qte}{' '}
                                            <span style={{ fontSize: 13 }}>
                                                {a.unite}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 15, marginTop: 3 }}>
                                        {a.lib}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 13.5,
                                            marginTop: 3,
                                            color: '#555',
                                        }}
                                    >
                                        {a.pu > 0
                                            ? `${a.pu} USD/${a.unite} · valeur ${((parseFloat(a.qte) || 0) * (parseFloat(a.pu) || 0)).toFixed(0)} USD · `
                                            : ''}
                                        centre {a.cc || '—'}
                                        {a.mini ? ` · seuil ${a.mini}` : ''}
                                    </div>
                                    {bas && (
                                        <div
                                            style={{
                                                fontSize: 13.5,
                                                color: C.red,
                                                fontWeight: 700,
                                                marginTop: 3,
                                            }}
                                        >
                                            Sous le seuil — à réapprovisionner
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'req' && (
                    <>
                        <Label>Réquisitions</Label>
                        {reqs.filter((r) => r.statut === 'Demandée').length >
                            0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                    fontFamily: 'Oswald, sans-serif',
                                    fontSize: 16,
                                    fontWeight: 700,
                                }}
                            >
                                {
                                    reqs.filter((r) => r.statut === 'Demandée')
                                        .length
                                }{' '}
                                RÉQUISITION(S) EN ATTENTE D'APPROBATION
                            </div>
                        )}

                        <Label>Type de demande</Label>
                        {Object.keys(TYPES_REQ).map((k) => (
                            <button
                                key={k}
                                onClick={() => setRq({ ...rq, type: k })}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: 14,
                                    marginBottom: 8,
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    border:
                                        rq.type === k
                                            ? `3px solid ${C.green}`
                                            : `2px solid ${C.line}`,
                                    background:
                                        rq.type === k ? '#EAF3EC' : '#fff',
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: C.ink,
                                    }}
                                >
                                    {TYPES_REQ[k].n}
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: '#666',
                                        marginTop: 2,
                                    }}
                                >
                                    {TYPES_REQ[k].d}
                                </div>
                            </button>
                        ))}

                        {rq.type && (
                            <>
                                <div
                                    style={{
                                        fontSize: 13.5,
                                        color: '#666',
                                        marginTop: 8,
                                        marginBottom: 12,
                                    }}
                                >
                                    Numéro attribué : <b>{numeroRQ(rq.type)}</b>
                                </div>

                                {rq.type === 'STK' && (
                                    <>
                                        <Label>Article à sortir</Label>
                                        <Sel
                                            value={rq.article}
                                            onChange={(v) =>
                                                setRq({ ...rq, article: v })
                                            }
                                            options={articles.map(
                                                (a) => a.code,
                                            )}
                                            placeholder={
                                                articles.length
                                                    ? "Choisir l'article"
                                                    : 'Aucun article — créez-en dans Inventaire'
                                            }
                                        />
                                        {rq.article &&
                                            (() => {
                                                const a = articles.find(
                                                    (x) =>
                                                        x.code === rq.article,
                                                );
                                                return a ? (
                                                    <div
                                                        style={{
                                                            fontSize: 14,
                                                            color: '#555',
                                                            marginTop: -8,
                                                            marginBottom: 12,
                                                        }}
                                                    >
                                                        {a.lib} · disponible{' '}
                                                        <b>
                                                            {a.qte} {a.unite}
                                                        </b>{' '}
                                                        · {a.pu} USD/{a.unite}
                                                    </div>
                                                ) : null;
                                            })()}
                                        <Label>Quantité demandée</Label>
                                        <Compteur
                                            value={rq.qte}
                                            onChange={(v) =>
                                                setRq({ ...rq, qte: v })
                                            }
                                        />
                                    </>
                                )}

                                {rq.type === 'CSH' && (
                                    <>
                                        <Label>Montant demandé (USD)</Label>
                                        <Compteur
                                            value={rq.montant}
                                            onChange={(v) =>
                                                setRq({ ...rq, montant: v })
                                            }
                                        />
                                    </>
                                )}

                                {rq.type === 'NEW' && (
                                    <>
                                        <Label>
                                            Catégorie du nouvel article
                                        </Label>
                                        <Sel
                                            value={rq.nouvCat}
                                            onChange={(v) =>
                                                setRq({ ...rq, nouvCat: v })
                                            }
                                            options={Object.keys(CATEG).map(
                                                (k) => `${k} — ${CATEG[k]}`,
                                            )}
                                            placeholder="Choisir"
                                        />
                                        <Txt
                                            value={rq.nouvLib}
                                            onChange={(v) =>
                                                setRq({ ...rq, nouvLib: v })
                                            }
                                            placeholder="Libellé de l'article"
                                        />
                                        <Sel
                                            value={rq.nouvUnite}
                                            onChange={(v) =>
                                                setRq({ ...rq, nouvUnite: v })
                                            }
                                            options={UNITES_ART}
                                            placeholder="Unité"
                                        />
                                        <Label>Quantité</Label>
                                        <Compteur
                                            value={rq.qte}
                                            onChange={(v) =>
                                                setRq({ ...rq, qte: v })
                                            }
                                        />
                                        <Label>
                                            Prix unitaire estimé (USD)
                                        </Label>
                                        <Compteur
                                            value={rq.nouvPu}
                                            onChange={(v) =>
                                                setRq({ ...rq, nouvPu: v })
                                            }
                                        />
                                        <div
                                            style={{
                                                background: '#fff',
                                                borderLeft: `5px solid ${C.amber}`,
                                                padding: 12,
                                                borderRadius: 4,
                                                marginBottom: 14,
                                                fontSize: 14,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            La fiche article sera créée
                                            automatiquement au magasin au moment
                                            où la réquisition passera au statut
                                            « Servie ».
                                        </div>
                                    </>
                                )}

                                <Label>Objet de la demande</Label>
                                <Txt
                                    value={rq.objet}
                                    onChange={(v) => setRq({ ...rq, objet: v })}
                                    placeholder="À quoi cela va servir"
                                />
                                <Label>Justification</Label>
                                <Txt
                                    value={rq.justif}
                                    onChange={(v) =>
                                        setRq({ ...rq, justif: v })
                                    }
                                    lines={2}
                                    placeholder="Pourquoi c'est nécessaire maintenant"
                                />
                                <Label>Urgence</Label>
                                <Sel
                                    value={rq.urgence}
                                    onChange={(v) =>
                                        setRq({ ...rq, urgence: v })
                                    }
                                    options={PRIORITES}
                                    placeholder="Choisir"
                                />
                                <Label>Centre de coût</Label>
                                <Sel
                                    value={rq.cc}
                                    onChange={(v) =>
                                        setRq({ ...rq, cc: v.split(' —')[0] })
                                    }
                                    options={CENTRES.map(
                                        (c) => `${c.c} — ${c.n}`,
                                    )}
                                    placeholder={`Par défaut : ${CC}`}
                                />
                                <Btn onClick={creerReq}>
                                    Créer la réquisition
                                </Btn>
                                <div
                                    style={{
                                        fontSize: 13.5,
                                        color: '#666',
                                        marginTop: -4,
                                        marginBottom: 16,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Aucune sortie de stock ni dépense n'est
                                    autorisée avant approbation écrite — Art. 15
                                    du Règlement d'Entreprise.
                                </div>
                            </>
                        )}

                        <Label>Réquisitions enregistrées</Label>
                        {!reqs.length && (
                            <div
                                style={{
                                    fontSize: 15,
                                    color: '#666',
                                    padding: 12,
                                }}
                            >
                                Aucune réquisition.
                            </div>
                        )}
                        {reqs.slice(0, 30).map((r) => {
                            const col =
                                r.statut === 'Servie'
                                    ? C.green2
                                    : r.statut === 'Refusée' ||
                                        r.statut === 'Annulée'
                                      ? '#8A8A80'
                                      : r.urgence &&
                                          r.urgence.startsWith('URGENT')
                                        ? C.red
                                        : C.laterite;
                            return (
                                <Card key={r.num} tone={col}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 15.5,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {r.num}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: '#fff',
                                                background: col,
                                                padding: '3px 8px',
                                                borderRadius: 3,
                                                whiteSpace: 'nowrap',
                                                height: 'fit-content',
                                            }}
                                        >
                                            {r.statut}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 15, marginTop: 4 }}>
                                        {r.objet}
                                    </div>
                                    <div style={{ fontSize: 14, marginTop: 3 }}>
                                        <b
                                            style={{
                                                color: C.laterite,
                                                fontSize: 17,
                                            }}
                                        >
                                            {r.valeur} USD
                                        </b>{' '}
                                        · centre <b>{r.cc}</b>
                                        {r.type === 'STK'
                                            ? ` · ${r.article} × ${r.qte}`
                                            : ''}
                                        {r.type === 'NEW'
                                            ? ` · ${r.nouvLib} × ${r.qte}`
                                            : ''}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12.5,
                                            marginTop: 4,
                                            color: '#777',
                                        }}
                                    >
                                        Par {r.demandeur} le {r.date}
                                        {Object.entries(r.approbations || {})
                                            .map(
                                                ([k, v]) =>
                                                    ` · ${k} par ${v.par} le ${v.le}`,
                                            )
                                            .join('')}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            flexWrap: 'wrap',
                                            marginTop: 8,
                                        }}
                                    >
                                        {STATUTS_REQ.filter(
                                            (x) => x !== r.statut,
                                        ).map((x) => (
                                            <button
                                                key={x}
                                                onClick={() =>
                                                    statutReq(r.num, x)
                                                }
                                                style={{
                                                    padding: '8px 11px',
                                                    fontSize: 12.5,
                                                    borderRadius: 3,
                                                    cursor: 'pointer',
                                                    border: `1px solid ${C.line}`,
                                                    background: '#fff',
                                                    color: C.ink,
                                                }}
                                            >
                                                {x}
                                            </button>
                                        ))}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 8,
                                            marginTop: 8,
                                        }}
                                    >
                                        <button
                                            onClick={() => reqWA(r)}
                                            style={{
                                                flex: 1,
                                                padding: 11,
                                                background: '#1EA55C',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 4,
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 13.5,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={() => reqMail(r)}
                                            style={{
                                                flex: 1,
                                                padding: 11,
                                                background: '#37618E',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 4,
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 13.5,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            E-mail
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'maint' && (
                    <>
                        <Label>
                            Maintenance — parc matériel et bons de travail
                        </Label>
                        {entretiensDus().length > 0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {entretiensDus().length} ENTRETIEN(S) DÛ(S)
                                </div>
                                {entretiensDus()
                                    .slice(0, 6)
                                    .map((x, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: 14,
                                                marginTop: 4,
                                            }}
                                        >
                                            · {x.eq} — {x.t} <i>({x.etat})</i>
                                        </div>
                                    ))}
                            </div>
                        )}

                        <Label>Relevé de compteur</Label>
                        <Sel
                            value={bt.equip}
                            onChange={(v) => setBt({ ...bt, equip: v })}
                            options={EQUIPEMENTS.map((e) => e.n)}
                            placeholder="Choisir l'équipement"
                        />
                        {bt.equip &&
                            (EQUIPEMENTS.find((e) => e.n === bt.equip) || {})
                                .cpt && (
                                <>
                                    <Label>
                                        Compteur actuel en{' '}
                                        {
                                            (
                                                EQUIPEMENTS.find(
                                                    (e) => e.n === bt.equip,
                                                ) || {}
                                            ).cpt
                                        }
                                    </Label>
                                    <Compteur
                                        value={
                                            (compteurs[bt.equip] || {})
                                                .valeur || ''
                                        }
                                        onChange={async (v) => {
                                            const c = {
                                                ...compteurs,
                                                [bt.equip]: {
                                                    ...(compteurs[bt.equip] ||
                                                        {}),
                                                    valeur: v,
                                                },
                                            };
                                            setCompteurs(c);
                                            try {
                                                await window.storage.set(
                                                    'compteurs',
                                                    JSON.stringify(c),
                                                    true,
                                                );
                                            } catch {
                                                /* */
                                            }
                                        }}
                                    />
                                </>
                            )}

                        <Label>Nouveau bon de travail</Label>
                        <Sel
                            value={bt.metier}
                            onChange={(v) =>
                                setBt({ ...bt, metier: v, detail: {} })
                            }
                            options={Object.keys(METIERS).map(
                                (k) => `${k} — ${METIERS[k].n}`,
                            )}
                            placeholder="Choisir le corps de métier"
                        />
                        {bt.metier && (
                            <div
                                style={{
                                    fontSize: 13.5,
                                    color: '#666',
                                    marginTop: -8,
                                    marginBottom: 12,
                                }}
                            >
                                Numéro attribué :{' '}
                                <b>{numeroBT(bt.metier.split(' —')[0])}</b>
                            </div>
                        )}
                        <Label>Description du problème ou des travaux</Label>
                        <Txt
                            value={bt.desc}
                            onChange={(v) => setBt({ ...bt, desc: v })}
                            lines={3}
                            placeholder="Ce qui est constaté et ce qu'il faut faire"
                        />
                        <Label>Priorité</Label>
                        <Sel
                            value={bt.prio}
                            onChange={(v) => setBt({ ...bt, prio: v })}
                            options={PRIORITES}
                            placeholder="Choisir"
                        />

                        {bt.metier && METIERS[bt.metier.split(' —')[0]] && (
                            <>
                                <Label>Détails propres au métier</Label>
                                {METIERS[bt.metier.split(' —')[0]].champs.map(
                                    (c) => (
                                        <div
                                            key={c}
                                            style={{ marginBottom: 10 }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: 13.5,
                                                    color: '#555',
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {c}
                                            </div>
                                            <input
                                                value={bt.detail[c] || ''}
                                                onChange={(e) =>
                                                    setBt({
                                                        ...bt,
                                                        detail: {
                                                            ...bt.detail,
                                                            [c]: e.target.value,
                                                        },
                                                    })
                                                }
                                                style={{
                                                    width: '100%',
                                                    padding: 12,
                                                    fontSize: 16,
                                                    borderRadius: 4,
                                                    border: `2px solid ${c.includes('CONSIGNATION') ? C.red : C.line}`,
                                                }}
                                            />
                                        </div>
                                    ),
                                )}
                            </>
                        )}
                        <Label>Coût estimé (USD)</Label>
                        <Compteur
                            value={bt.cout}
                            onChange={(v) => setBt({ ...bt, cout: v })}
                        />
                        <Btn onClick={creerBT}>Créer le bon de travail</Btn>
                        <div
                            style={{
                                fontSize: 13.5,
                                color: '#666',
                                marginTop: -4,
                                marginBottom: 16,
                                lineHeight: 1.5,
                            }}
                        >
                            Le bon est créé en statut « Demandé ». Aucune
                            dépense ni sortie de stock n'est autorisée avant
                            approbation écrite — Art. 15 du Règlement
                            d'Entreprise.
                        </div>

                        <Label>Bons de travail</Label>
                        {!bts.length && (
                            <div
                                style={{
                                    fontSize: 15,
                                    color: '#666',
                                    padding: 12,
                                }}
                            >
                                Aucun bon de travail.
                            </div>
                        )}
                        {bts.slice(0, 30).map((b) => {
                            const col =
                                b.statut === 'Clôturé'
                                    ? C.green2
                                    : b.statut === 'Refusé'
                                      ? '#8A8A80'
                                      : b.prio && b.prio.startsWith('URGENT')
                                        ? C.red
                                        : C.laterite;
                            return (
                                <Card key={b.num} tone={col}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 15.5,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {b.num}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: '#fff',
                                                background: col,
                                                padding: '3px 8px',
                                                borderRadius: 3,
                                                whiteSpace: 'nowrap',
                                                height: 'fit-content',
                                            }}
                                        >
                                            {b.statut}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 15,
                                            marginTop: 4,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {b.equip}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14.5,
                                            marginTop: 3,
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        {b.desc}
                                    </div>
                                    {b.prio && (
                                        <div
                                            style={{
                                                fontSize: 13.5,
                                                marginTop: 3,
                                                color: b.prio.startsWith(
                                                    'URGENT',
                                                )
                                                    ? C.red
                                                    : '#555',
                                            }}
                                        >
                                            {b.prio}
                                        </div>
                                    )}
                                    {Object.entries(b.detail || {})
                                        .filter(([, v]) => v)
                                        .map(([k, v]) => (
                                            <div
                                                key={k}
                                                style={{
                                                    fontSize: 13,
                                                    marginTop: 2,
                                                    color: '#555',
                                                }}
                                            >
                                                {k} : <b>{v}</b>
                                            </div>
                                        ))}
                                    {b.cout > 0 && (
                                        <div
                                            style={{
                                                fontSize: 13.5,
                                                marginTop: 3,
                                            }}
                                        >
                                            Coût estimé : <b>{b.cout} USD</b>
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            fontSize: 12.5,
                                            marginTop: 4,
                                            color: '#777',
                                        }}
                                    >
                                        Demandé par {b.demandeur} le {b.date}
                                        {Object.entries(b.approbations || {})
                                            .map(
                                                ([k, v]) =>
                                                    ` · ${k} par ${v.par} le ${v.le}`,
                                            )
                                            .join('')}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 6,
                                            flexWrap: 'wrap',
                                            marginTop: 8,
                                        }}
                                    >
                                        {STATUTS.filter(
                                            (x) => x !== b.statut,
                                        ).map((x) => (
                                            <button
                                                key={x}
                                                onClick={() =>
                                                    changerStatut(b.num, x)
                                                }
                                                style={{
                                                    padding: '8px 11px',
                                                    fontSize: 12.5,
                                                    borderRadius: 3,
                                                    cursor: 'pointer',
                                                    border: `1px solid ${C.line}`,
                                                    background: '#fff',
                                                    color: C.ink,
                                                }}
                                            >
                                                {x}
                                            </button>
                                        ))}
                                    </div>
                                </Card>
                            );
                        })}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'epi' && (
                    <>
                        <Label>Équipements de protection individuelle</Label>
                        {(() => {
                            const actifs = epis.filter((e) => !e.remplace);
                            const exp = actifs.filter(
                                (e) => joursRestants(e) < 0,
                            ).length;
                            const soon = actifs.filter((e) => {
                                const j = joursRestants(e);
                                return j >= 0 && j <= 30;
                            }).length;
                            return exp + soon > 0 ? (
                                <div
                                    style={{
                                        background: exp ? C.red : C.amber,
                                        color: '#fff',
                                        padding: 14,
                                        borderRadius: 4,
                                        marginBottom: 14,
                                        fontWeight: 700,
                                    }}
                                >
                                    {exp > 0 && (
                                        <div>
                                            {exp} EPI expiré(s) — à remplacer
                                        </div>
                                    )}
                                    {soon > 0 && (
                                        <div style={{ marginTop: exp ? 4 : 0 }}>
                                            {soon} EPI arrive(nt) à échéance
                                            sous 30 jours
                                        </div>
                                    )}
                                </div>
                            ) : null;
                        })()}

                        <Label>Remettre un EPI</Label>
                        <Sel
                            value={ep.agent}
                            onChange={(v) =>
                                setEp({ ...ep, agent: v, motif: '' })
                            }
                            options={AGENTS}
                            placeholder="Choisir l'agent"
                        />
                        <Sel
                            value={ep.type}
                            onChange={(v) =>
                                setEp({ ...ep, type: v, motif: '' })
                            }
                            options={epiTypes.map((t) => `${t.n}`)}
                            placeholder="Choisir l'EPI"
                        />
                        {ep.type && (
                            <div
                                style={{
                                    fontSize: 13.5,
                                    color: '#666',
                                    marginTop: -8,
                                    marginBottom: 12,
                                }}
                            >
                                Validité{' '}
                                {
                                    (
                                        epiTypes.find((t) => t.n === ep.type) ||
                                        {}
                                    ).m
                                }{' '}
                                mois · catégorie{' '}
                                {
                                    (
                                        epiTypes.find((t) => t.n === ep.type) ||
                                        {}
                                    ).c
                                }
                            </div>
                        )}
                        <Sel
                            value={ep.taille}
                            onChange={(v) => setEp({ ...ep, taille: v })}
                            options={tailles}
                            placeholder="Taille"
                        />

                        {ep.agent &&
                            ep.type &&
                            epiValide(ep.agent, ep.type) && (
                                <div
                                    style={{
                                        background: C.red,
                                        color: '#fff',
                                        padding: 14,
                                        borderRadius: 4,
                                        marginBottom: 14,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: 'Oswald, sans-serif',
                                            fontSize: 16,
                                            fontWeight: 700,
                                        }}
                                    >
                                        DOTATION REFUSÉE
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 14.5,
                                            marginTop: 5,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Cet agent détient déjà un {ep.type}{' '}
                                        valide jusqu'au{' '}
                                        <b>
                                            {
                                                epiValide(ep.agent, ep.type)
                                                    .expire
                                            }
                                        </b>
                                        . Un nouvel EPI ne peut être remis que
                                        si l'ancien est hors d'usage — et le
                                        motif doit être écrit.
                                    </div>
                                    <div style={{ marginTop: 10 }}>
                                        <Sel
                                            value={ep.motif}
                                            onChange={(v) =>
                                                setEp({ ...ep, motif: v })
                                            }
                                            options={MOTIFS_REMPL}
                                            placeholder="Motif du remplacement anticipé"
                                        />
                                    </div>
                                </div>
                            )}

                        <Btn onClick={remettreEpi}>Enregistrer la remise</Btn>

                        <Label>Dotations en cours</Label>
                        {!epis.filter((e) => !e.remplace).length && (
                            <div
                                style={{
                                    fontSize: 15,
                                    color: '#666',
                                    padding: 12,
                                }}
                            >
                                Aucune dotation enregistrée.
                            </div>
                        )}
                        {epis
                            .filter((e) => !e.remplace)
                            .sort(
                                (a, b) =>
                                    new Date(a.expire) - new Date(b.expire),
                            )
                            .map((e) => {
                                const st = statutEpi(e);
                                return (
                                    <Card key={e.id} tone={st.c}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                gap: 10,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontFamily:
                                                        'Oswald, sans-serif',
                                                    fontSize: 16.5,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {e.agent.split(' —')[0]}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: '#fff',
                                                    background: st.c,
                                                    padding: '3px 8px',
                                                    borderRadius: 3,
                                                    whiteSpace: 'nowrap',
                                                    height: 'fit-content',
                                                }}
                                            >
                                                {st.t}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                marginTop: 4,
                                            }}
                                        >
                                            {e.type}
                                            {e.taille
                                                ? ` · taille ${e.taille}`
                                                : ''}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 13.5,
                                                marginTop: 3,
                                                color: '#555',
                                            }}
                                        >
                                            Remis le {e.remise} · expire le{' '}
                                            {e.expire}
                                            {st.j >= 0
                                                ? ` · ${st.j} jour(s) restant(s)`
                                                : ` · dépassé de ${-st.j} jour(s)`}
                                        </div>
                                        {e.motif && (
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    marginTop: 3,
                                                    color: C.laterite,
                                                }}
                                            >
                                                Remplacement : {e.motif}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}

                        {epis.some((e) => e.remplace) && (
                            <>
                                <Label>Historique des remplacements</Label>
                                {epis
                                    .filter((e) => e.remplace)
                                    .slice(0, 20)
                                    .map((e) => (
                                        <div
                                            key={e.id}
                                            style={{
                                                background: '#fff',
                                                border: `1px solid ${C.line}`,
                                                borderRadius: 4,
                                                padding: '10px 12px',
                                                marginBottom: 6,
                                                fontSize: 13.5,
                                                color: '#555',
                                            }}
                                        >
                                            <b>{e.agent.split(' —')[0]}</b> ·{' '}
                                            {e.type} · remis le {e.remise}
                                            {e.finMotif
                                                ? ` · retiré pour ${e.finMotif}`
                                                : ''}
                                        </div>
                                    ))}
                            </>
                        )}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'stock' && (
                    <>
                        <Label>Stock du magasin</Label>
                        <div
                            style={{
                                fontSize: 14,
                                color: '#555',
                                marginBottom: 14,
                                lineHeight: 1.5,
                            }}
                        >
                            Saisissez la quantité en magasin après chaque
                            livraison. Elle se décompte automatiquement à chaque
                            application.
                        </div>
                        <Sel
                            value={stk.produit}
                            onChange={(v) => setStk({ ...stk, produit: v })}
                            options={produitsCatalogue}
                            placeholder="Choisir le produit"
                        />
                        <Label>Quantité en magasin (kg ou L)</Label>
                        <Compteur
                            value={stk.qte}
                            onChange={(v) => setStk({ ...stk, qte: v })}
                        />
                        <Btn
                            onClick={async () => {
                                if (!stk.produit || !stk.qte)
                                    return flash(
                                        'Produit et quantité obligatoires',
                                    );
                                const s = {
                                    ...stock,
                                    [stk.produit]: parseFloat(stk.qte),
                                };
                                setStock(s);
                                await window.storage.set(
                                    'stock',
                                    JSON.stringify(s),
                                    true,
                                );
                                log(`Stock ${stk.produit} = ${stk.qte}`);
                                setStk({ produit: '', qte: '' });
                                flash('Stock mis à jour');
                            }}
                        >
                            Enregistrer ce stock
                        </Btn>
                        {Object.entries(stock)
                            .filter(([, v]) => v > 0 || v === 0)
                            .map(([p, v]) => (
                                <Card
                                    key={p}
                                    tone={
                                        v <= 5
                                            ? C.red
                                            : v <= 20
                                              ? C.amber
                                              : C.green2
                                    }
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 16,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {p}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 24,
                                                fontWeight: 700,
                                                color: v <= 5 ? C.red : C.ink,
                                            }}
                                        >
                                            {Number(v).toFixed(1)}
                                        </div>
                                    </div>
                                    {v <= 5 && (
                                        <div
                                            style={{
                                                fontSize: 14,
                                                color: C.red,
                                                fontWeight: 700,
                                                marginTop: 4,
                                            }}
                                        >
                                            ⚠️ Stock critique — commander
                                        </div>
                                    )}
                                </Card>
                            ))}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'freq' && (
                    <>
                        <Label>Formulaires périodiques</Label>
                        {Object.entries(RECUR[bureau]).map(([freq, items]) => {
                            const f = formFreq.find((x) => x.freq === freq) || {
                                coches: [],
                            };
                            const toggle = (it) => {
                                const c = f.coches.includes(it)
                                    ? f.coches.filter((x) => x !== it)
                                    : [...f.coches, it];
                                const n = [
                                    ...formFreq.filter((x) => x.freq !== freq),
                                    {
                                        freq,
                                        coches: c,
                                        faits: c.length,
                                        total: items.length,
                                    },
                                ];
                                setFormFreq(n);
                                sauver({ formFreq: n });
                            };
                            return (
                                <div key={freq} style={{ marginBottom: 18 }}>
                                    <div
                                        style={{
                                            background: ACC,
                                            color: '#fff',
                                            padding: '10px 14px',
                                            borderRadius: '4px 4px 0 0',
                                            fontFamily: 'Oswald, sans-serif',
                                            fontSize: 16,
                                            fontWeight: 700,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <span>{freq}</span>
                                        <span>
                                            {f.coches.length}/{items.length}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            background: '#fff',
                                            border: `1px solid ${C.line}`,
                                            borderTop: 'none',
                                            borderRadius: '0 0 4px 4px',
                                            padding: 6,
                                        }}
                                    >
                                        {items.map((it) => {
                                            const on = f.coches.includes(it);
                                            return (
                                                <button
                                                    key={it}
                                                    onClick={() => toggle(it)}
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '12px 10px',
                                                        background: on
                                                            ? '#EAF3EC'
                                                            : 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        borderBottom: `1px solid ${C.line}`,
                                                        fontSize: 15,
                                                        lineHeight: 1.4,
                                                        color: C.ink,
                                                    }}
                                                >
                                                    <b
                                                        style={{
                                                            color: on
                                                                ? C.green2
                                                                : '#bbb',
                                                            marginRight: 8,
                                                        }}
                                                    >
                                                        {on ? '☑' : '☐'}
                                                    </b>
                                                    {it}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        <NavBas />
                    </>
                )}

                {vue === 'rapport' && (
                    <>
                        {epis.filter((e) => !e.remplace && joursRestants(e) < 0)
                            .length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        epis.filter(
                                            (e) =>
                                                !e.remplace &&
                                                joursRestants(e) < 0,
                                        ).length
                                    }{' '}
                                    EPI EXPIRÉ(S)
                                </div>
                                <div style={{ fontSize: 14, marginTop: 4 }}>
                                    Aucun traitement phytosanitaire sans EPI
                                    valide.
                                </div>
                            </div>
                        )}
                        {reqs.filter((r) => r.statut === 'Demandée').length >
                            0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        reqs.filter(
                                            (r) => r.statut === 'Demandée',
                                        ).length
                                    }{' '}
                                    RÉQUISITION(S) EN ATTENTE —{' '}
                                    {reqs
                                        .filter((r) => r.statut === 'Demandée')
                                        .reduce(
                                            (s, r) =>
                                                s + (parseFloat(r.valeur) || 0),
                                            0,
                                        )
                                        .toFixed(0)}{' '}
                                    USD
                                </div>
                            </div>
                        )}
                        {sousMini().length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {sousMini().length} ARTICLE(S) SOUS LE SEUIL
                                    MINIMUM
                                </div>
                            </div>
                        )}
                        {bts.filter((b) => b.statut === 'Demandé').length >
                            0 && (
                            <div
                                style={{
                                    background: C.amber,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    {
                                        bts.filter(
                                            (b) => b.statut === 'Demandé',
                                        ).length
                                    }{' '}
                                    BON(S) DE TRAVAIL EN ATTENTE D'APPROBATION
                                </div>
                            </div>
                        )}
                        {nonSaisi().length > 0 && (
                            <div
                                style={{
                                    background: C.red,
                                    color: '#fff',
                                    padding: 14,
                                    borderRadius: 4,
                                    marginBottom: 14,
                                }}
                            >
                                <div
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        fontSize: 16,
                                        fontWeight: 700,
                                    }}
                                >
                                    DÛ D'APRÈS LE PLAN, NON SAISI
                                </div>
                                {nonSaisi().map((x, i) => (
                                    <div
                                        key={i}
                                        style={{ fontSize: 14, marginTop: 4 }}
                                    >
                                        · {x.lieu} — J+{x.jour} — {x.t} [
                                        {x.statut}]
                                    </div>
                                ))}
                            </div>
                        )}
                        <Btn tone="wa" onClick={versWA}>
                            Envoyer sur WhatsApp
                        </Btn>
                        <Label>E-mail — copie automatique à la Direction</Label>
                        <Btn
                            tone="mail"
                            onClick={() =>
                                versMail(
                                    bureau === 'AGRI'
                                        ? 'chanda@etskabanda.cd'
                                        : 'salani@etskabanda.cd',
                                )
                            }
                        >
                            Au supérieur (cc Direction)
                        </Btn>
                        <Btn tone="mail" onClick={() => versMail(MGMT)}>
                            À la Direction seule
                        </Btn>
                        <Btn tone="ghost" onClick={telechargerCSV}>
                            Télécharger le CSV
                        </Btn>
                        <Btn
                            tone="ghost"
                            onClick={() => {
                                navigator.clipboard.writeText(rapport());
                                flash('Copié');
                            }}
                        >
                            Copier le texte
                        </Btn>
                        <pre
                            style={{
                                background: '#fff',
                                border: `1px solid ${C.line}`,
                                borderRadius: 4,
                                padding: 14,
                                fontSize: 13,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'Inter, monospace',
                                overflowX: 'auto',
                            }}
                        >
                            {rapport()}
                        </pre>
                        <NavBas />
                    </>
                )}

                {vue === 'histo' && (
                    <>
                        <Label>Rapports enregistrés</Label>
                        <Btn tone="ghost" onClick={chargerHisto}>
                            Actualiser
                        </Btn>
                        {!histo.length && (
                            <div
                                style={{
                                    fontSize: 15,
                                    color: '#666',
                                    padding: 12,
                                }}
                            >
                                Aucun rapport enregistré.
                            </div>
                        )}
                        {histo.map((h) => (
                            <Card
                                key={h.cle}
                                tone={h.pb > 0 ? C.red : C.green2}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    'Oswald, sans-serif',
                                                fontSize: 18,
                                                fontWeight: 700,
                                            }}
                                        >
                                            {h.date}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 14,
                                                marginTop: 2,
                                            }}
                                        >
                                            {h.n} saisie(s)
                                            {h.pb
                                                ? ` · ${h.pb} problème(s)`
                                                : ''}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDate(h.date);
                                            setVue('rapport');
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            background: C.laterite,
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            fontFamily: 'Oswald, sans-serif',
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Ouvrir
                                    </button>
                                </div>
                            </Card>
                        ))}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {vue === 'journal' && (
                    <>
                        <Label>Journal d'activité</Label>
                        <Btn tone="ghost" onClick={chargerJournal}>
                            Actualiser
                        </Btn>
                        {journal.slice(0, 80).map((e, i) => (
                            <div
                                key={i}
                                style={{
                                    background: '#fff',
                                    border: `1px solid ${C.line}`,
                                    borderRadius: 4,
                                    padding: '10px 12px',
                                    marginBottom: 6,
                                    fontSize: 14,
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'Oswald, sans-serif',
                                        color: C.laterite,
                                        fontWeight: 600,
                                    }}
                                >
                                    {new Date(e.t)
                                        .toLocaleString('fr-FR')
                                        .slice(0, 16)}
                                </span>
                                <span style={{ color: '#888' }}> · {e.b}</span>
                                <div style={{ marginTop: 3 }}>
                                    {e.a} —{' '}
                                    <i style={{ color: '#666' }}>{e.u}</i>
                                </div>
                            </div>
                        ))}
                        <Btn tone="ghost" onClick={() => setVue('accueil')}>
                            ← Accueil
                        </Btn>
                    </>
                )}

                {etat && (
                    <div
                        style={{
                            position: 'fixed',
                            left: 16,
                            right: 16,
                            bottom: 16,
                            maxWidth: 608,
                            margin: '0 auto',
                            background: C.ink,
                            color: '#fff',
                            padding: '14px 16px',
                            borderRadius: 4,
                            fontSize: 15,
                            fontWeight: 600,
                            textAlign: 'center',
                            zIndex: 20,
                        }}
                    >
                        {etat}
                    </div>
                )}
            </div>
        </div>
    );
}
