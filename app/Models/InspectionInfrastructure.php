<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InspectionInfrastructure extends Model
{
    use EstImmuable;

    protected $table = 'inspections_infrastructure';

    protected $guarded = [];

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'created_at' => 'datetime',
            'intervention_requise' => 'boolean',
        ];
    }

    /** @return BelongsTo<Infrastructure, $this> */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class);
    }

    /** @return HasMany<OrdreTravail, $this> */
    public function ordresTravail(): HasMany
    {
        return $this->hasMany(OrdreTravail::class, 'inspection_id');
    }

    public function degradation(): bool
    {
        $echelle = ['bon' => 0, 'moyen' => 1, 'mauvais' => 2, 'critique' => 3, 'hors_service' => 4];

        return $this->etat_precedent !== null
            && ($echelle[$this->etat_constate] ?? 0) > ($echelle[$this->etat_precedent] ?? 0);
    }
}
