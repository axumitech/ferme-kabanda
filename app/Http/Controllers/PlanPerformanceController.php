<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Services\PerformancePlanService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlanPerformanceController extends Controller
{
    public function __invoke(Request $request, PerformancePlanService $service): Response
    {
        $plans = Plan::query()
            ->where('statut', 'en_vigueur')
            ->withCount('lignes')
            ->orderBy('code')
            ->get();
        $plan = $plans->firstWhere('id', $request->integer('plan')) ?? $plans->first();
        $lignes = $plan ? $service->tableau($plan) : [];

        return Inertia::render('plans/performance', [
            'plans' => $plans->map(fn (Plan $item): array => [
                'id' => $item->id,
                'code' => $item->code,
                'libelle' => $item->libelle,
                'version' => $item->version,
                'date_effet' => $item->date_effet?->toDateString(),
                'lignes_count' => $item->lignes_count,
            ]),
            'plan' => $plan ? [
                'id' => $plan->id,
                'code' => $plan->code,
                'libelle' => $plan->libelle,
                'version' => $plan->version,
                'date_effet' => $plan->date_effet?->toDateString(),
            ] : null,
            'summary' => $service->synthese($lignes),
            'lines' => $lignes,
        ]);
    }
}
