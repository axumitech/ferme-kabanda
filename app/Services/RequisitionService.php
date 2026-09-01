<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\Article;
use App\Models\Requisition;
use App\Models\Unite;
use App\Support\Numerotation;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RequisitionService
{
    public function __construct(private DoAService $doa, private TacheService $taches, private MagasinService $magasin) {}

    /** @param array<string, mixed> $data */
    public function creer(array $data): Requisition
    {
        if (blank($data['objet'] ?? null)) {
            throw new RuntimeException('L’objet de la demande est obligatoire.');
        }
        $valeur = $this->valeur($data);

        return Requisition::query()->create(array_merge($data, [
            'reference' => Numerotation::suivant('RQ', true),
            'valeur' => $valeur,
            'niveau_requis' => $this->doa->niveauRequis($valeur, ($data['type'] ?? '') === 'STK' ? 'sortie_stock' : 'depense'),
            'statut' => 'demandee',
            'demandeur_id' => auth()->id(),
        ]));
    }

    public function verifier(Requisition $r, ?string $note = null): Requisition
    {
        $this->transition($r, 'demandee');
        $this->distinct($r);
        $r->update(['statut' => 'verifiee', 'verifie_par_id' => auth()->id(), 'verifie_le' => now()]);
        $r->journaliser('valide', null, null, "{$r->reference} vérifiée".($note ? " — {$note}" : ''));

        return $r->fresh();
    }

    public function refuser(Requisition $r, string $motif): Requisition
    {
        if (blank($motif)) {
            throw new RuntimeException('Le motif de refus est obligatoire.');
        }
        if (! in_array($r->statut, ['demandee', 'verifiee'], true)) {
            throw new RuntimeException('Seule une réquisition en attente peut être refusée.');
        }
        $this->distinct($r);
        $r->update([
            'statut' => 'refusee',
            'motif_refus' => $motif,
            'approuve_par_id' => auth()->id(),
            'approuve_le' => now(),
        ]);

        return $r->fresh();
    }

    public function approuver(Requisition $r): Requisition
    {
        $this->transition($r, 'verifiee');
        $this->distinct($r);
        if ($r->verifie_par_id === auth()->id()) {
            throw new RuntimeException('SÉPARATION DES POUVOIRS — le vérificateur ne peut pas approuver.');
        } $this->doa->verifier(auth()->user(), (float) $r->valeur, $r->type === 'STK' ? 'sortie_stock' : 'depense');

        return DB::transaction(function () use ($r) {
            $r->update(['statut' => 'approuvee', 'approuve_par_id' => auth()->id(), 'approuve_le' => now()]);
            $task = $this->taches->creer(['source' => SourceTache::Requisition, 'titre' => "Servir {$r->reference} — {$r->objet}", 'site_id' => $r->site_id, 'departement_id' => $r->departement_id, 'lieu' => 'Magasin', 'date_due' => today()->addDay()->toDateString(), 'priorite' => Priorite::Elevee], $r);
            $r->update(['tache_service_id' => $task->id]);

            return $r->fresh();
        });
    }

    public function servir(Requisition $r): Requisition
    {
        $this->transition($r, 'approuvee');

        return DB::transaction(function () use ($r) {
            $mouvement = null;
            if ($r->type === 'STK') {
                if (! $r->article || ! $r->quantite) {
                    throw new RuntimeException('Article et quantité obligatoires.');
                } $mouvement = $this->magasin->sortie($r->article, (float) $r->quantite, $r->unite ?? $r->article->uniteUsage, "Réquisition {$r->reference}", $r);
            } $r->update(['statut' => 'servie', 'servi_par_id' => auth()->id(), 'servi_le' => now(), 'mouvement_id' => $mouvement?->id]);
            if ($r->tacheService?->getRawOriginal('statut') === StatutTache::AFaire->value) {
                $this->taches->marquerFaite($r->tacheService);
            }

            return $r->fresh();
        });
    }

    private function transition(Requisition $r, string $statut): void
    {
        if ($r->statut !== $statut) {
            throw new RuntimeException("Statut requis : {$statut}.");
        }
    }

    private function distinct(Requisition $r): void
    {
        if ($r->demandeur_id === auth()->id()) {
            throw new RuntimeException('AUTO-APPROBATION REFUSÉE.');
        }
    }

    /** @param array<string, mixed> $data */
    private function valeur(array $data): float
    {
        if (($data['type'] ?? null) !== 'STK') {
            return (float) ($data['montant'] ?? 0);
        }

        if (empty($data['article_id']) || empty($data['unite_id'])) {
            return 0.0;
        }

        $article = Article::query()->find((int) $data['article_id']);
        $unite = Unite::query()->find((int) $data['unite_id']);
        $purchaseUnit = $article?->uniteAchat()->first();
        $price = $article?->getAttribute('prix_unitaire');
        if (! $article || ! $unite || ! $purchaseUnit || $price === null || ! $unite->estCompatible($purchaseUnit)) {
            return 0.0;
        }

        $pricePerBaseUnit = (float) $price / max(1e-9, (float) $purchaseUnit->getAttribute('vers_base'));

        return round((float) ($data['quantite'] ?? 0) * $pricePerBaseUnit * (float) $unite->getAttribute('vers_base'), 2);
    }
}
