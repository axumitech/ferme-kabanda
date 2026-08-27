<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Unite extends Model
{
    protected $fillable = ['code', 'nom', 'dimension', 'vers_base', 'conditionnement', 'actif'];

    protected function casts(): array
    {
        return [
            'vers_base' => 'decimal:6',
            'conditionnement' => 'boolean',
            'actif' => 'boolean',
        ];
    }

    public function estCompatible(Unite $autre): bool
    {
        return $this->dimension === $autre->dimension;
    }

    public function versBase(float $quantite): float
    {
        return $quantite * (float) $this->vers_base;
    }

    public function depuisBase(float $base): float
    {
        return (float) $this->vers_base === 0.0 ? 0.0 : $base / (float) $this->vers_base;
    }
}
