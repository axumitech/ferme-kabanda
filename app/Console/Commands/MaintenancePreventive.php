<?php

namespace App\Console\Commands;

use App\Services\MaintenanceService;
use Illuminate\Console\Command;

class MaintenancePreventive extends Command
{
    protected $signature = 'maintenance:preventif';

    protected $description = 'Ouvre les ordres de travail préventifs échus des équipements et infrastructures';

    public function handle(MaintenanceService $maintenance): int
    {
        $resultat = $maintenance->ouvrirPreventifsDus();

        $this->info(sprintf(
            "%d ordre(s) préventif(s) ouvert(s) · %d inspection(s) d'infrastructure en retard.",
            $resultat['ordres_ouverts'],
            $resultat['inspections_en_retard'],
        ));

        return self::SUCCESS;
    }
}
