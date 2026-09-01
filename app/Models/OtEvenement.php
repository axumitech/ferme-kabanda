<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtEvenement extends Model
{
    use EstImmuable;

    protected $table = 'ot_evenements';

    protected $guarded = [];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /** @return BelongsTo<OrdreTravail, $this> */
    public function ordreTravail(): BelongsTo
    {
        return $this->belongsTo(OrdreTravail::class, 'ordre_travail_id');
    }
}
