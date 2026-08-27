<?php

namespace App\Enums;

enum SourceTache: string
{
    case CalendrierCultural = 'calendrier_cultural';
    case Entretien = 'entretien';
    case Epi = 'epi';
    case Inventaire = 'inventaire';
    case Requisition = 'requisition';
    case Maternite = 'maternite';
    case Dar = 'dar';
    case Smp = 'smp';
    case Incident = 'incident';
    case Enquete = 'enquete';
    case Manuelle = 'manuelle';
}
