<?php

namespace App\Services;

use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\InspectionInfrastructure;
use App\Models\OrdreTravail;
use App\Models\User;
use App\Support\HorlogeServeur;
use App\Support\Montant;
use App\Support\Numerotation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MaintenanceService
{
    public function __construct(protected OrdreTravailService $ordres) {}

    /** @param array<string, mixed> $donnees */
    public function inspecter(Infrastructure $infrastructure, array $donnees): InspectionInfrastructure
    {
        if (blank($donnees['constat'] ?? null)) {
            throw new RuntimeException('Une inspection exige un constat écrit.');
        }

        $etat = $donnees['etat_constate'] ?? null;
        if (! is_string($etat) || ! array_key_exists($etat, Infrastructure::ETATS)) {
            throw new RuntimeException("L'état constaté est invalide.");
        }

        $date = HorlogeServeur::declaree($donnees['date'] ?? null, "La date de l'inspection");

        return DB::transaction(function () use ($infrastructure, $donnees, $etat, $date): InspectionInfrastructure {
            $user = auth()->user();
            $precedent = $infrastructure->etat;

            $inspection = InspectionInfrastructure::query()->create([
                'reference' => Numerotation::suivant('INS', true),
                'infrastructure_id' => $infrastructure->id,
                'date' => $date,
                'etat_constate' => $etat,
                'etat_precedent' => $precedent,
                'constat' => $donnees['constat'],
                'actions_immediates' => $donnees['actions_immediates'] ?? null,
                'intervention_requise' => (bool) ($donnees['intervention_requise'] ?? false),
                'photo_chemin' => $donnees['photo_chemin'] ?? null,
                'inspecteur_id' => $user?->id,
                'inspecteur_nom' => $user instanceof User ? $user->name : 'inspecteur',
            ]);

            $infrastructure->update([
                'etat' => $etat,
                'etat_constate_le' => $date,
                'derniere_inspection' => $date,
                'prochaine_inspection' => $infrastructure->periodicite_inspection_jours
                    ? $date->copy()->addDays((int) $infrastructure->periodicite_inspection_jours)
                    : null,
            ]);

            if ($inspection->intervention_requise || in_array($etat, ['mauvais', 'critique', 'hors_service'], true)) {
                $urgent = in_array($etat, ['critique', 'hors_service'], true);

                if (! $this->ordreInspectionOuvert($inspection)) {
                    $this->ordres->demander([
                        'origine' => 'inspection',
                        'type_intervention' => 'correctif',
                        'objet' => 'Inspection '.$inspection->reference.' - '.$infrastructure->nom,
                        'description' => $donnees['constat'],
                        'priorite' => $urgent ? 'urgente' : 'elevee',
                        'arret_production' => $etat === 'hors_service',
                        'site_id' => $infrastructure->site_id,
                        'inspection_id' => $inspection->id,
                        'echeance' => today()->addDays($urgent ? 1 : 14),
                        'photo_avant' => $donnees['photo_chemin'] ?? null,
                    ], $infrastructure);
                }
            }

            return $inspection;
        });
    }

    /** @return array{ordres_ouverts: int, inspections_en_retard: int} */
    public function ouvrirPreventifsDus(): array
    {
        $ouverts = 0;
        $inspections = 0;

        Equipement::query()->where('actif', true)->with('entretiens')->each(function (Equipement $equipement) use (&$ouverts): void {
            $ouverts += $this->ouvrirPreventifsPourEquipement($equipement);
        });

        Infrastructure::query()->where('actif', true)->with('entretiens')->each(function (Infrastructure $infrastructure) use (&$ouverts, &$inspections): void {
            foreach ($infrastructure->entretiens as $entretien) {
                if (! $entretien->actif
                    || $entretien->prochain_le === null
                    || Carbon::parse($entretien->prochain_le)->isFuture()
                    || $this->dejaOuvert($infrastructure, $entretien->id)) {
                    continue;
                }

                $this->ordres->demander([
                    'origine' => 'preventif',
                    'type_intervention' => 'preventif',
                    'objet' => $entretien->libelle.' - '.$infrastructure->code,
                    'description' => $entretien->operations,
                    'priorite' => 'normale',
                    'site_id' => $infrastructure->site_id,
                    'entretien_planifie_id' => $entretien->id,
                    'echeance' => $entretien->prochain_le,
                    'approbation_requise' => false,
                ], $infrastructure);
                $ouverts++;
            }

            if ($infrastructure->inspectionEnRetard()) {
                $inspections++;
            }
        });

        return ['ordres_ouverts' => $ouverts, 'inspections_en_retard' => $inspections];
    }

    public function ouvrirPreventifsPourEquipement(Equipement $equipement): int
    {
        if (! $equipement->actif) {
            return 0;
        }

        $ouverts = 0;
        $equipement->loadMissing('entretiens');

        foreach ($equipement->entretiens as $entretien) {
            if (! $entretien->actif
                || (! $entretien->estDu($equipement) && ! $entretien->approche($equipement))
                || $this->dejaOuvert($equipement, $entretien->id)) {
                continue;
            }

            $this->ordres->demander([
                'origine' => 'preventif',
                'type_intervention' => 'preventif',
                'objet' => $entretien->libelle.' - '.$equipement->code,
                'description' => $entretien->operations,
                'priorite' => $entretien->estDu($equipement) ? 'elevee' : 'normale',
                'site_id' => $equipement->site_id,
                'entretien_planifie_id' => $entretien->id,
                'echeance' => $entretien->prochain_le ?? today()->addDays(7),
                'approbation_requise' => false,
            ], $equipement);
            $ouverts++;
        }

        return $ouverts;
    }

    /** @return array<string, int|float|null> */
    public function indicateurs(CarbonInterface $du, CarbonInterface $au): array
    {
        $periode = OrdreTravail::query()->whereBetween('demande_le', [$du, $au])->get();
        $clos = $periode->where('statut', 'clos');
        $preventifs = $periode->where('type_intervention', 'preventif')->count();
        $correctifs = $periode->where('type_intervention', 'correctif')->count();
        $totalInterventions = $preventifs + $correctifs;
        $reparations = $clos->map(fn (OrdreTravail $ordre): ?float => $ordre->dureeReparation())->filter();
        $delais = $clos->map(fn (OrdreTravail $ordre): int => $ordre->joursOuvert());
        $ouverts = OrdreTravail::query()->whereNotIn('statut', ['clos', 'refuse', 'annule'])->get();

        return [
            'demandes' => $periode->count(),
            'clos' => $clos->count(),
            'preventifs' => $preventifs,
            'correctifs' => $correctifs,
            'part_preventif' => $totalInterventions > 0 ? (int) round($preventifs / $totalInterventions * 100) : null,
            'temps_reparation' => $reparations->isNotEmpty() ? round($reparations->avg(), 1) : null,
            'delai_traitement' => $delais->isNotEmpty() ? round($delais->avg(), 1) : null,
            'ouverts' => $ouverts->count(),
            'en_retard' => $ouverts->filter(fn (OrdreTravail $ordre): bool => $ordre->enRetard())->count(),
            'arrets' => $periode->where('arret_production', true)->count(),
            'recurrents' => $periode->where('recurrent', true)->count(),
            'cout_total' => Montant::somme(
                $clos->map(fn (OrdreTravail $ordre): Montant => Montant::de($ordre->cout_total, 'USD')),
                'USD',
            )->decimal(),
            'immobilisation' => round((float) $clos->sum('immobilisation_heures'), 1),
        ];
    }

    /** @return array<string, mixed> */
    public function retardAccumule(): array
    {
        $ouverts = OrdreTravail::query()
            ->whereNotIn('statut', ['clos', 'refuse', 'annule'])
            ->with('cible')
            ->get();

        return [
            'total' => $ouverts->count(),
            'urgents' => $ouverts->where('priorite', 'urgente')->count(),
            'arrets' => $ouverts->where('arret_production', true)->count(),
            'moins_7j' => $ouverts->filter(fn (OrdreTravail $ordre): bool => $ordre->joursOuvert() <= 7)->count(),
            'de_7_a_30j' => $ouverts->filter(fn (OrdreTravail $ordre): bool => $ordre->joursOuvert() > 7 && $ordre->joursOuvert() <= 30)->count(),
            'plus_30j' => $ouverts->filter(fn (OrdreTravail $ordre): bool => $ordre->joursOuvert() > 30)->count(),
            'liste' => $ouverts->sortByDesc(fn (OrdreTravail $ordre): int => $ordre->joursOuvert())->values(),
        ];
    }

    protected function dejaOuvert(Model $cible, int $entretienId): bool
    {
        return OrdreTravail::query()
            ->where('cible_type', $cible::class)
            ->where('cible_id', $cible->getKey())
            ->where('entretien_planifie_id', $entretienId)
            ->whereNotIn('statut', ['clos', 'refuse', 'annule'])
            ->exists();
    }

    protected function ordreInspectionOuvert(InspectionInfrastructure $inspection): bool
    {
        return OrdreTravail::query()
            ->where('inspection_id', $inspection->id)
            ->whereNotIn('statut', ['clos', 'refuse', 'annule'])
            ->exists();
    }
}
