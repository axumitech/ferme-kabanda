<?php

namespace App\Concerns;

use RuntimeException;

trait EstImmuable
{
    protected static function bootEstImmuable(): void
    {
        static::updating(function ($model): void {
            throw new RuntimeException(
                'Registre en ajout seul : '.class_basename($model).' ne peut pas être modifié. Écrivez une annulation motivée.',
            );
        });

        static::deleting(function ($model): void {
            throw new RuntimeException(
                'Registre en ajout seul : '.class_basename($model).' ne peut pas être supprimé. Écrivez une annulation motivée.',
            );
        });
    }
}
