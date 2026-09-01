<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Departement;
use App\Models\Incident;
use App\Models\MotifNonExecution;
use App\Models\MouvementStock;
use App\Models\OrdreTravail;
use App\Models\Plan;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\ReferenceItem;
use App\Models\Requisition;
use App\Models\Tache;
use App\Models\Unite;
use App\Services\VisibiliteService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Vue transversale en lecture du registre opérationnel commun.
 *
 * Les actions restent dans leurs écrans et services dédiés. Ici, une personne
 * peut vérifier ce qui existe déjà avant de lancer un travail ou une demande.
 */
class SharedRegistryController extends Controller
{
    public function __invoke(Request $request, VisibiliteService $visibilite): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        $voitValeursStock = $visibilite->peutVoir($user, 'valeurs_stock');
        $voitRequisitions = $visibilite->peutVoir($user, 'requisitions_autres');
        $voitSurete = $visibilite->peutVoir($user, 'incidents_surete');
        $onglets = ['taches', 'production', 'magasin', 'mouvements', 'demandes', 'incidents', 'plans', 'references'];
        $ongletInitial = $request->string('onglet')->toString();

        return Inertia::render('shared-registry', [
            'scopeMessage' => $voitValeursStock || $voitRequisitions
                ? 'Vous voyez le registre de la ferme et les informations chiffrées autorisées pour votre niveau.'
                : 'Vous voyez le registre opérationnel de toute la ferme. Les montants et les dossiers sensibles restent réservés.',
            'initialTab' => in_array($ongletInitial, $onglets, true) ? $ongletInitial : 'production',
            'plantations' => Plantation::query()
                ->with('culture:id,nom,unite_recolte')
                ->where('statut', 'active')
                ->latest('j0')
                ->limit(100)
                ->get()
                ->map(fn (Plantation $plantation): array => [
                    'id' => $plantation->id,
                    'reference' => $plantation->reference,
                    'culture' => $plantation->culture?->nom,
                    'lieu' => $plantation->lieu,
                    'j0' => $plantation->j0->toDateString(),
                    'quantite' => $plantation->quantite,
                    'unite' => $plantation->unite,
                ])->values(),
            'recoltes' => Recolte::query()
                ->with('plantation.culture:id,nom')
                ->latest('created_at')
                ->limit(150)
                ->get()
                ->map(fn (Recolte $recolte): array => [
                    'id' => $recolte->id,
                    'date' => $recolte->date->toDateString(),
                    'culture' => $recolte->plantation?->culture?->nom,
                    'lieu' => $recolte->plantation?->lieu,
                    'quantite' => $recolte->quantite,
                    'unite' => $recolte->unite,
                    'canal' => $recolte->canal_commercial,
                    'par' => $recolte->user_nom,
                ])->values(),
            'tasks' => Tache::query()
                ->with(['responsable:id,name', 'departement:id,code,nom', 'site:id,code,nom', 'intervenants:id,tache_id,user_id,role'])
                ->where('est_modele', false)
                ->orderByRaw("case when statut = 'a_faire' then 0 else 1 end")
                ->orderBy('date_due')
                ->latest('updated_at')
                ->limit(200)
                ->get()
                ->map(fn (Tache $task): array => [
                    'id' => $task->id,
                    'reference' => $task->reference,
                    'titre' => $task->titre,
                    'description' => $task->description,
                    'instruction' => $task->instruction,
                    'lieu' => $task->lieu,
                    'statut' => $task->statut->value,
                    'priorite' => $task->priorite->value,
                    'statut_approbation' => $task->statut_approbation,
                    'date_due' => $task->date_due->toDateString(),
                    'responsable' => $task->responsable?->name,
                    'departement' => $task->departement?->code,
                    'site' => $task->site?->code,
                    'can_act' => $user->is_admin
                        || $task->responsable_id === $user->id
                        || $task->responsable_id === null
                        || $task->intervenants->contains('user_id', $user->id),
                ])->values(),
            'taskDepartments' => Departement::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
            'motifs' => MotifNonExecution::query()->where('actif', true)->orderBy('ordre')->orderBy('libelle')->get(),
            'openWorkOrders' => OrdreTravail::query()
                ->whereIn('statut', ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'])
                ->orderByDesc('demande_le')->limit(50)->get(['id', 'reference', 'objet']),
            'units' => Unite::query()->where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
            'articles' => Article::query()
                ->with('uniteUsage:id,code')
                ->where('actif', true)
                ->orderBy('categorie')
                ->orderBy('libelle')
                ->limit(160)
                ->get()
                ->map(fn (Article $article): array => [
                    'id' => $article->id,
                    'code' => $article->code,
                    'categorie' => $article->categorie,
                    'libelle' => $article->libelle,
                    'stock' => number_format($article->stockUsage(), 3, '.', ''),
                    'unite' => $article->uniteUsage?->code,
                    'seuil' => $article->seuil_min,
                    'valeur' => $voitValeursStock ? number_format($article->valeur(), 2, '.', '') : null,
                ])->values(),
            'requisitions' => Requisition::query()
                ->with(['article:id,code,libelle', 'unite:id,code', 'demandeur:id,name', 'departement:id,code'])
                ->latest()
                ->limit(100)
                ->get()
                ->map(fn (Requisition $requisition): array => [
                    'id' => $requisition->id,
                    'reference' => $requisition->reference,
                    'type' => $requisition->type,
                    'objet' => $requisition->objet,
                    'statut' => $requisition->statut,
                    'demandeur' => $requisition->demandeur?->name,
                    'article' => $requisition->article ? trim($requisition->article->code.' - '.$requisition->article->libelle) : $requisition->nouvel_article,
                    'quantite' => $requisition->quantite,
                    'unite' => $requisition->unite?->code,
                    'montant' => $voitRequisitions ? $requisition->montant : null,
                ])->values(),
            'mouvements' => MouvementStock::query()
                ->with(['article:id,code,libelle', 'unite:id,code'])
                ->latest('created_at')
                ->limit(120)
                ->get()
                ->map(fn (MouvementStock $movement): array => [
                    'id' => $movement->id,
                    'type' => $movement->type,
                    'article' => $movement->article ? trim($movement->article->code.' - '.$movement->article->libelle) : 'Article',
                    'quantite' => $movement->quantite,
                    'unite' => $movement->unite?->code,
                    'motif' => $movement->motif,
                    'par' => $movement->user_nom,
                    'le' => $movement->created_at?->toIso8601String(),
                ])->values(),
            'incidents' => Incident::query()
                ->when(! $voitSurete, fn ($query) => $query->where('nature', '!=', 'surete'))
                ->latest('signale_le')
                ->limit(100)
                ->get()
                ->map(fn (Incident $incident): array => [
                    'id' => $incident->id,
                    'reference' => $incident->reference,
                    'nature' => $incident->nature,
                    'statut' => $incident->statut,
                    'lieu' => $incident->lieu,
                    'description' => str($incident->description)->limit(180)->toString(),
                    'signale_le' => $incident->signale_le?->toIso8601String(),
                ])->values(),
            'plans' => Plan::query()
                ->where('statut', 'en_vigueur')
                ->latest('date_effet')
                ->limit(30)
                ->get(['id', 'code', 'libelle', 'type', 'version', 'date_effet'])
                ->map(fn (Plan $plan): array => [
                    'id' => $plan->id,
                    'code' => $plan->code,
                    'libelle' => $plan->libelle,
                    'type' => $plan->type,
                    'version' => $plan->version,
                    'date_effet' => $plan->date_effet?->toDateString(),
                ])->values(),
            'references' => ReferenceItem::query()
                ->where('active', true)
                ->whereIn('category', ['cultures', 'produits', 'destinations', 'unites'])
                ->orderBy('category')
                ->orderBy('sort_order')
                ->orderBy('label')
                ->get(['id', 'category', 'label', 'description'])
                ->groupBy('category')
                ->map(fn ($items) => $items->values())
                ->all(),
        ]);
    }
}
