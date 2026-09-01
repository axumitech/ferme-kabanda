<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class VersionController extends Controller
{
    public function __invoke(): Response
    {
        $configuredDecisions = config('fkn.a_valider', []);
        $pendingDecisions = [];

        if (is_array($configuredDecisions)) {
            foreach ($configuredDecisions as $key => $label) {
                if (is_string($key) && is_string($label)) {
                    $pendingDecisions[] = ['key' => $key, 'label' => $label];
                }
            }
        }

        return Inertia::render('version', [
            'version' => config('fkn.version', '1.8.0'),
            'date' => config('fkn.version_date', '2026-08-30'),
            'name' => config('fkn.version_nom', 'Maintenance et ordres de travail'),
            'pendingDecisions' => $pendingDecisions,
            'history' => [
                ['version' => '1.8.0', 'date' => '30/08/2026', 'summary' => 'Maintenance des équipements et des infrastructures, ordres de travail de bout en bout'],
                ['version' => '1.7.0', 'date' => '30/08/2026', 'summary' => 'Consolidation Laravel : vues en composants, montants en centimes entiers, horloge serveur'],
                ['version' => '1.6.0', 'date' => '30/08/2026', 'summary' => 'Magasin unifié, inventaires, parcellaire, plans, équipements et sécurité'],
                ['version' => '1.5.0', 'date' => '29/08/2026', 'summary' => 'Registre partagé : tout le monde voit, l’action reste contrôlée'],
                ['version' => '1.4.0', 'date' => '29/08/2026', 'summary' => 'Carnet de terrain hors ligne, ventes, livraisons et double devise'],
                ['version' => '1.3.0', 'date' => '29/08/2026', 'summary' => 'Réconciliation de portée, FRAC, délai avant récolte et interdits alimentaires'],
                ['version' => '1.2.0', 'date' => '28/08/2026', 'summary' => 'Écrans de pilotage, hiérarchie à quatre niveaux et délégation d’autorité'],
                ['version' => '1.1.0', 'date' => '27/08/2026', 'summary' => 'Moteur de tâches, plans, carnet animal et incidents'],
                ['version' => '1.0.0', 'date' => '26/08/2026', 'summary' => 'Socle : registres immuables, magasin et numérotation'],
            ],
        ]);
    }
}
