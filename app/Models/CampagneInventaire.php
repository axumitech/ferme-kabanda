<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampagneInventaire extends Model
{
    use Auditable;

    protected $table = 'campagnes_inventaire';

    protected $guarded = [];

    public const TYPES = [
        'tournant' => 'Tournant (par rotation)',
        'annuel' => 'Annuel (exhaustif)',
        'ponctuel' => 'Ponctuel (sur alerte)',
    ];

    public const STATUTS = [
        'ouverte' => 'Ouverte — à compter',
        'comptee' => 'Comptée — à arbitrer',
        'arbitree' => 'Arbitrée — à clôturer',
        'cloturee' => 'Clôturée',
    ];

    protected function casts(): array
    {
        return ['date_comptage' => 'date', 'cloturee_le' => 'datetime', 'ecart_valeur' => 'decimal:2'];
    }

    /** @return HasMany<LigneInventaire, $this> */
    public function lignes(): HasMany
    {
        return $this->hasMany(LigneInventaire::class, 'campagne_inventaire_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return array{total: int, comptes: int, ecarts: int, pourcentage: int, exactitude: float|null} */
    public function avancement(): array
    {
        $total = $this->lignes()->count();
        $counted = $this->lignes()->whereNotNull('compte_base')->count();
        $variances = $this->lignes()->whereNotNull('compte_base')->where('ecart_base', '!=', 0)->count();

        return [
            'total' => $total,
            'comptes' => $counted,
            'ecarts' => $variances,
            'pourcentage' => $total > 0 ? (int) round($counted / $total * 100) : 0,
            'exactitude' => $counted > 0 ? round(($counted - $variances) / $counted * 100, 1) : null,
        ];
    }

    protected function resumeAudit(string $action): string
    {
        return "Inventaire {$this->reference} — {$action}";
    }
}
