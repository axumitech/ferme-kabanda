<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TacheIntervenant extends Model
{
    public const RESPONSABLE = 'responsable';

    public const APPUI = 'appui';

    public const INFORME = 'informe';

    protected $fillable = ['tache_id', 'user_id', 'role'];

    /** @return BelongsTo<Tache, $this> */
    public function tache(): BelongsTo
    {
        return $this->belongsTo(Tache::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
