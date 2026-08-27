<?php

namespace App\Console\Commands;

use App\Enums\StatutTache;
use App\Models\Tache;
use Illuminate\Console\Command;

class EscaladerTaches extends Command
{
    protected $signature = 'taches:escalader {--test : Affiche les escalades sans modifier}';

    protected $description = 'Escalade les tâches en retard selon leur priorité';

    public function handle(): int
    {
        $tasks = Tache::query()
            ->with(['responsable:id,name', 'departement:id,code,nom', 'site:id,code,nom'])
            ->where('statut', StatutTache::AFaire)
            ->where('est_modele', false)
            ->whereDate('date_due', '<', today())
            ->get()
            ->filter(fn (Tache $task): bool => $task->escaladeDue());

        $count = 0;

        foreach ($tasks as $task) {
            $delay = $task->joursDeRetard();
            $level = match (true) {
                $delay >= 10 => 3,
                $delay >= 5 => 2,
                default => 1,
            };

            if ($level <= (int) $task->escalade_niveau) {
                continue;
            }

            $this->line("{$task->reference} · {$task->titre} · {$delay} j · niveau {$level}");
            $count++;

            if ($this->option('test')) {
                continue;
            }

            $task->update(['escalade_niveau' => $level, 'escalade_le' => now()]);
            $task->journaliserEvenement(
                'escaladee',
                "Retard de {$delay} jour(s) - escalade niveau {$level}",
                ['retard' => $delay, 'niveau' => $level],
            );
        }

        $this->info("{$count} tâche(s) escaladée(s).");

        return self::SUCCESS;
    }
}
