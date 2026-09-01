<?php

namespace App\Http\Controllers;

use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\OrdreTravail;
use App\Models\Site;
use App\Models\User;
use App\Services\OrdreTravailService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrdreTravailController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = OrdreTravail::query()
            ->with(['cible', 'site:id,code,nom', 'demandeur:id,name', 'responsable:id,name'])
            ->orderByRaw("case when statut in ('demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie') then 0 else 1 end")
            ->orderByDesc('demande_le')
            ->get()
            ->map(fn (OrdreTravail $order): array => [
                ...$order->only([
                    'id', 'reference', 'origine', 'objet', 'cible_libelle', 'type_intervention',
                    'priorite', 'arret_production', 'statut', 'prestataire', 'cout_total', 'recurrent',
                    'demandeur_id', 'approbation_requise',
                ]),
                'demande_le' => $order->demande_le->toIso8601String(),
                'echeance' => $order->echeance?->toDateString(),
                'jours_ouvert' => $order->joursOuvert(),
                'en_retard' => $order->enRetard(),
                'site' => $order->site?->only(['id', 'code', 'nom']),
                'demandeur' => $order->demandeur?->only(['id', 'name']),
                'responsable' => $order->responsable?->only(['id', 'name']),
            ])->values();

        return Inertia::render('ordres-travail/index', [
            'orders' => $orders,
            'options' => [
                'statuses' => OrdreTravail::STATUTS,
                'types' => OrdreTravail::TYPES,
            ],
            'stats' => [
                'open' => $orders->whereNotIn('statut', ['clos', 'refuse', 'annule'])->count(),
                'urgent' => $orders->whereNotIn('statut', ['clos', 'refuse', 'annule'])->where('priorite', 'urgente')->count(),
                'stopped' => $orders->whereNotIn('statut', ['clos', 'refuse', 'annule'])->where('arret_production', true)->count(),
                'late' => $orders->where('en_retard', true)->count(),
            ],
            'permissions' => [
                'canManage' => $this->canManage($request),
                'userId' => $request->user()?->id,
            ],
        ]);
    }

    public function show(Request $request, OrdreTravail $ordreTravail): Response
    {
        $ordreTravail->load([
            'cible', 'site:id,code,nom', 'demandeur:id,name', 'responsable:id,name',
            'approbateur:id,name', 'evenements',
        ]);

        return Inertia::render('ordres-travail/show', [
            'order' => [
                ...$ordreTravail->toArray(),
                'demande_le' => $ordreTravail->demande_le->toIso8601String(),
                'echeance' => $ordreTravail->echeance?->toDateString(),
                'approuve_le' => $ordreTravail->approuve_le?->toIso8601String(),
                'en_retard' => $ordreTravail->enRetard(),
                'jours_ouvert' => $ordreTravail->joursOuvert(),
                'photo_avant_url' => $ordreTravail->photo_avant
                    ? asset('storage/'.$ordreTravail->photo_avant)
                    : null,
            ],
            'options' => [
                'statuses' => OrdreTravail::STATUTS,
                'types' => OrdreTravail::TYPES,
                'origins' => OrdreTravail::ORIGINES,
                'permits' => OrdreTravail::PERMIS,
            ],
            'permissions' => [
                'canManage' => $this->canManage($request),
                'userId' => $request->user()?->id,
                'canExecute' => $this->canExecute($request, $ordreTravail),
                'executedByCurrentUser' => $this->executedByCurrentUser($request, $ordreTravail),
            ],
            'eligibleApprovers' => User::query()
                ->where('actif', true)
                ->whereKeyNot($ordreTravail->demandeur_id)
                ->where(fn ($query) => $query->where('is_admin', true)->orWhere('niveau_hierarchie', '<=', 3))
                ->orderBy('name')
                ->get(['id', 'name']),
            'users' => User::query()->where('actif', true)->orderBy('name')->get(['id', 'name']),
            'today' => today()->toDateString(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('ordres-travail/form', [
            'equipment' => Equipement::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom', 'site_id']),
            'infrastructures' => Infrastructure::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom', 'site_id']),
            'sites' => Site::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'nom']),
            'types' => OrdreTravail::TYPES,
            'permits' => OrdreTravail::PERMIS,
            'today' => today()->toDateString(),
            'canSkipApproval' => $this->canManage($request),
        ]);
    }

    public function store(Request $request, OrdreTravailService $service): RedirectResponse
    {
        $data = $request->validate([
            'target_type' => ['required', Rule::in(['equipment', 'infrastructure', 'none'])],
            'target_id' => ['nullable', 'integer', 'required_unless:target_type,none'],
            'objet' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:4000'],
            'type_intervention' => ['required', Rule::in(array_keys(OrdreTravail::TYPES))],
            'priorite' => ['required', Rule::in(['basse', 'normale', 'elevee', 'urgente'])],
            'arret_production' => ['nullable', 'boolean'],
            'echeance' => ['nullable', 'date', 'after_or_equal:today'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'consignation_requise' => ['nullable', 'boolean'],
            'permis_travail' => ['required', Rule::in(array_keys(OrdreTravail::PERMIS))],
            'epi_requis' => ['nullable', 'string', 'max:255'],
            'photo_avant' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'approbation_requise' => ['nullable', 'boolean'],
        ]);

        $data['approbation_requise'] = $this->canManage($request) && $request->has('approbation_requise')
            ? $request->boolean('approbation_requise')
            : true;

        $target = $this->resolveTarget($data['target_type'], isset($data['target_id']) ? (int) $data['target_id'] : null);
        if ($request->hasFile('photo_avant')) {
            $data['photo_avant'] = $request->file('photo_avant')->store('ot', 'public');
        }
        unset($data['target_type'], $data['target_id']);
        $order = $service->demander($data, $target);

        if ($request->boolean('_create_another')) {
            return redirect()->route('ordres-travail.create')->with('success', 'Ordre créé. Vous pouvez en saisir un autre.');
        }

        return redirect()->route('ordres-travail.show', $order)->with(
            'success',
            $order->approbation_requise
                ? 'Ordre de travail demandé — il attend une approbation.'
                : 'Ordre créé sans approbation — vous pouvez le planifier.',
        );
    }

    private function resolveTarget(string $type, ?int $id): ?Model
    {
        return match ($type) {
            'equipment' => Equipement::query()->where('actif', true)->findOrFail($id),
            'infrastructure' => Infrastructure::query()->where('actif', true)->findOrFail($id),
            default => null,
        };
    }

    private function canManage(Request $request): bool
    {
        $user = $request->user();

        return $user !== null && ($user->is_admin || (int) ($user->niveau_hierarchie ?? 4) <= 3);
    }

    private function canExecute(Request $request, OrdreTravail $order): bool
    {
        return $this->canManage($request)
            || (int) $order->responsable_id === (int) $request->user()?->id
            || ($order->responsable_id === null && (int) $order->demandeur_id === (int) $request->user()?->id);
    }

    private function executedByCurrentUser(Request $request, OrdreTravail $order): bool
    {
        $userId = $request->user()?->id;

        return $userId !== null && (
            (int) $order->responsable_id === (int) $userId
            || $order->pointages()->where('user_id', $userId)->exists()
            || $order->evenements()->where('user_id', $userId)->whereIn('type', ['demarrage', 'piece', 'realisation'])->exists()
        );
    }
}
