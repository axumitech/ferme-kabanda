<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class Numerotation
{
    public static function suivant(string $cle, bool $parMois = false): string
    {
        $annee = (int) now()->format('Y');
        $mois = $parMois ? (int) now()->format('n') : null;

        $numero = DB::transaction(function () use ($cle, $annee, $mois): int {
            $ligne = DB::table('numerotations')
                ->where('cle', $cle)
                ->where('annee', $annee)
                ->where(fn ($query) => $mois === null ? $query->whereNull('mois') : $query->where('mois', $mois))
                ->lockForUpdate()
                ->first();

            if (! $ligne) {
                DB::table('numerotations')->insert([
                    'cle' => $cle,
                    'annee' => $annee,
                    'mois' => $mois,
                    'dernier' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return 1;
            }

            DB::table('numerotations')
                ->where('id', $ligne->id)
                ->update(['dernier' => $ligne->dernier + 1, 'updated_at' => now()]);

            return $ligne->dernier + 1;
        });

        return static::formater($cle, $annee, $mois, $numero);
    }

    protected static function formater(string $cle, int $annee, ?int $mois, int $numero): string
    {
        return match ($cle) {
            'RH' => sprintf('%03d-%d-RH', $numero, $annee),
            'NDS' => sprintf('NDS-DG-%02d-%03d', $mois ?? (int) now()->format('n'), $numero),
            'TSK' => sprintf('TSK-%d-%02d-%04d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'IR' => sprintf('IR-%s-%03d', now()->format('Y-m-d'), $numero),
            'ENQ' => sprintf('ENQ-%d-%03d', $annee, $numero),
            'RQ' => sprintf('RQ-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'BT' => sprintf('BT-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'OT' => sprintf('OT-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'INS' => sprintf('INS-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'FT' => sprintf('FT-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'MNT' => sprintf('MNT-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'PAT' => sprintf('PAT-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            'MC' => sprintf('MC-%d-%02d-%03d', $annee, $mois ?? (int) now()->format('n'), $numero),
            default => sprintf('%s-%d-%04d', $cle, $annee, $numero),
        };
    }
}
