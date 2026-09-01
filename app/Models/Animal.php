<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Animal extends Model
{
    protected $table = 'animaux';

    protected $guarded = [];

    public const COHORTES = ['Blanche' => 'V01', 'Orange' => 'V02', 'À définir' => 'V03'];

    protected function casts(): array
    {
        return [
            'naissance' => 'date', 'poids_le' => 'date', 'sortie_le' => 'date',
            'poids' => 'decimal:3', 'sortie_valeur' => 'decimal:2',
        ];
    }

    /** @return HasMany<AnimalEvenement, $this> */
    public function evenements(): HasMany
    {
        return $this->hasMany(AnimalEvenement::class)->orderBy('date')->orderBy('id');
    }

    /** @return HasMany<CycleReproduction, $this> */
    public function cycles(): HasMany
    {
        return $this->hasMany(CycleReproduction::class)->orderBy('numero');
    }

    /** @return BelongsTo<Loge, $this> */
    public function loge(): BelongsTo
    {
        return $this->belongsTo(Loge::class);
    }

    /** @return BelongsTo<self, $this> */
    public function mere(): BelongsTo
    {
        return $this->belongsTo(self::class, 'mere_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }
}
