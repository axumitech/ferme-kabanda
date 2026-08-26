<?php

namespace App\Http\Controllers;

use App\Models\ProductStock;
use App\Services\StockSynchronizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductStockController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $stocks = ProductStock::query()
            ->whereBelongsTo($request->user())
            ->where('active', true)
            ->orderBy('product_name')
            ->get()
            ->mapWithKeys(fn (ProductStock $stock): array => [
                $stock->product_name => (float) $stock->quantity_on_hand,
            ]);

        return response()->json(['stocks' => $stocks]);
    }

    public function sync(Request $request, StockSynchronizer $synchronizer): JsonResponse
    {
        $validated = $request->validate([
            'stocks' => ['required', 'array', 'max:1000'],
            'stocks.*' => ['required', 'numeric', 'min:0', 'max:99999999999.999'],
        ]);

        foreach (array_keys($validated['stocks']) as $productName) {
            validator(
                ['product_name' => $productName],
                ['product_name' => ['required', 'string', 'max:180']],
            )->validate();
        }

        $synchronizer->syncProductStocks($request->user(), $validated['stocks']);

        return $this->index($request);
    }
}
