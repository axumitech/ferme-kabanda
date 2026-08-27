<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TacheEvenement extends Model
{
    use EstImmuable;

    protected $table = 'tache_evenements';

    public $timestamps = false;

    protected $fillable = ['tache_id', 'type', 'user_id', 'user_nom', 'resume', 'donnees'];

    protected function casts(): array
    {
        return ['donnees' => 'array', 'created_at' => 'datetime'];
    }

    /** @return BelongsTo<Tache, $this> */
    public function tache(): BelongsTo
    {
        return $this->belongsTo(Tache::class);
    }
}
