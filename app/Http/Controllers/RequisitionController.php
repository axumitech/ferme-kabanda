<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Requisition;
use App\Models\Unite;
use App\Models\User;
use App\Services\RequisitionService;
use App\Services\VisibiliteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class RequisitionController extends Controller
{
    public function index(Request $request, VisibiliteService $visibilite): Response
    {
        $this->admin($request);
        /** @var User $user */
        $user = $request->user();
        $canSeeAmounts = $visibilite->peutVoir($user, 'requisitions_autres');
        $requisitions = Requisition::query()
            ->with(['article:id,code,libelle', 'unite:id,nom', 'demandeur:id,name'])
            ->latest()
            ->get();

        if (! $canSeeAmounts) {
            $requisitions->each(fn (Requisition $requisition) => $requisition->makeHidden([
                'montant', 'valeur', 'niveau_requis',
            ]));
        }

        return Inertia::render('requisitions/index', [
            'requisitions' => $requisitions,
            'canSeeAmounts' => $canSeeAmounts,
            'currentUserId' => $user->id,
        ]);
    }

    public function create(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('requisitions/form', [
            'articles' => Article::query()->where('actif', true)->orderBy('code')->get(['id', 'code', 'libelle']),
            'unites' => Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']),
            'categories' => Article::CATEGORIES,
        ]);
    }

    public function store(Request $request, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate([
            'type' => ['required', Rule::in(['STK', 'NEW', 'CSH'])],
            'objet' => ['required', 'string', 'max:255'],
            'article_id' => ['nullable', 'required_if:type,STK', 'exists:articles,id'],
            'quantite' => ['nullable', 'required_if:type,STK', 'numeric', 'gt:0'],
            'unite_id' => ['nullable', 'required_if:type,STK', 'exists:unites,id'],
            'nouvel_article' => ['nullable', 'required_if:type,NEW', 'string', 'max:255'],
            'nouvelle_categorie' => ['nullable', Rule::in(array_keys(Article::CATEGORIES))],
            'montant' => ['nullable', 'required_if:type,NEW,CSH', 'numeric', 'min:0'],
            'justification' => ['required', 'string', 'max:2000'],
            'centre_cout' => ['nullable', 'string', 'max:100'],
        ]);

        $data = $this->onlyFieldsForType($data);

        try {
            $service->creer($data);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['objet' => $exception->getMessage()]);
        }

        if ($request->boolean('_create_another')) {
            return redirect()->route('requisitions.create')->with('success', 'Réquisition créée. Vous pouvez en ajouter une autre.');
        }

        return redirect()->route('requisitions.index')->with('success', 'Réquisition soumise au circuit de validation.');
    }

    public function verify(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        return $this->transition(
            fn () => $service->verifier($requisition, $data['note'] ?? null),
            'Réquisition vérifiée — en attente d’approbation.',
        );
    }

    public function approve(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);

        return $this->transition(
            fn () => $service->approuver($requisition),
            'Réquisition approuvée — tâche de service créée pour le magasinier.',
        );
    }

    public function serve(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);

        return $this->transition(
            fn () => $service->servir($requisition),
            'Réquisition servie — mouvement de stock enregistré.',
        );
    }

    public function refuse(Request $request, Requisition $requisition, RequisitionService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['motif' => ['required', 'string', 'max:1000']]);

        return $this->transition(
            fn () => $service->refuser($requisition, $data['motif']),
            'Réquisition refusée.',
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function onlyFieldsForType(array $data): array
    {
        if ($data['type'] !== 'STK') {
            $data['article_id'] = $data['quantite'] = $data['unite_id'] = null;
        }
        if ($data['type'] !== 'NEW') {
            $data['nouvel_article'] = $data['nouvelle_categorie'] = null;
        }
        if (! in_array($data['type'], ['NEW', 'CSH'], true)) {
            $data['montant'] = null;
        }

        return $data;
    }

    private function transition(callable $action, string $message): RedirectResponse
    {
        try {
            $action();
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['action' => $exception->getMessage()]);
        }

        return back()->with('success', $message);
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }
}
