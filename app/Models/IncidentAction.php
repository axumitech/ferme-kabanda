<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentAction extends Model
{
    protected $guarded = [];

    protected $casts = ['echeance' => 'date'];

    /** @return BelongsTo<Incident, $this> */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /** @return BelongsTo<Tache, $this> */
    public function tache(): BelongsTo
    {
        return $this->belongsTo(Tache::class);
    }

    /** @return BelongsTo<User, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }
}
