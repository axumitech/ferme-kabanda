<?php

namespace App\Http\Controllers;

use App\Models\PassagePatrouille;
use App\Models\Patrouille;
use App\Models\PosteControle;
use App\Models\Site;
use App\Models\User;
use App\Services\PatrouilleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PatrouilleController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('patrouilles/index', [
            'patrols' => Patrouille::query()
                ->with(['agent:id,name', 'site:id,code,nom'])
                ->latest('debut')
                ->get()
                ->map(fn (Patrouille $patrouille): array => $this->summary($patrouille)),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('patrouilles/form', [
            'today' => today()->toDateString(),
            'currentUserId' => $request->user()?->id,
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name']),
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
        ]);
    }

    public function store(Request $request, PatrouilleService $service): RedirectResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'tour' => ['required', 'in:jour,nuit'],
            'agent_id' => ['required', 'exists:users,id'],
            'equipe' => ['nullable', 'string', 'max:255'],
            'site_id' => ['nullable', 'exists:sites,id'],
        ]);

        try {
            $patrouille = $service->ouvrir($data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['agent_id' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('patrouilles.create')->with('success', "{$patrouille->reference} ouverte.");
        }

        return redirect()->route('patrouilles.show', $patrouille)->with('success', "{$patrouille->reference} ouverte.");
    }

    public function show(Patrouille $patrouille): Response
    {
        $patrouille->load(['agent:id,name', 'site:id,code,nom', 'passages.poste:id,code,nom,site_id']);

        return Inertia::render('patrouilles/show', [
            'patrol' => array_merge($this->summary($patrouille), [
                'equipe' => $patrouille->equipe,
                'observations' => $patrouille->observations,
                'passages' => $patrouille->passages->map(fn (PassagePatrouille $passage): array => [
                    'id' => $passage->id,
                    'passe_le' => $passage->passe_le->toIso8601String(),
                    'etat' => $passage->etat,
                    'constat' => $passage->constat,
                    'photo_url' => $passage->photo_chemin ? asset('storage/'.$passage->photo_chemin) : null,
                    'poste' => $passage->poste ? [
                        'code' => $passage->poste->code,
                        'nom' => $passage->poste->nom,
                    ] : null,
                ])->values(),
            ]),
            'posts' => PosteControle::query()
                ->where('actif', true)
                ->when($patrouille->site_id, fn ($query, $siteId) => $query->where('site_id', $siteId))
                ->orderBy('ordre')
                ->get(['id', 'code', 'nom']),
        ]);
    }

    public function point(Request $request, Patrouille $patrouille, PatrouilleService $service): RedirectResponse
    {
        $data = $request->validate([
            'poste_controle_id' => ['required', 'exists:postes_controle,id'],
            'etat' => ['required', 'in:conforme,anomalie'],
            'constat' => ['nullable', 'required_if:etat,anomalie', 'string', 'max:2000'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $data['photo_chemin'] = $request->file('photo')?->store('patrouilles', 'public');

        $poste = PosteControle::query()->whereKey($data['poste_controle_id'])->first();
        if ($poste === null) {
            throw ValidationException::withMessages(['poste_controle_id' => 'Poste de contrôle introuvable.']);
        }

        try {
            $service->pointer($patrouille, $poste, $data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['poste_controle_id' => $exception->getMessage()]);
        }

        return back()->with('success', 'Passage enregistré à '.now()->format('H:i').'.');
    }

    public function close(Request $request, Patrouille $patrouille, PatrouilleService $service): RedirectResponse
    {
        $data = $request->validate(['observations' => ['nullable', 'string', 'max:3000']]);

        try {
            $service->cloturer($patrouille, $data['observations'] ?? null);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['patrouille' => $exception->getMessage()]);
        }

        return back()->with('success', 'Patrouille clôturée.');
    }

    /** @return array<string, mixed> */
    private function summary(Patrouille $patrouille): array
    {
        return [
            'id' => $patrouille->id,
            'reference' => $patrouille->reference,
            'date' => $patrouille->date->toDateString(),
            'tour' => $patrouille->tour,
            'agent_nom' => $patrouille->agent_nom,
            'site' => $patrouille->site ? ['code' => $patrouille->site->code, 'nom' => $patrouille->site->nom] : null,
            'debut' => $patrouille->debut->toIso8601String(),
            'fin' => $patrouille->fin?->toIso8601String(),
            'points_prevus' => $patrouille->points_prevus,
            'points_faits' => $patrouille->points_faits,
            'couverture' => $patrouille->couverture(),
            'ras' => $patrouille->ras,
            'statut' => $patrouille->statut,
        ];
    }
}
