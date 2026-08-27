<?php

namespace App\Enums;

enum StatutTache: string
{
    case AFaire = 'a_faire';
    case Faite = 'faite';
    case NonFaiteJustifiee = 'non_faite_justifiee';
    case NonFaiteNonJustifiee = 'non_faite_non_justifiee';
    case Reportee = 'reportee';
    case Annulee = 'annulee';

    /** @return list<string> */
    public static function ouverts(): array
    {
        return [self::AFaire->value];
    }
}
