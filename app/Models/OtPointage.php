<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OtPointage extends Model
{
    protected $table = 'ot_pointages';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'heures' => 'decimal:2',
            'cout' => 'decimal:2',
            'taux_horaire' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<OrdreTravail, $this> */
    public function ordreTravail(): BelongsTo
    {
        return $this->belongsTo(OrdreTravail::class, 'ordre_travail_id');
    }

    /** @return BelongsTo<User, $this> */
    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
