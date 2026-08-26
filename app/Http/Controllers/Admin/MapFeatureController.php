<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MapFeature;
use App\Models\ReferenceItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MapFeatureController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureAdmin($request);

        return Inertia::render('admin/map', [
            'features' => MapFeature::query()->orderBy('sort_order')->orderBy('name')->get(),
            'canvas' => ['width' => 1000, 'height' => 1373],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $this->validated($request);
        DB::transaction(function () use ($data): void {
            $data['reference_item_id'] = $this->referenceId($data['name'], $data['feature_type']);
            MapFeature::create($data);
        }, attempts: 3);

        return back()->with('success', 'Zone ajoutée à la carte.');
    }

    public function update(Request $request, MapFeature $mapFeature): RedirectResponse
    {
        $this->ensureAdmin($request);
        $data = $this->validated($request, $mapFeature);
        DB::transaction(function () use ($data, $mapFeature): void {
            $data['reference_item_id'] = $this->referenceId($data['name'], $data['feature_type']);
            $mapFeature->update($data);
        }, attempts: 3);

        return back()->with('success', 'Géométrie mise à jour.');
    }

    public function destroy(Request $request, MapFeature $mapFeature): RedirectResponse
    {
        $this->ensureAdmin($request);
        $mapFeature->delete();

        return back()->with('success', 'Zone supprimée de la carte.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?MapFeature $mapFeature = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:160', Rule::unique('map_features', 'name')->ignore($mapFeature)],
            'feature_type' => ['required', Rule::in(['limite', 'parc', 'bloc', 'bati'])],
            'area_ha' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'area_m2' => ['nullable', 'integer', 'min:0', 'max:999999999'],
            'points' => ['required', 'array', 'min:3'],
            'points.*' => ['required', 'array', 'size:2'],
            'points.*.0' => ['required', 'numeric', 'min:-10000', 'max:10000'],
            'points.*.1' => ['required', 'numeric', 'min:-10000', 'max:10000'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
            'active' => ['required', 'boolean'],
        ]);
    }

    private function referenceId(string $name, string $type): ?int
    {
        $category = match ($type) {
            'parc', 'bloc' => 'parcelles',
            'bati' => 'ateliers',
            default => null,
        };

        if (! $category) {
            return null;
        }

        return ReferenceItem::query()->firstOrCreate(
            ['category' => $category, 'label' => $name],
            ['active' => true, 'sort_order' => ReferenceItem::where('category', $category)->max('sort_order') + 1],
        )->id;
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
