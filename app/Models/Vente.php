<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Support\Montant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vente extends Model
{
    use Auditable;

    protected $guarded = [];

    public const STATUTS = ['brouillon' => 'Brouillon', 'livree' => 'Livrée', 'facturee' => 'Facturée', 'payee' => 'Payée', 'annulee' => 'Annulée'];

    public const MODES_PAIEMENT = ['especes' => 'Espèces', 'mobile_money' => 'Mobile money', 'virement' => 'Virement bancaire', 'credit' => 'Crédit — à recouvrer'];

    protected function casts(): array
    {
        return ['date' => 'date', 'echeance' => 'date', 'livree_le' => 'datetime', 'montant' => 'decimal:2', 'montant_usd' => 'decimal:2', 'montant_cdf' => 'decimal:2', 'montant_regle' => 'decimal:2', 'taux_applique' => 'decimal:4'];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return HasMany<VenteLigne, $this> */
    public function lignes(): HasMany
    {
        return $this->hasMany(VenteLigne::class);
    }

    public function nomClient(): string
    {
        return $this->client_id
            ? ($this->client->nom ?? $this->client_libre ?? 'Client de passage')
            : ($this->client_libre ?? 'Client de passage');
    }

    public function resteADevoir(): float
    {
        return Montant::de($this->montant, $this->devise)->moins(Montant::de($this->montant_regle, $this->devise))->decimal();
    }

    protected function resumeAudit(string $action): string
    {
        return "Vente {$this->reference} — {$action}";
    }
}
