<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $plantation_id
 * @property CarbonInterface $date
 * @property string $quantite
 * @property string $quantite_vendue
 * @property string $unite
 * @property string|null $canal_commercial
 * @property string $user_nom
 * @property CarbonInterface|null $created_at
 */
class Recolte extends Model
{
    use EstImmuable;

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'date' => 'date',
        'created_at' => 'datetime',
        'quantite' => 'decimal:2',
        'quantite_vendue' => 'decimal:2',
        'pertes' => 'decimal:2',
        'valeur' => 'decimal:2',
    ];

    public const CANAUX = ['Vente marché', 'EZHL / offtake', 'Cuisine du personnel', 'Semence / réserve', 'Stock frigo', 'PERTE — invendable'];

    /** @return BelongsTo<Plantation, $this> */
    public function plantation(): BelongsTo
    {
        return $this->belongsTo(Plantation::class);
    }
}
