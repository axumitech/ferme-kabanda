<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Models\Article;
use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\InterventionEquipement;
use App\Models\TravailEquipement;
use App\Models\User;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class EquipementService
{
    public function __construct(
        private MagasinService $magasin,
        private TacheService $taches,
        private MaintenanceService $maintenance,
    ) {}

    /** @param array<string, mixed> $data */
    public function enregistrerTravail(Equipement $equipement, array $data): TravailEquipement
    {
        if (in_array($equipement->statut, ['reforme', 'immobilise'], true)) {
            $statut = Equipement::STATUTS[$equipement->statut];
            $motif = $equipement->motif_immobilisation ? " - {$equipement->motif_immobilisation}" : '';

            throw new RuntimeException("{$equipement->code} est {$statut}{$motif}. Aucun travail ne peut y être imputé.");
        }

        $date = Carbon::parse($data['date'] ?? today());
        if ($date->isFuture()) {
            throw new RuntimeException('Une fiche de travail se remplit après le travail, pas avant.');
        }

        $debut = $data['compteur_debut'] ?? $equipement->compteur_actuel;
        $fin = $data['compteur_fin'] ?? null;
        $parcouru = null;

        if ($equipement->type_compteur !== 'aucun' && $fin !== null) {
            if ((float) $fin < (float) $debut) {
                throw new RuntimeException("Le compteur de fin ({$fin}) est inférieur au compteur de début ({$debut}). Un compteur ne recule pas.");
            }

            if ((float) $debut < (float) $equipement->compteur_actuel) {
                throw new RuntimeException("Le compteur de début ({$debut}) est inférieur au dernier relevé connu ({$equipement->compteur_actuel} {$equipement->uniteCompteur()}).");
            }

            $parcouru = round((float) $fin - (float) $debut, 2);
        }

        $duree = $data['duree_heures'] ?? null;
        if ($duree === null && ! empty($data['heure_debut']) && ! empty($data['heure_fin'])) {
            $heureDebut = Carbon::parse($date->toDateString().' '.$data['heure_debut']);
            $heureFin = Carbon::parse($date->toDateString().' '.$data['heure_fin']);
            if ($heureFin->lt($heureDebut)) {
                $heureFin->addDay();
            }
            $duree = round($heureDebut->diffInMinutes($heureFin) / 60, 2);
        }

        if (($data['nature'] ?? 'interne') === 'tiers' && blank($data['client_libre'] ?? null)) {
            throw new RuntimeException("Une prestation pour un tiers exige un client identifié : sans lui, il n'y a pas de facture.");
        }

        return DB::transaction(function () use ($equipement, $data, $date, $debut, $fin, $parcouru, $duree): TravailEquipement {
            $user = auth()->user();
            $mouvement = null;
            $coutCarburant = $data['cout_carburant'] ?? null;

            if (! empty($data['article_carburant_id']) && ! empty($data['carburant_litres'])) {
                $article = Article::query()
                    ->with('uniteUsage')
                    ->whereKey($data['article_carburant_id'])
                    ->firstOrFail();
                $mouvement = $this->magasin->sortie(
                    $article,
                    (float) $data['carburant_litres'],
                    $article->uniteUsage,
                    "Carburant - {$equipement->code}, {$data['travail']} du {$date->format('d/m/Y')}",
                );
                $coutCarburant ??= round((float) $data['carburant_litres'] * (float) ($article->prix_unitaire ?? 0), 2);
            }

            $travail = TravailEquipement::query()->create([
                'reference' => Numerotation::suivant('FT', true),
                'equipement_id' => $equipement->id,
                'date' => $date,
                'operateur_id' => $data['operateur_id'] ?? $user?->id,
                'operateur_nom' => $data['operateur_nom']
                    ?? User::query()->whereKey($data['operateur_id'] ?? 0)->value('name')
                    ?? $user->name
                    ?? 'non précisé',
                'heure_debut' => $data['heure_debut'] ?? null,
                'heure_fin' => $data['heure_fin'] ?? null,
                'duree_heures' => $duree,
                'compteur_debut' => $debut,
                'compteur_fin' => $fin,
                'compteur_parcouru' => $parcouru,
                'nature' => $data['nature'] ?? 'interne',
                'travail' => $data['travail'],
                'parcelle_id' => $data['parcelle_id'] ?? null,
                'surface_travaillee' => $data['surface_travaillee'] ?? null,
                'destination' => $data['destination'] ?? null,
                'client_libre' => $data['client_libre'] ?? null,
                'carburant_litres' => $data['carburant_litres'] ?? null,
                'mouvement_carburant_id' => $mouvement?->id,
                'cout_carburant' => $coutCarburant,
                'montant_facture' => $data['montant_facture'] ?? null,
                'devise' => $data['devise'] ?? 'USD',
                'observation' => $data['observation'] ?? null,
                'anomalie' => $data['anomalie'] ?? null,
                'photo_chemin' => $data['photo_chemin'] ?? null,
                'statut' => 'saisi',
            ]);

            if ($fin !== null) {
                $equipement->update(['compteur_actuel' => $fin]);
                $equipement->refresh();
                $this->maintenance->ouvrirPreventifsPourEquipement($equipement);
            }

            if (! blank($data['anomalie'] ?? null)) {
                $tache = $this->taches->creer([
                    'source' => SourceTache::Entretien,
                    'titre' => mb_strimwidth("Anomalie signalée sur {$equipement->code}", 0, 180),
                    'description' => $data['anomalie'],
                    'instruction' => "Vérifier avant la prochaine utilisation. Fiche de travail {$travail->reference}.",
                    'date_due' => today()->addDay(),
                    'priorite' => Priorite::Elevee,
                    'responsable_id' => $equipement->responsable_id ?? auth()->id(),
                    'site_id' => $equipement->site_id,
                    'lieu' => $equipement->code,
                ], $travail);
                $travail->update(['tache_id' => $tache->id]);
            }

            return $travail->fresh(['parcelle']);
        }, 3);
    }

    /** @param array<string, mixed> $data */
    public function enregistrerIntervention(Equipement $equipement, array $data): InterventionEquipement
    {
        $date = Carbon::parse($data['date'] ?? today());
        if ($date->isFuture()) {
            throw new RuntimeException('Une intervention ne peut pas être enregistrée dans le futur.');
        }

        return DB::transaction(function () use ($equipement, $data, $date): InterventionEquipement {
            $intervention = InterventionEquipement::query()->create([
                'reference' => Numerotation::suivant('MNT', true),
                'equipement_id' => $equipement->id,
                'entretien_planifie_id' => $data['entretien_planifie_id'] ?? null,
                'date' => $date,
                'type' => $data['type'],
                'compteur' => $data['compteur'] ?? $equipement->compteur_actuel,
                'description' => $data['description'],
                'pieces_utilisees' => $data['pieces_utilisees'] ?? null,
                'cout_pieces' => $data['cout_pieces'] ?? null,
                'cout_main_oeuvre' => $data['cout_main_oeuvre'] ?? null,
                'prestataire' => $data['prestataire'] ?? null,
                'immobilisation_heures' => $data['immobilisation_heures'] ?? null,
                'realise_par_id' => auth()->id(),
                'realise_par_nom' => auth()->user()?->name,
                'photo_chemin' => $data['photo_chemin'] ?? null,
            ]);

            $entretien = EntretienPlanifie::query()
                ->where('equipement_id', $equipement->id)
                ->find($data['entretien_planifie_id'] ?? 0);

            if ($entretien instanceof EntretienPlanifie) {
                $entretien->update([
                    'dernier_compteur' => $intervention->compteur,
                    'dernier_le' => $date,
                    'prochain_compteur' => $entretien->periodicite_compteur
                        ? (float) $intervention->compteur + (float) $entretien->periodicite_compteur
                        : null,
                    'prochain_le' => $entretien->periodicite_jours
                        ? $date->copy()->addDays((int) $entretien->periodicite_jours)
                        : null,
                ]);
            }

            if (($data['remettre_en_service'] ?? false) && $equipement->statut === 'maintenance') {
                $equipement->update([
                    'statut' => 'disponible',
                    'motif_immobilisation' => null,
                ]);
            }

            return $intervention->fresh('entretien');
        }, 3);
    }
}
