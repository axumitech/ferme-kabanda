<?php

namespace App\Http\Controllers;

use App\Models\MainCourante;
use App\Models\Site;
use App\Services\MainCouranteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class MainCouranteController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('main-courante/index', [
            'entries' => MainCourante::query()
                ->with('site:id,code,nom')
                ->latest('survenu_le')
                ->limit(250)
                ->get()
                ->map(fn (MainCourante $entry): array => [
                    'id' => $entry->id,
                    'reference' => $entry->reference,
                    'survenu_le' => $entry->survenu_le->toIso8601String(),
                    'type' => $entry->type,
                    'lieu' => $entry->lieu,
                    'objet' => $entry->objet,
                    'personne' => $entry->personne,
                    'vehicule' => $entry->vehicule,
                    'piece_identite' => $entry->piece_identite,
                    'agent_nom' => $entry->agent_nom,
                    'photo_url' => $entry->photo_chemin ? asset('storage/'.$entry->photo_chemin) : null,
                    'site' => $entry->site ? ['code' => $entry->site->code, 'nom' => $entry->site->nom] : null,
                ]),
            'types' => MainCourante::TYPES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('main-courante/form', [
            'currentDateTime' => now()->format('Y-m-d\TH:i'),
            'types' => MainCourante::TYPES,
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
        ]);
    }

    public function store(Request $request, MainCouranteService $service): RedirectResponse
    {
        $data = $request->validate([
            'survenu_le' => ['required', 'date'],
            'type' => ['required', 'in:entree,sortie,livraison,visiteur,ronde,consigne,anomalie'],
            'site_id' => ['nullable', 'exists:sites,id'],
            'lieu' => ['nullable', 'string', 'max:255'],
            'objet' => ['required', 'string', 'max:5000'],
            'personne' => ['nullable', 'string', 'max:255'],
            'vehicule' => ['nullable', 'string', 'max:48'],
            'piece_identite' => ['nullable', 'string', 'max:64'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_chemin'] = $request->file('photo')?->store('main-courante', 'public');

        try {
            $entry = $service->consigner($data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['survenu_le' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('main-courante.create')->with('success', "{$entry->reference} enregistrée.");
        }

        return redirect()->route('main-courante.index')->with('success', "{$entry->reference} enregistrée.");
    }
}
