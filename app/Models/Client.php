<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use Auditable;

    protected $guarded = [];

    public const CANAUX = ['premium' => 'Premium (EZHL)', 'marche' => 'Marché', 'interne' => 'Cuisine interne / personnel', 'don' => 'Don', 'export' => 'Export'];

    protected function casts(): array
    {
        return ['actif' => 'boolean', 'prix_reference' => 'decimal:2'];
    }

    /** @return HasMany<Vente, $this> */
    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class);
    }

    protected function resumeAudit(string $action): string
    {
        return "Client {$this->code} — {$action}";
    }
}
