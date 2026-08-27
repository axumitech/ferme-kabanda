<?php

namespace App\Enums;

enum Priorite: string
{
    case Urgente = 'urgente';
    case Elevee = 'elevee';
    case Normale = 'normale';
    case Planifiee = 'planifiee';

    public function libelle(): string
    {
        return match ($this) {
            self::Urgente => 'Urgent - arrêt de production',
            self::Elevee => 'Élevé - sous 48 h',
            self::Normale => 'Normal - sous 7 jours',
            self::Planifiee => 'Planifié',
        };
    }

    public function delaiEscalade(): int
    {
        return match ($this) {
            self::Urgente => 0,
            self::Elevee => 1,
            self::Normale => 2,
            self::Planifiee => 5,
        };
    }
}
