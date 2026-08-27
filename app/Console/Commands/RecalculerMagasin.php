<?php

namespace App\Console\Commands;

use App\Services\MagasinService;
use Illuminate\Console\Command;

class RecalculerMagasin extends Command
{
    protected $signature = 'magasin:recalculer';

    protected $description = 'Recalcule le stock de chaque article depuis la somme immuable des mouvements';

    public function handle(MagasinService $magasin): int
    {
        $count = $magasin->recalculerTout();

        $this->info("{$count} article(s) recalculé(s) depuis le registre magasin.");

        return self::SUCCESS;
    }
}
