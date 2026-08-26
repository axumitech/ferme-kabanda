<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Services\StockSynchronizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = InventoryItem::query()
            ->whereBelongsTo($request->user())
            ->where('active', true)
            ->with('category:id,code')
            ->orderBy('code')
            ->get()
            ->map(fn (InventoryItem $item): array => [
                'cat' => $item->category->code,
                'lib' => $item->name,
                'unite' => $item->unit,
                'qte' => (float) $item->quantity_on_hand,
                'pu' => (float) $item->unit_price,
                'mini' => $item->minimum_quantity === null ? '' : (float) $item->minimum_quantity,
                'cc' => $item->cost_center ?? '',
                'code' => $item->code,
                'cree' => $item->created_on?->toDateString(),
            ])
            ->values();

        return response()->json(['items' => $items]);
    }

    public function sync(Request $request, StockSynchronizer $synchronizer): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'max:2000'],
            'items.*' => ['required', 'array'],
            'items.*.cat' => ['required', 'string', 'max:20'],
            'items.*.lib' => ['required', 'string', 'max:180'],
            'items.*.unite' => ['required', 'string', 'max:40'],
            'items.*.qte' => ['required', 'numeric', 'min:0', 'max:99999999999.999'],
            'items.*.pu' => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'items.*.mini' => ['nullable', 'numeric', 'min:0', 'max:99999999999.999'],
            'items.*.cc' => ['nullable', 'string', 'max:30'],
            'items.*.code' => ['required', 'string', 'max:60', 'distinct'],
            'items.*.cree' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $synchronizer->syncInventory($request->user(), $validated['items']);

        return $this->index($request);
    }
}
