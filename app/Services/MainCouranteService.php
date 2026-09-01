<?php

namespace App\Services;

use App\Models\MainCourante;
use App\Support\HorlogeServeur;
use App\Support\Numerotation;

class MainCouranteService
{
    /** @param array<string, mixed> $data */
    public function consigner(array $data): MainCourante
    {
        $survenu = HorlogeServeur::declaree($data['survenu_le'], "La date et l'heure");
        $objet = $data['objet'];

        if (HorlogeServeur::estRetroactive($survenu)) {
            $objet = sprintf(
                '[SAISIE RÉTROACTIVE — %d h après le fait] %s',
                intdiv(HorlogeServeur::ecartMinutes($survenu), 60),
                $objet,
            );
        }

        return MainCourante::query()->create([
            'reference' => Numerotation::suivant('MC', true),
            'survenu_le' => $survenu,
            'type' => $data['type'],
            'site_id' => $data['site_id'] ?? null,
            'lieu' => $data['lieu'] ?? null,
            'objet' => $objet,
            'personne' => $data['personne'] ?? null,
            'vehicule' => $data['vehicule'] ?? null,
            'piece_identite' => $data['piece_identite'] ?? null,
            'patrouille_id' => $data['patrouille_id'] ?? null,
            'incident_id' => $data['incident_id'] ?? null,
            'photo_chemin' => $data['photo_chemin'] ?? null,
            'agent_id' => auth()->id(),
            'agent_nom' => auth()->user()->name,
        ]);
    }
}
