<?php

use App\Http\Controllers\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Admin\MapFeatureController;
use App\Http\Controllers\Admin\MemberController;
use App\Http\Controllers\Admin\OperationController;
use App\Http\Controllers\Admin\ProcessController;
use App\Http\Controllers\Admin\ReferenceItemController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FarmRecordController;
use App\Http\Controllers\FieldAppController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MaterialAssignmentController;
use App\Http\Controllers\MyDayController;
use App\Http\Controllers\ProductStockController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('journee', [MyDayController::class, 'index'])->name('my-day.index');
    Route::post('journee/taches/{tache}/complete', [MyDayController::class, 'complete'])->name('my-day.tasks.complete');
    Route::post('journee/taches/{tache}/justify', [MyDayController::class, 'justify'])->name('my-day.tasks.justify');
    Route::get('terrain', FieldAppController::class)->name('field-app');

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
    Route::get('admin/operations', [OperationController::class, 'index'])->name('admin.operations.index');
    Route::get('admin/processes', [ProcessController::class, 'index'])->name('admin.processes.index');
    Route::post('admin/processes/plantations', [ProcessController::class, 'plant'])->name('admin.processes.plantations.store');
    Route::post('admin/processes/plantations/{plantation}/harvests', [ProcessController::class, 'harvest'])->name('admin.processes.harvests.store');
    Route::post('admin/processes/requisitions', [ProcessController::class, 'requestStock'])->name('admin.processes.requisitions.store');
    Route::post('admin/processes/requisitions/{requisition}/verify', [ProcessController::class, 'verify'])->name('admin.processes.requisitions.verify');
    Route::post('admin/processes/requisitions/{requisition}/approve', [ProcessController::class, 'approve'])->name('admin.processes.requisitions.approve');
    Route::post('admin/processes/requisitions/{requisition}/serve', [ProcessController::class, 'serve'])->name('admin.processes.requisitions.serve');
    Route::post('admin/processes/incidents', [ProcessController::class, 'declareIncident'])->name('admin.processes.incidents.store');
    Route::post('admin/processes/incidents/{incident}/actions', [ProcessController::class, 'addIncidentAction'])->name('admin.processes.incidents.actions.store');
    Route::post('admin/operations/tasks', [OperationController::class, 'store'])->name('admin.operations.tasks.store');
    Route::post('admin/operations/tasks/{tache}/complete', [OperationController::class, 'complete'])->name('admin.operations.tasks.complete');
    Route::post('admin/operations/tasks/{tache}/justify', [OperationController::class, 'justify'])->name('admin.operations.tasks.justify');
    Route::post('admin/operations/tasks/{tache}/dde/validate', [OperationController::class, 'validateDde'])->name('admin.operations.tasks.dde.validate');
    Route::post('admin/operations/tasks/{tache}/dde/requalify', [OperationController::class, 'requalifyDde'])->name('admin.operations.tasks.dde.requalify');
    Route::post('admin/operations/close-day', [OperationController::class, 'close'])->name('admin.operations.close-day');
    Route::post('admin/inventory/items', [AdminInventoryController::class, 'storeItem'])->name('admin.inventory.items.store');
    Route::post('admin/inventory/items/{article}/adjust', [AdminInventoryController::class, 'adjustItem'])->name('admin.inventory.items.adjust');
    Route::delete('admin/inventory/items/{article}', [AdminInventoryController::class, 'archiveItem'])->name('admin.inventory.items.archive');
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
