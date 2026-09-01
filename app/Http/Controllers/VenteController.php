<?php

namespace App\Http\Controllers;

use App\Models\Animal;
use App\Models\Article;
use App\Models\Client;
use App\Models\Plantation;
use App\Models\Site;
use App\Models\Vente;
use App\Models\VenteLigne;
use App\Services\TauxChangeService;
use App\Services\VenteService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class VenteController extends Controller
{
    public function index(Request $request): Response
    {
        $this->admin($request);

        return Inertia::render('ventes/index', ['ventes' => Vente::query()->with(['client:id,nom', 'site:id,nom'])->withCount('lignes')->orderByDesc('date')->orderByDesc('id')->get()->map(fn (Vente $v) => [...$v->toArray(), 'client_nom' => $v->nomClient(), 'reste' => $v->resteADevoir()]), 'statuts' => Vente::STATUTS, 'canaux' => Client::CANAUX, 'modes' => Vente::MODES_PAIEMENT]);
    }

    public function create(Request $request, TauxChangeService $change): Response
    {
        $this->admin($request);

        return Inertia::render('ventes/form', ['clients' => Client::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom', 'canal', 'devise_preferee', 'prix_reference', 'unite_reference']), 'canaux' => Client::CANAUX, 'modes' => Vente::MODES_PAIEMENT, 'sites' => Site::query()->where('actif', true)->orderBy('nom')->get(['id', 'nom']), 'today' => today()->toDateString(), 'taux' => $change->taux()]);
    }

    public function store(Request $request, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['date' => ['required', 'date', 'before_or_equal:today'], 'client_id' => ['nullable', 'exists:clients,id'], 'client_libre' => ['nullable', 'string', 'max:255'], 'canal' => ['nullable', Rule::in(array_keys(Client::CANAUX))], 'devise' => ['required', Rule::in(['USD', 'CDF'])], 'site_id' => ['nullable', 'exists:sites,id'], 'mode_paiement' => ['nullable', Rule::in(array_keys(Vente::MODES_PAIEMENT))], 'echeance' => ['nullable', 'date'], 'transport' => ['nullable', 'string', 'max:255'], 'note' => ['nullable', 'string', 'max:5000']]);
        $vente = $this->run(fn () => $service->creer($data));
        if ($request->boolean('_create_another')) {
            return redirect()->route('ventes.create')->with('success', 'Vente créée. Vous pouvez en créer une autre.');
        }

        return redirect()->route('ventes.show', $vente)->with('success', 'Bon créé — ajoutez maintenant les lignes à livrer.');
    }

    public function show(Request $request, Vente $vente): Response
    {
        $this->admin($request);
        $vente->load(['client:id,nom,prix_reference,unite_reference,devise_preferee', 'site:id,nom', 'lignes']);

        return Inertia::render('ventes/show', ['vente' => [...$vente->toArray(), 'client_nom' => $vente->nomClient(), 'reste' => $vente->resteADevoir()], 'natures' => VenteLigne::NATURES, 'modes' => Vente::MODES_PAIEMENT, 'animals' => Animal::query()->where('statut', 'present')->orderBy('code')->get(['id', 'code', 'categorie', 'poids']), 'plantations' => Plantation::query()->with('culture:id,nom,unite_recolte')->withSum('recoltes as recolte_totale', 'quantite')->withSum('recoltes as recolte_vendue', 'quantite_vendue')->orderByDesc('j0')->get(['id', 'reference', 'lieu', 'culture_id']), 'articles' => Article::query()->with('uniteUsage:id,nom')->where('actif', true)->orderBy('code')->get(['id', 'code', 'libelle', 'quantite_base', 'unite_usage_id'])]);
    }

    public function addLine(Request $request, Vente $vente, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['nature' => ['required', Rule::in(array_keys(VenteLigne::NATURES))], 'animal_id' => ['nullable', 'exists:animaux,id'], 'plantation_id' => ['nullable', 'exists:plantations,id'], 'article_id' => ['nullable', 'exists:articles,id'], 'designation' => ['nullable', 'string', 'max:255'], 'poids_vif' => ['nullable', 'numeric', 'min:0'], 'poids_carcasse' => ['nullable', 'numeric', 'min:0'], 'quantite' => ['nullable', 'numeric', 'gt:0'], 'unite' => ['required', 'string', 'max:24'], 'prix_unitaire' => ['required', 'numeric', 'min:0']]);
        $this->run(fn () => $service->ajouterLigne($vente, $data));

        return back()->with('success', 'Ligne ajoutée — total recalculé.');
    }

    public function deleteLine(Request $request, Vente $vente, VenteLigne $ligne, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        abort_unless($ligne->vente_id === $vente->id, 404);
        $this->run(fn () => $service->supprimerLigne($ligne));

        return back()->with('success', 'Ligne retirée.');
    }

    public function deliver(Request $request, Vente $vente, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        $this->run(fn () => $service->livrer($vente));

        return back()->with('success', 'Livré — stock déduit et bon de livraison émis.');
    }

    public function pay(Request $request, Vente $vente, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['montant' => ['required', 'numeric', 'gt:0'], 'mode' => ['nullable', Rule::in(array_keys(Vente::MODES_PAIEMENT))]]);
        $this->run(fn () => $service->encaisser($vente, (float) $data['montant'], $data['mode'] ?? null));

        return back()->with('success', 'Encaissement enregistré.');
    }

    public function cancel(Request $request, Vente $vente, VenteService $service): RedirectResponse
    {
        $this->admin($request);
        $data = $request->validate(['motif' => ['required', 'string', 'max:1000']]);
        $this->run(fn () => $service->annuler($vente, $data['motif']));

        return back()->with('success', 'Vente annulée.');
    }

    private function admin(Request $request): void
    {
        abort_unless($request->user()?->is_admin, 403);
    }

    private function run(callable $action): mixed
    {
        try {
            return $action();
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['action' => $e->getMessage()]);
        }
    }
}
