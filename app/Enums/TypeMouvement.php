<?php

namespace App\Enums;

enum TypeMouvement: string
{
    case Entree = 'entree';
    case Sortie = 'sortie';
    case Inventaire = 'inventaire';
    case Annulation = 'annulation';

    public function signe(): int
    {
        return match ($this) {
            self::Entree, self::Inventaire => 1,
            self::Sortie => -1,
            self::Annulation => 0,
        };
    }
}
