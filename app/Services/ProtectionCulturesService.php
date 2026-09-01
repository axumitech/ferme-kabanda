<?php

namespace App\Services;

use App\Models\Article;
use App\Models\MatiereActive;
use App\Models\Plantation;
use App\Models\TraitementCulture;
use App\Models\Unite;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProtectionCulturesService
{
    public function __construct(protected MagasinService $magasin) {}

    /** @param array<string, mixed> $data */
    public function traiter(Plantation $plantation, array $data): TraitementCulture
    {
        $matiere = filled($data['matiere_active_id'] ?? null) ? MatiereActive::query()->find((int) $data['matiere_active_id']) : null;
        if ($matiere?->interdit) {
            throw new RuntimeException("PRODUIT INTERDIT — {$matiere->nom} ({$matiere->libelleGroupe()}). {$matiere->motif_interdiction}");
        }
        if (empty($data['epi_porte'])) {
            throw new RuntimeException('ÉQUIPEMENT DE PROTECTION — la saisie est refusée tant que le port des EPI n’est pas confirmé.');
        }
        $date = Carbon::parse($data['date']);
        if ($date->isFuture() || $date->lt($plantation->j0)) {
            throw new RuntimeException('La date du traitement doit être comprise entre le J0 et aujourd’hui.');
        }
        $dar = $data['dar_jours'] ?? $matiere?->dar_jours;
        if ($dar === null) {
            throw new RuntimeException('DÉLAI AVANT RÉCOLTE MANQUANT — saisissez le délai porté sur l’étiquette du produit.');
        }
        $libere = $date->copy()->addDays((int) $dar);

        return DB::transaction(function () use ($plantation, $data, $matiere, $date, $dar, $libere): TraitementCulture {
            $mouvement = null;
            if (filled($data['article_id'] ?? null) && filled($data['quantite_sortie'] ?? null)) {
                $article = Article::query()->findOrFail((int) $data['article_id']);
                $unite = Unite::query()->findOrFail($article->unite_usage_id);
                $mouvement = $this->magasin->sortie($article, (float) $data['quantite_sortie'], $unite, "Traitement {$data['produit']} — plantation {$plantation->reference}");
            }
            $traitement = TraitementCulture::query()->create([
                'reference' => Numerotation::suivant('TRT', true), 'plantation_id' => $plantation->id,
                'date' => $date, 'matiere_active_id' => $matiere?->id, 'produit' => $data['produit'],
                'lot_produit' => $data['lot_produit'] ?? null, 'dose_valeur' => $data['dose_valeur'],
                'dose_unite' => $data['dose_unite'], 'planches_traitees' => $data['planches_traitees'] ?? null,
                'cible' => $data['cible'] ?? null, 'dar_jours' => $dar, 'recolte_autorisee_le' => $libere,
                'epi_porte' => true, 'article_id' => $data['article_id'] ?? null, 'mouvement_id' => $mouvement?->id,
                'photo_chemin' => $data['photo_chemin'] ?? null, 'user_id' => auth()->id(),
                'user_nom' => auth()->user()->name,
            ]);
            if ($plantation->recolte_bloquee_jusquau === null || $libere->gt($plantation->recolte_bloquee_jusquau)) {
                $plantation->update(['recolte_bloquee_jusquau' => $libere]);
            }

            return $traitement;
        });
    }
}
