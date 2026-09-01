<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('taches:generer')->dailyAt('04:30');
Schedule::command('taches:escalader')->twiceDaily(9, 15);
Schedule::command('taches:cloture-manquante')->dailyAt('20:00');
Schedule::command('magasin:recalculer')->dailyAt('02:00');
Schedule::command('maintenance:preventif')->dailyAt('05:00')->withoutOverlapping();
