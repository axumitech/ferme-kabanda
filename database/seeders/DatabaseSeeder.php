<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            SocleSeeder::class,
            CultureSeeder::class,
            MatiereActiveSeeder::class,
            ParcellaireSeeder::class,
            MaintenanceSeeder::class,
            IncidentSeeder::class,
            PosteControleSeeder::class,
            AdminUserSeeder::class,
            ReferenceDataSeeder::class,
            MapFeatureSeeder::class,
        ]);
    }
}
