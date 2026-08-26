<?php

namespace Database\Seeders;

use App\Models\MapFeature;
use App\Models\ReferenceItem;
use Illuminate\Database\Seeder;

class MapFeatureSeeder extends Seeder
{
    public function run(): void
    {
        $contents = file_get_contents(database_path('seeders/data/map-features.json'));
        if ($contents === false) {
            throw new \RuntimeException('Le fichier des données cartographiques est illisible.');
        }

        $features = json_decode(
            $contents,
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($features as $feature) {
            $category = match ($feature['feature_type']) {
                'parc', 'bloc' => 'parcelles',
                'bati' => 'ateliers',
                default => null,
            };
            $referenceId = $category
                ? ReferenceItem::where('category', $category)->where('label', $feature['name'])->value('id')
                : null;

            MapFeature::query()->firstOrCreate(
                ['name' => $feature['name']],
                [...$feature, 'reference_item_id' => $referenceId],
            );
        }
    }
}
