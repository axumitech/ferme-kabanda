<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\Article;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Unite;
use App\Models\Vente;
use App\Models\VenteLigne;
use App\Support\Montant;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class VenteService
{
    public function __construct(private TauxChangeService $change, private MagasinService $magasin) {}

    /** @param array<string, mixed> $data */
    public function creer(array $data): Vente
    {
        $date = Carbon::parse($data['date'] ?? today());
        if ($date->isFuture()) {
            throw new RuntimeException("Une vente se date du jour de la transaction, pas à l'avance.");
        }
        $devise = $data['devise'] ?? 'USD';

        return Vente::query()->create([
            'reference' => Numerotation::suivant('VTE', true), 'date' => $date,
            'client_id' => $data['client_id'] ?? null, 'client_libre' => $data['client_libre'] ?? null,
            'canal' => $data['canal'] ?? null, 'site_id' => $data['site_id'] ?? null, 'devise' => $devise,
            'taux_applique' => $this->change->taux('CDF', $date), 'mode_paiement' => $data['mode_paiement'] ?? null,
            'echeance' => $data['echeance'] ?? null, 'transport' => $data['transport'] ?? null, 'note' => $data['note'] ?? null,
            'statut' => 'brouillon', 'cree_par_id' => auth()->id(),
        ]);
    }

    /** @param array<string, mixed> $data */
    public function ajouterLigne(Vente $vente, array $data): VenteLigne
    {
        $this->modifiable($vente);
        $nature = (string) $data['nature'];
        $line = ['nature' => $nature, 'devise' => $vente->devise];
        if (str_starts_with($nature, 'animal')) {
            $animal = Animal::query()->whereKey($data['animal_id'])->first();
            if (! $animal) {
                throw new RuntimeException('Animal introuvable.');
            }
            $this->animalVendable($animal);
            $vif = (float) ($data['poids_vif'] ?? $animal->poids ?? 0);
            if ($vif <= 0) {
                throw new RuntimeException("Pesez l'animal avant de le vendre.");
            }
            $carcasse = $nature === 'animal_abattu' ? (float) ($data['poids_carcasse'] ?? 0) : null;
            if ($nature === 'animal_abattu' && (! $carcasse || $carcasse > $vif)) {
                throw new RuntimeException('Le poids de carcasse est obligatoire et ne peut dépasser le poids vif.');
            }
            $line += ['animal_id' => $animal->id, 'designation' => $animal->code.' — '.($nature === 'animal_abattu' ? 'carcasse' : $animal->categorie.' (sur pied)'), 'poids_vif' => $vif, 'poids_carcasse' => $carcasse, 'rendement' => $carcasse ? round($carcasse / $vif * 100, 2) : null, 'quantite' => $carcasse ?: (($data['unite'] ?? 'kg') === 'tête' ? 1 : $vif), 'unite' => $nature === 'animal_abattu' ? 'kg' : ($data['unite'] ?? 'kg')];
        } elseif ($nature === 'recolte') {
            $plantation = Plantation::query()->with('culture')->whereKey($data['plantation_id'])->first();
            if (! $plantation) {
                throw new RuntimeException('Plantation introuvable.');
            }
            $quantity = (float) $data['quantite'];
            $available = $this->recolteDisponible($plantation);
            if ($quantity <= 0 || $quantity > $available + .001) {
                throw new RuntimeException("Stock récolté insuffisant : {$available} disponible(s).");
            }
            $line += ['plantation_id' => $plantation->id, 'designation' => ($plantation->culture->nom ?? 'Récolte').' — '.$plantation->reference, 'quantite' => $quantity, 'unite' => $data['unite'] ?? $plantation->culture->unite_recolte ?? 'kg'];
        } elseif ($nature === 'article') {
            $article = Article::query()->with('uniteUsage')->whereKey($data['article_id'])->first();
            if (! $article) {
                throw new RuntimeException('Article introuvable.');
            }
            $quantity = (float) $data['quantite'];
            if ($quantity <= 0) {
                throw new RuntimeException('La quantité doit être positive.');
            }
            $line += ['article_id' => $article->id, 'designation' => $article->code.' — '.$article->libelle, 'quantite' => $quantity, 'unite' => $data['unite'] ?? $article->uniteUsage->nom ?? 'unité'];
        } else {
            $line += ['designation' => $data['designation'], 'quantite' => (float) $data['quantite'], 'unite' => $data['unite'] ?? 'unité'];
        }
        $price = Montant::de($data['prix_unitaire'], $vente->devise);
        $amount = $price->fois($line['quantite']);
        $created = $vente->lignes()->create($line + ['prix_unitaire' => $price->decimal(), 'montant' => $amount->decimal(), 'montant_usd' => $amount->versDevise('USD', (float) $vente->taux_applique)->decimal()]);
        $this->recalculer($vente);

        return $created;
    }

    public function supprimerLigne(VenteLigne $line): void
    {
        $vente = $line->vente;
        $this->modifiable($vente);
        $line->delete();
        $this->recalculer($vente->refresh());
    }

    public function livrer(Vente $vente): Vente
    {
        $this->modifiable($vente);
        if (! $vente->lignes()->exists()) {
            throw new RuntimeException("Aucune ligne : il n'y a rien à livrer.");
        }
        if (! $vente->client_id && blank($vente->client_libre)) {
            throw new RuntimeException("Le client est obligatoire : une sortie sans destinataire n'est pas traçable.");
        }

        return DB::transaction(function () use ($vente): Vente {
            foreach ($vente->lignes()->get() as $line) {
                if ($line->nature === 'article') {
                    $this->sortirArticle($vente, $line);
                } elseif ($line->nature === 'recolte') {
                    $this->sortirRecolte($line);
                } elseif (str_starts_with($line->nature, 'animal')) {
                    $this->sortirAnimal($vente, $line);
                }
            }
            $fullyPaid = Montant::de($vente->montant, $vente->devise)
                ->moins(Montant::de($vente->montant_regle, $vente->devise))
                ->estZero();
            $vente->update(['statut' => $fullyPaid ? 'payee' : 'livree', 'bon_livraison' => $vente->bon_livraison ?? Numerotation::suivant('BL', true), 'livre_par_id' => auth()->id(), 'livree_le' => now()]);

            return $vente->refresh();
        });
    }

    public function encaisser(Vente $vente, float $amount, ?string $mode = null): Vente
    {
        if ($vente->statut === 'annulee') {
            throw new RuntimeException('Vente annulée : aucun encaissement possible.');
        }
        if ($amount <= 0) {
            throw new RuntimeException('Le montant encaissé doit être positif.');
        }
        $due = Montant::de($vente->montant, $vente->devise);
        $total = Montant::de($vente->montant_regle, $vente->devise)->plus(Montant::de($amount, $vente->devise));
        if ($total->plusGrandQue($due)) {
            throw new RuntimeException('Encaissement supérieur au montant dû ('.number_format($vente->resteADevoir(), 2, ',', ' ').' restant).');
        }
        $paidStatus = $vente->statut !== 'brouillon' && $due->moins($total)->estZero()
            ? 'payee'
            : $vente->statut;
        $vente->update(['montant_regle' => $total->decimal(), 'mode_paiement' => $mode ?? $vente->mode_paiement, 'statut' => $paidStatus]);

        return $vente->refresh();
    }

    public function annuler(Vente $vente, string $reason): Vente
    {
        if (in_array($vente->statut, ['livree', 'payee'], true)) {
            throw new RuntimeException("Une vente livrée ne s'annule pas : utilisez un retour de marchandise.");
        }
        $vente->update(['statut' => 'annulee', 'note' => trim(($vente->note ?? '')."\nAnnulée : ".$reason)]);

        return $vente;
    }

    private function modifiable(Vente $vente): void
    {
        if ($vente->statut !== 'brouillon') {
            throw new RuntimeException('Seul un brouillon se modifie.');
        }
    }

    private function animalVendable(Animal $animal): void
    {
        if ($animal->statut !== 'present') {
            throw new RuntimeException("{$animal->code} n'est plus présent au registre.");
        }
        $dar = $animal->evenements()->whereDate('dar_jusquau', '>=', today())->orderByDesc('dar_jusquau')->first();
        if ($dar) {
            throw new RuntimeException("DÉLAI D'ATTENTE EN COURS — vente interdite avant le ".Carbon::parse($dar->dar_jusquau)->format('d/m/Y').'.');
        }
    }

    private function recolteDisponible(Plantation $plantation): float
    {
        return round((float) $plantation->recoltes()->sum('quantite') - (float) $plantation->recoltes()->sum('quantite_vendue'), 3);
    }

    private function sortirArticle(Vente $vente, VenteLigne $line): void
    {
        $article = Article::query()->with('uniteUsage')->findOrFail($line->article_id);
        $unit = Unite::query()->where('nom', $line->unite)->first() ?? $article->uniteUsage;
        $movement = $this->magasin->sortie($article, (float) $line->quantite, $unit, "Vente {$vente->reference} — {$vente->nomClient()}", $vente);
        $line->update(['mouvement_id' => $movement->id]);
    }

    private function sortirRecolte(VenteLigne $line): void
    {
        $remaining = (float) $line->quantite;
        foreach (Recolte::query()->where('plantation_id', $line->plantation_id)->orderBy('date')->get() as $harvest) {
            $available = (float) $harvest->quantite - (float) $harvest->quantite_vendue;
            if ($available <= 0) {
                continue;
            }
            $taken = min($available, $remaining);
            Recolte::withoutEvents(fn () => $harvest->forceFill(['quantite_vendue' => (float) $harvest->quantite_vendue + $taken])->saveQuietly());
            $remaining -= $taken;
            if ($remaining <= .001) {
                break;
            }
        }
        if ($remaining > .001) {
            throw new RuntimeException('Stock de récolte insuffisant au moment de la livraison.');
        }
    }

    private function sortirAnimal(Vente $vente, VenteLigne $line): void
    {
        $animal = Animal::query()->findOrFail($line->animal_id);
        $reason = $line->nature === 'animal_abattu' ? 'ABATTAGE' : 'VENTE';
        $animal->update(['statut' => 'sorti', 'sortie_le' => today(), 'sortie_motif' => $reason, 'sortie_valeur' => $line->montant_usd, 'sortie_note' => "Vente {$vente->reference}", 'vente_id' => $vente->id]);
        $animal->evenements()->create(['type' => 'sortie', 'date' => today(), 'titre' => "Sortie — {$reason}", 'detail' => "Vente {$vente->reference} — {$vente->nomClient()}", 'valeur' => $line->montant_usd, 'unite' => 'USD', 'user_id' => auth()->id(), 'user_nom' => auth()->user()->name, 'created_at' => now()]);
    }

    private function recalculer(Vente $vente): void
    {
        $total = Montant::somme($vente->lignes()->pluck('montant'), $vente->devise);
        $rate = (float) $vente->taux_applique;
        $vente->update(['montant' => $total->decimal(), 'montant_usd' => $total->versDevise('USD', $rate)->decimal(), 'montant_cdf' => $total->versDevise('CDF', $rate)->decimal()]);
    }
}
