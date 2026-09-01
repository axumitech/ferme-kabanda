<?php

/*
 * Registre commun de la ferme. Déplacez une clé entre les portées pour ajuster
 * la lecture sans changer les règles d'action dans les services métier.
 */
return [
    'version' => '1.8.0',
    'version_date' => '2026-08-30',
    'version_nom' => 'Maintenance et ordres de travail',

    /* Valeurs de travail explicitement en attente de validation. */
    'a_valider' => [
        'taux_change_cdf' => 'Taux interne 2 200 CDF/USD - à confirmer par la Direction',
        'grille_doa' => 'Plafonds 0 / 100 / 1 000 USD - proposition non arrêtée',
        'prix_ezhl' => 'Prix premium ~7 USD/kg carcasse - à confronter au contrat en cours',
        'parcellaire_k2' => 'Superficies K2 non relevées',
        'cheptel_bovin' => 'Recensement du cheptel bovin non fait',
    ],

    /*
     * Une entrée ne doit apparaître que dans une portée. Si elle est
     * accidentellement dupliquée, VisibiliteService applique la portée la plus
     * stricte : une erreur de configuration ne doit jamais élargir un accès.
     */
    'partage' => [
        'taches',
        'plantations',
        'recoltes',
        'traitements',
        'animaux',
        'articles',
        'incidents_hse',
        'plans',
        'cultures',
        'matieres_actives',
        'clients',
        'rapports_terrain',
        'journal_terrain',
        'equipements',
        'infrastructures',
        'ordres_travail',
    ],
    'restreint' => [
        'montants_ventes',
        'valeurs_stock',
        'requisitions_autres',
        'performance_nominative',
        'taux_change',
        'couts_incidents',
    ],
    'confidentiel' => [
        'dossiers_disciplinaires',
        'incidents_surete',
        'journal_audit',
        'seuils_autorisation',
    ],
    'niveaux' => ['partage' => 4, 'restreint' => 3, 'confidentiel' => 2],
    'vue_par_defaut' => 'mes_donnees',

    /*
     * Les enregistrements historiques du carnet sont une réserve JSON
     * générique. Cette table documente la destination d'une future migration
     * explicite vers les registres normalisés; les motifs finissant par * sont
     * des préfixes. Elle ne rend pas les documents farm_records partagés.
     *
     * Les clés, connues ou inconnues, restent privées à leur auteur tant que
     * cette migration append-only n'existe pas.
     */
    'enregistrements' => [
        'rap:*' => 'rapports_terrain',
        'journal' => 'journal_terrain',
        'agents_perso' => 'plans',
        'assignations' => 'plantations',
        'histo_cultures' => 'plantations',
        'dars' => 'traitements',
        'bons_travaux' => 'taches',
        'compteurs' => 'equipements',
        'truies' => 'animaux',
        'animaux' => 'animaux',
        'loges' => 'animaux',
        // Ce vieux cache contient les montants des demandes : ne pas l'ouvrir
        // aux niveaux d'exécution, même si le statut de la demande est partagé.
        'requisitions' => 'requisitions_autres',
        'dde:*' => 'dossiers_disciplinaires',
        'discipline:*' => 'dossiers_disciplinaires',
        'audit:*' => 'journal_audit',
        'doa:*' => 'seuils_autorisation',
    ],
];
