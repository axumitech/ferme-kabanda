<?php

use App\Http\Controllers\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Admin\MapFeatureController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\ReferenceItemController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FarmRecordController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MaterialAssignmentController;
use App\Http\Controllers\ProductStockController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('farm-data', [FarmRecordController::class, 'index'])->name('farm-data.index');
    Route::get('farm-data/{recordKey}', [FarmRecordController::class, 'show'])->name('farm-data.show');
    Route::put('farm-data/{recordKey}', [FarmRecordController::class, 'store'])->name('farm-data.store');

    Route::get('inventory/items', [InventoryController::class, 'index'])->name('inventory.items.index');
    Route::put('inventory/items', [InventoryController::class, 'sync'])->name('inventory.items.sync');
    Route::get('inventory/product-stocks', [ProductStockController::class, 'index'])->name('product-stocks.index');
    Route::put('inventory/product-stocks', [ProductStockController::class, 'sync'])->name('product-stocks.sync');
    Route::get('inventory/material-assignments', [MaterialAssignmentController::class, 'index'])->name('material-assignments.index');
    Route::put('inventory/material-assignments', [MaterialAssignmentController::class, 'sync'])->name('material-assignments.sync');

    Route::get('admin', [ReferenceItemController::class, 'index'])->name('admin.index');
    Route::get('admin/inventory', [AdminInventoryController::class, 'index'])->name('admin.inventory.index');
    Route::post('admin/inventory/items', [AdminInventoryController::class, 'storeItem'])->name('admin.inventory.items.store');
    Route::post('admin/inventory/items/{inventoryItem}/adjust', [AdminInventoryController::class, 'adjustItem'])->name('admin.inventory.items.adjust');
    Route::delete('admin/inventory/items/{inventoryItem}', [AdminInventoryController::class, 'archiveItem'])->name('admin.inventory.items.archive');
    Route::post('admin/inventory/products', [AdminInventoryController::class, 'storeProduct'])->name('admin.inventory.products.store');
    Route::post('admin/inventory/products/{productStock}/adjust', [AdminInventoryController::class, 'adjustProduct'])->name('admin.inventory.products.adjust');
    Route::delete('admin/inventory/products/{productStock}', [AdminInventoryController::class, 'archiveProduct'])->name('admin.inventory.products.archive');
    Route::post('admin/inventory/assignments', [AdminInventoryController::class, 'storeAssignment'])->name('admin.inventory.assignments.store');
    Route::post('admin/inventory/assignments/{materialAssignment}/end', [AdminInventoryController::class, 'endAssignment'])->name('admin.inventory.assignments.end');
    Route::post('admin/references', [ReferenceItemController::class, 'store'])->name('admin.references.store');
    Route::put('admin/references/{referenceItem}', [ReferenceItemController::class, 'update'])->name('admin.references.update');
    Route::delete('admin/references/{referenceItem}', [ReferenceItemController::class, 'destroy'])->name('admin.references.destroy');
    Route::get('admin/map', [MapFeatureController::class, 'index'])->name('admin.map.index');
    Route::post('admin/map', [MapFeatureController::class, 'store'])->name('admin.map.store');
    Route::put('admin/map/{mapFeature}', [MapFeatureController::class, 'update'])->name('admin.map.update');
    Route::delete('admin/map/{mapFeature}', [MapFeatureController::class, 'destroy'])->name('admin.map.destroy');
    Route::get('admin/reports', [ReportController::class, 'index'])->name('admin.reports.index');
    Route::get('admin/members', [MemberController::class, 'index'])->name('admin.members.index');
    Route::post('admin/members', [MemberController::class, 'store'])->name('admin.members.store');
    Route::put('admin/members/{member}', [MemberController::class, 'update'])->name('admin.members.update');
    Route::delete('admin/members/{member}', [MemberController::class, 'destroy'])->name('admin.members.destroy');
});

require __DIR__.'/settings.php';
