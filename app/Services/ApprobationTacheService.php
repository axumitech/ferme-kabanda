<?php

namespace App\Services;

use App\Enums\StatutTache;
use App\Models\Tache;
use RuntimeException;

class ApprobationTacheService
{
    public const BROUILLON = 'brouillon';

    public const SOUMISE = 'soumise';

    public const APPROUVEE = 'approuvee';

    public const REFUSEE = 'refusee';

    /** @param array<string, mixed> $donnees */
    public function proposer(array $donnees, TacheService $taches): Tache
    {
        $tache = $taches->creer(array_merge($donnees, [
            'statut_approbation' => self::BROUILLON,
        ]));

        $tache->journaliserEvenement('proposee', 'Action proposée — en attente de soumission');

        return $tache;
    }

    public function soumettre(Tache $tache, string $justification, ?float $coutEstime = null): Tache
    {
        if ($tache->statut_approbation === self::APPROUVEE) {
            throw new RuntimeException('Cette action est déjà approuvée.');
        }

        if (blank($justification)) {
            throw new RuntimeException('JUSTIFICATION OBLIGATOIRE — expliquez pourquoi cette action est nécessaire.');
        }

        $tache->update([
            'statut_approbation' => self::SOUMISE,
            'justification_demande' => $justification,
            'cout_estime' => $coutEstime,
            'soumise_le' => now(),
        ]);

        $tache->journaliserEvenement('soumise', 'Soumise à approbation', ['cout_estime' => $coutEstime]);

        return $tache;
    }

    public function approuver(Tache $tache, ?string $note = null): Tache
    {
        if ($tache->statut_approbation !== self::SOUMISE) {
            throw new RuntimeException('Seule une action soumise peut être approuvée.');
        }

        if ($tache->cree_par_id && $tache->cree_par_id === auth()->id()) {
            throw new RuntimeException('AUTO-APPROBATION REFUSÉE — cette action doit être approuvée par une autre personne.');
        }

        $tache->update([
            'statut_approbation' => self::APPROUVEE,
            'approuve_par_id' => auth()->id(),
            'approuve_le' => now(),
            'motif_refus' => null,
        ]);
        $tache->journaliserEvenement('approuvee', 'Action approuvée'.($note ? " — {$note}" : ''));

        return $tache;
    }

    public function refuser(Tache $tache, string $motif): Tache
    {
        if (blank($motif)) {
            throw new RuntimeException('Le motif de refus est obligatoire.');
        }

        $tache->update([
            'statut_approbation' => self::REFUSEE,
            'statut' => StatutTache::Annulee,
            'motif_refus' => $motif,
            'approuve_par_id' => auth()->id(),
            'approuve_le' => now(),
        ]);
        $tache->journaliserEvenement('refusee', "Action refusée — {$motif}");

        return $tache;
    }

    public function verifierExecutable(Tache $tache): void
    {
        if ($tache->statut_approbation === null || $tache->statut_approbation === self::APPROUVEE) {
            return;
        }

        throw new RuntimeException(match ($tache->statut_approbation) {
            self::BROUILLON => 'ACTION NON SOUMISE — cette action doit être approuvée avant exécution.',
            self::SOUMISE => 'EN ATTENTE D’APPROBATION — cette action ne peut pas encore être exécutée.',
            self::REFUSEE => 'ACTION REFUSÉE — exécution interdite.',
            default => 'Statut d’approbation inconnu — exécution refusée.',
        });
    }
}
