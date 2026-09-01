<?php

namespace App\Services;

use App\Models\TauxChange;
use Illuminate\Support\Carbon;
use RuntimeException;

class TauxChangeService
{
    public function taux(string $devise = 'CDF', Carbon|string|null $date = null): float
    {
        $date = $date ? Carbon::parse($date) : today();
        $line = TauxChange::query()->where('devise', $devise)->whereDate('effet_le', '<=', $date->toDateString())->orderByDesc('effet_le')->first();
        if (! $line) {
            throw new RuntimeException("Aucun taux {$devise} en vigueur au {$date->format('d/m/Y')}.");
        }

        return (float) $line->taux;
    }

    public function enregistrer(float $taux, Carbon|string|null $effetLe = null, string $devise = 'CDF', ?string $source = null): TauxChange
    {
        if ($taux <= 0) {
            throw new RuntimeException('Un taux de change doit être strictement positif.');
        }

        $user = auth()->user();

        return TauxChange::query()->updateOrCreate(
            ['devise' => $devise, 'effet_le' => Carbon::parse($effetLe ?? today())->toDateString()],
            ['taux' => $taux, 'source' => $source, 'saisi_par_id' => $user?->id, 'saisi_par_nom' => $user?->name],
        );
    }
}
