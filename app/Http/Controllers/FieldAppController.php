<?php

namespace App\Http\Controllers;

use App\Models\MapFeature;
use App\Models\ReferenceItem;
use Inertia\Inertia;
use Inertia\Response;

class FieldAppController extends Controller
{
    public function __invoke(): Response
    {
        $references = ReferenceItem::query()
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('label')
            ->get(['id', 'category', 'label', 'description'])
            ->groupBy('category');

        return Inertia::render('field-app', [
            'references' => $references,
            'mapFeatures' => MapFeature::query()
                ->where('active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'feature_type', 'area_ha', 'area_m2', 'points']),
        ]);
    }
}
