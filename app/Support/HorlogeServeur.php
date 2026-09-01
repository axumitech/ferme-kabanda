<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use RuntimeException;

final class HorlogeServeur
{
    public const RATTRAPAGE_HEURES = 36;

    public const RATTRAPAGE_ENCADREMENT_JOURS = 30;

    public static function maintenant(): Carbon
    {
        return Carbon::now();
    }

    public static function declaree(mixed $valeur, string $libelle = 'La date'): Carbon
    {
        $date = $valeur ? Carbon::parse($valeur) : self::maintenant();
        $maintenant = self::maintenant();

        if ($date->gt($maintenant->copy()->addMinute())) {
            throw new RuntimeException(sprintf(
                "%s est dans le futur (%s alors qu'il est %s).",
                $libelle,
                $date->format('d/m/Y H:i'),
                $maintenant->format('d/m/Y H:i'),
            ));
        }

        $heures = $maintenant->diffInHours($date);
        $niveau = auth()->check()
            ? (auth()->user()->niveau_hierarchie ?? 4)
            : 4;

        if ($heures > self::RATTRAPAGE_HEURES) {
            if ($niveau > 3) {
                throw new RuntimeException(sprintf(
                    '%s remonte à %d heures. Au-delà de %d heures, seule la hiérarchie peut consigner ce fait.',
                    $libelle,
                    $heures,
                    self::RATTRAPAGE_HEURES,
                ));
            }

            if ($maintenant->diffInDays($date) > self::RATTRAPAGE_ENCADREMENT_JOURS) {
                throw new RuntimeException(sprintf(
                    '%s remonte à plus de %d jours et exige un document signé.',
                    $libelle,
                    self::RATTRAPAGE_ENCADREMENT_JOURS,
                ));
            }
        }

        return $date;
    }

    public static function ecartMinutes(Carbon $declaree): int
    {
        return (int) $declaree->diffInMinutes(self::maintenant());
    }

    public static function estRetroactive(Carbon $declaree, int $seuilMinutes = 720): bool
    {
        return self::ecartMinutes($declaree) > $seuilMinutes;
    }
}
