<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Recolte extends Model
{
    use EstImmuable;

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['date' => 'date', 'quantite' => 'decimal:2', 'pertes' => 'decimal:2', 'valeur' => 'decimal:2'];

    public const CANAUX = ['Vente marché', 'EZHL / offtake', 'Cuisine du personnel', 'Semence / réserve', 'Stock frigo', 'PERTE — invendable'];

    /** @return BelongsTo<Plantation, $this> */
    public function plantation(): BelongsTo
    {
        return $this->belongsTo(Plantation::class);
    }
}
