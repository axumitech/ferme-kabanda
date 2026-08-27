<?php

namespace App\Console\Commands;

use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\Departement;
use App\Models\Site;
use App\Models\Tache;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ClotureManquante extends Command
{
    protected $signature = 'taches:cloture-manquante {--date= : Date à contrôler au format YYYY-MM-DD}';

    protected $description = 'Signale les journées qui contiennent des tâches dues mais ne sont pas clôturées';

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse((string) $this->option('date'))->toDateString()
            : today()->toDateString();
        $missing = [];

        $sites = Site::query()->where('actif', true)->get(['id', 'code']);
        $departments = Departement::query()->where('actif', true)->get(['id', 'code']);

        foreach ($sites as $site) {
            foreach ($departments as $department) {
                $dueCount = Tache::query()
                    ->where('site_id', $site->id)
                    ->where('departement_id', $department->id)
                    ->where('est_modele', false)
                    ->whereDate('date_due', $date)
                    ->count();

                if ($dueCount === 0) {
                    continue;
                }

                $closed = ClotureJournaliere::query()
                    ->where('site_id', $site->id)
                    ->where('departement_id', $department->id)
                    ->whereDate('date', $date)
                    ->where('verrouillee', true)
                    ->exists();

                if ($closed) {
                    continue;
                }

                $openCount = Tache::query()
                    ->where('site_id', $site->id)
                    ->where('departement_id', $department->id)
                    ->whereDate('date_due', $date)
                    ->where('statut', StatutTache::AFaire)
                    ->count();

                $missing[] = "{$site->code} · {$department->code} - {$dueCount} tâche(s) dues, {$openCount} sans réponse";
            }
        }

        if ($missing === []) {
            $this->info("Toutes les journées du {$date} sont clôturées ou sans tâche due.");

            return self::SUCCESS;
        }

        $this->warn("Journées non clôturées au {$date} :");
        foreach ($missing as $line) {
            $this->line("  · {$line}");
        }

        return self::SUCCESS;
    }
}
