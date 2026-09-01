<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatiereActive extends Model
{
    use Auditable;

    public const FAMILLES = [
        'fongicide' => 'Fongicide',
        'insecticide' => 'Insecticide',
        'herbicide' => 'Herbicide',
        'acaricide' => 'Acaricide',
        'nematicide' => 'Nématicide',
    ];

    protected $table = 'matieres_actives';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['interdit' => 'boolean', 'actif' => 'boolean'];
    }

    /** @return HasMany<TraitementCulture, $this> */
    public function traitements(): HasMany
    {
        return $this->hasMany(TraitementCulture::class);
    }

    public function libelleGroupe(): string
    {
        return match ($this->famille) {
            'fongicide' => $this->groupe_frac ? 'FRAC '.$this->groupe_frac : '—',
            'insecticide', 'acaricide' => $this->groupe_irac ? 'IRAC '.$this->groupe_irac : '—',
            'herbicide' => $this->groupe_hrac ? 'HRAC '.$this->groupe_hrac : '—',
            default => '—',
        };
    }
}
