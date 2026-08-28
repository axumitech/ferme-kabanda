<?php

namespace App\Services;

use App\Models\Culture;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Support\Numerotation;
use RuntimeException;

class PlantationService
{
    /** @param array<string, mixed> $data */
    public function planter(array $data): Plantation
    {
        $culture = Culture::query()->whereKey((int) $data['culture_id'])->firstOrFail();
        $recente = Plantation::query()->where('lieu', $data['lieu'])->whereHas('culture', fn ($q) => $q->where('famille', $culture->famille))->latest('j0')->first();
        if ($culture->famille && $culture->delai_rotation && $recente && empty($data['forcer_rotation'])) {
            throw new RuntimeException("ROTATION — {$culture->famille} a déjà occupé ce lieu. Une dérogation explicite est requise.");
        }

        return Plantation::query()->create(['reference' => Numerotation::suivant('PLT', true), 'culture_id' => $culture->id, 'site_id' => $data['site_id'] ?? null, 'lieu' => $data['lieu'], 'j0' => $data['j0'], 'quantite' => $data['quantite'] ?? null, 'unite' => $data['unite'] ?? $culture->unite_travail, 'plan_id' => $data['plan_id'] ?? null, 'cree_par_id' => auth()->id(), 'note' => $data['note'] ?? null]);
    }

    /** @param array<string, mixed> $data */
    public function recolter(Plantation $plantation, array $data): Recolte
    {
        if (blank($data['canal_commercial'] ?? null)) {
            throw new RuntimeException('CANAL COMMERCIAL OBLIGATOIRE — une récolte doit avoir une destination.');
        }

        return $plantation->recoltes()->create(['date' => $data['date'] ?? today(), 'quantite' => $data['quantite'], 'unite' => $data['unite'] ?? $plantation->culture->unite_recolte, 'qualite' => $data['qualite'] ?? null, 'canal_commercial' => $data['canal_commercial'], 'pertes' => $data['pertes'] ?? null, 'valeur' => $data['valeur'] ?? null, 'tache_id' => $data['tache_id'] ?? null, 'user_id' => auth()->id(), 'user_nom' => auth()->user()->name]);
    }
}
