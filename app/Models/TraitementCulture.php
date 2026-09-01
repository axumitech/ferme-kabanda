<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TraitementCulture extends Model
{
    use EstImmuable;

    protected $table = 'traitements_culture';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'recolte_autorisee_le' => 'date',
            'epi_porte' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Plantation, $this> */
    public function plantation(): BelongsTo
    {
        return $this->belongsTo(Plantation::class);
    }

    /** @return BelongsTo<MatiereActive, $this> */
    public function matiereActive(): BelongsTo
    {
        return $this->belongsTo(MatiereActive::class);
    }
}
