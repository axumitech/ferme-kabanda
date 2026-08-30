<?php

namespace App\Services;

use App\Models\User;

class VisibiliteService
{
    /** @var list<string> */
    private const PORTEES = ['partage', 'restreint', 'confidentiel'];

    /**
     * Retourne la portée la plus stricte qui contient la donnée.
     *
     * La configuration est volontairement simple à modifier par la Direction.
     * En cas de doublon involontaire entre deux listes, le choix le plus
     * restrictif évite d'ouvrir une information par erreur.
     */
    public function porteeDe(string $donnee): ?string
    {
        $portees = [];

        foreach (self::PORTEES as $portee) {
            if (in_array($donnee, config("fkn.{$portee}", []), true)) {
                $portees[] = $portee;
            }
        }

        if ($portees === []) {
            return null;
        }

        usort(
            $portees,
            fn (string $gauche, string $droite): int => $this->niveauMinimal($gauche) <=> $this->niveauMinimal($droite),
        );

        return $portees[0];
    }

    public function peutVoir(User $user, string $donnee): bool
    {
        $portee = $this->porteeDe($donnee);

        return $portee !== null && $this->peutVoirPortee($user, $portee);
    }

    public function peutVoirPortee(?User $user, string $portee): bool
    {
        if ($user === null || ! in_array($portee, self::PORTEES, true)) {
            return false;
        }

        return $this->niveau($user) <= $this->niveauMinimal($portee);
    }

    public function peutVoirConfidentiel(?User $user): bool
    {
        return $user !== null && $this->peutVoir($user, 'dossiers_disciplinaires');
    }

    private function niveau(User $user): int
    {
        $niveau = (int) ($user->niveau_hierarchie ?? 4);

        return $niveau >= 1 && $niveau <= 4 ? $niveau : 4;
    }

    private function niveauMinimal(string $portee): int
    {
        $niveau = config("fkn.niveaux.{$portee}");

        return is_int($niveau) && $niveau >= 1 && $niveau <= 4 ? $niveau : 1;
    }

    public function peutAgirSurTache(User $user, int $responsableId, bool $estIntervenant, bool $estNonAssignee): bool
    {
        return $user->is_admin || $responsableId === $user->id || $estIntervenant || $estNonAssignee;
    }
}
