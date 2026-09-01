<?php

namespace App\Http\Controllers;

use App\Models\TauxChange;
use App\Services\TauxChangeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class TauxChangeController extends Controller
{
    public function index(Request $request): Response
    {
        $this->admin($request);
        $currentIds = TauxChange::query()
            ->whereDate('effet_le', '<=', today())
            ->orderByDesc('effet_le')
            ->get()
            ->unique('devise')
            ->pluck('id');

        return Inertia::render('taux-change/index', [
            'taux' => TauxChange::query()->orderByDesc('effet_le')->orderByDesc('id')->get()->map(fn (TauxChange $rate): array => [
                ...$rate->toArray(),
                'statut' => Carbon::parse($rate->effet_le)->isFuture() ? 'avenir' : ($currentIds->contains($rate->id) ? 'actuel' : 'historique'),
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('taux-change/form', ['today' => today()->toDateString()]);
    }

    public function store(Request $request, TauxChangeService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate([
            'devise' => ['required', Rule::in(['CDF'])],
            'taux' => ['required', 'numeric', 'gt:0', 'max:9999999999'],
            'effet_le' => ['required', 'date'],
            'source' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $service->enregistrer((float) $data['taux'], $data['effet_le'], $data['devise'], $data['source'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['taux' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('taux-change.create')->with('success', 'Taux enregistré. Vous pouvez en saisir un autre.');
        }

        return redirect()->route('taux-change.index')->with('success', 'Taux enregistré — les nouveaux bons utiliseront ce taux à sa date d’effet.');
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
