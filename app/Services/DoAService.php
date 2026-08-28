<?php

namespace App\Services;

use App\Models\SeuilAutorisation;
use App\Models\User;
use RuntimeException;

class DoAService
{
    public function niveauRequis(float $montant, string $type = 'depense'): int
    {
        foreach (SeuilAutorisation::query()->where('type_operation', $type)->orderByDesc('niveau')->get() as $seuil) {
            if ($seuil->montant_max === null || $montant <= (float) $seuil->montant_max) {
                return (int) $seuil->niveau;
            }
        }

return 1;
    }

    public function verifier(User $user, float $montant, string $type = 'depense'): void
    {
        $requis = $this->niveauRequis($montant, $type);
        if ((int) $user->niveau_hierarchie > $requis) {
            throw new RuntimeException("HORS DÉLÉGATION — cette opération exige le niveau {$requis}.");
        }
    }
}
