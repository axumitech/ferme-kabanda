<?php

namespace App\Services;

use App\Enums\StatutTache;
use App\Models\Plan;
use App\Models\PlanLigne;
use App\Models\Tache;

/**
 * @phpstan-type PerformanceLine array{id: int, cible: string|null, code_cible: string|null, jour_offset: int|null, recurrence: string|null, tache: string, instruction: string|null, categorie: string|null, dues: int, faites: int, a_temps: int, justifiees: int, non_justifiees: int, ouvertes: int, taux: int|null, taux_a_temps: int|null}
 */
class PerformancePlanService
{
    /** @return list<PerformanceLine> */
    public function tableau(Plan $plan): array
    {
        $lignes = $plan->lignes()
            ->with(['taches' => fn ($query) => $query->where('est_modele', false)])
            ->orderBy('cible')
            ->orderByRaw('jour_offset is null')
            ->orderBy('jour_offset')
            ->get()
            ->map(function (PlanLigne $ligne): array {
                $taches = $ligne->taches;
                $dues = $taches->count();
                $faites = $taches->where('statut', StatutTache::Faite);
                $aTemps = $faites->filter(fn (Tache $tache): bool => $tache->fait_le !== null
                    && $tache->fait_le->lte($tache->date_due->copy()->endOfDay()))->count();

                return [
                    'id' => $ligne->id,
                    'cible' => $ligne->cible,
                    'code_cible' => $ligne->code_cible,
                    'jour_offset' => $ligne->jour_offset,
                    'recurrence' => $ligne->recurrence,
                    'tache' => $ligne->tache,
                    'instruction' => $ligne->instruction,
                    'categorie' => $ligne->categorie,
                    'dues' => $dues,
                    'faites' => $faites->count(),
                    'a_temps' => $aTemps,
                    'justifiees' => $taches->where('statut', StatutTache::NonFaiteJustifiee)->count(),
                    'non_justifiees' => $taches->where('statut', StatutTache::NonFaiteNonJustifiee)->count(),
                    'ouvertes' => $taches->where('statut', StatutTache::AFaire)->count(),
                    'taux' => $dues > 0 ? (int) round($faites->count() / $dues * 100) : null,
                    'taux_a_temps' => $dues > 0 ? (int) round($aTemps / $dues * 100) : null,
                ];
            })
            ->all();

        return array_values($lignes);
    }

    /**
     * @param  list<PerformanceLine>  $lignes
     * @return array<string, int|null>
     */
    public function synthese(array $lignes): array
    {
        $mesures = collect($lignes);
        $dues = (int) $mesures->sum('dues');
        $faites = (int) $mesures->sum('faites');
        $aTemps = (int) $mesures->sum('a_temps');

        return [
            'lignes' => count($lignes),
            'dues' => $dues,
            'faites' => $faites,
            'a_temps' => $aTemps,
            'justifiees' => (int) $mesures->sum('justifiees'),
            'non_justifiees' => (int) $mesures->sum('non_justifiees'),
            'ouvertes' => (int) $mesures->sum('ouvertes'),
            'taux' => $dues > 0 ? (int) round($faites / $dues * 100) : null,
            'taux_a_temps' => $dues > 0 ? (int) round($aTemps / $dues * 100) : null,
        ];
    }
}
