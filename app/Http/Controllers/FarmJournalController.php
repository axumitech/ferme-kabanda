<?php

namespace App\Http\Controllers;

use App\Services\FluxActiviteService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class FarmJournalController extends Controller
{
    public function __invoke(Request $request, FluxActiviteService $flux): Response
    {
        $data = $request->validate(['jour' => ['nullable', 'date_format:Y-m-d']]);
        $jourSaisi = $data['jour'] ?? null;
        $jour = is_string($jourSaisi) ? Carbon::createFromFormat('Y-m-d', $jourSaisi)->startOfDay() : today();
        $date = $jour->toDateString();

        return Inertia::render('farm-journal', [
            'jour' => $date,
            'entries' => $flux->journee($date),
            'dailyCounts' => collect(range(0, 6))->map(fn (int $offset) => [
                'date' => $jour->copy()->subDays($offset)->toDateString(),
                'count' => $flux->journee($jour->copy()->subDays($offset), 200)->count(),
            ])->values(),
        ]);
    }
}
