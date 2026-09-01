<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CycleReproduction extends Model
{
    protected $table = 'cycles_reproduction';

    protected $guarded = [];

    /** @return BelongsTo<Animal, $this> */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
