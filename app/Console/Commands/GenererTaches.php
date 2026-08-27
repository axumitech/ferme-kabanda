<?php

namespace App\Console\Commands;

use App\Models\Tache;
use App\Services\TacheService;
use Carbon\CarbonInterface;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class GenererTaches extends Command
{
    protected $signature = 'taches:generer {--date= : Date cible au format YYYY-MM-DD} {--test : Affiche sans créer}';

    protected $description = 'Génère les tâches du jour depuis les modèles récurrents';

    public function handle(TacheService $service): int
    {
        $date = $this->option('date') ? Carbon::parse((string) $this->option('date')) : today();
        $count = 0;

        $models = Tache::query()
            ->where('est_modele', true)
            ->whereNotNull('recurrence')
            ->get();

        foreach ($models as $model) {
            if (! $this->isDueToday($model, $date)) {
                continue;
            }

            $count++;

            if ($this->option('test')) {
                $this->line("[test] {$model->titre} - {$date->toDateString()}");

                continue;
            }

            $service->creer([
                'source' => $model->source,
                'titre' => $model->titre,
                'description' => $model->description,
                'instruction' => $model->instruction,
                'departement_id' => $model->departement_id,
                'site_id' => $model->site_id,
                'lieu' => $model->lieu,
                'responsable_id' => $model->responsable_id,
                'priorite' => $model->priorite,
                'date_due' => $date->toDateString(),
                'modele_id' => $model->id,
                'est_modele' => false,
            ], $model);
        }

        $this->info("{$count} tâche(s) générée(s) pour le {$date->toDateString()}.");

        return self::SUCCESS;
    }

    protected function isDueToday(Tache $model, CarbonInterface $date): bool
    {
        $reference = Carbon::parse((string) $model->getAttribute('date_due'));

        return match ($model->recurrence) {
            'quotidien' => true,
            'hebdomadaire' => $date->dayOfWeek === $reference->dayOfWeek,
            'mensuel' => $date->day === min($reference->day, $date->daysInMonth),
            'trimestriel' => $date->day === min($reference->day, $date->daysInMonth)
                && (($date->month - $reference->month) % 3) === 0,
            'annuel' => $date->day === $reference->day && $date->month === $reference->month,
            default => false,
        };
    }
}
