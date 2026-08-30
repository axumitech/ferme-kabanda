<?php

namespace App\Services;

use App\Models\Incident;
use App\Models\MouvementStock;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Requisition;
use App\Models\TacheEvenement;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/** Assemble le journal depuis les registres existants, sans dupliquer les données. */
class FluxActiviteService
{
    public function __construct(private readonly VisibiliteService $visibilite) {}

    /** @return Collection<int, array<string, mixed>> */
    public function journee(Carbon|string|null $date = null, int $limite = 80): Collection
    {
        $jour = $date ? Carbon::parse($date) : today();
        $du = $jour->copy()->startOfDay();
        $au = $jour->copy()->endOfDay();
        $lignes = collect();
        $user = auth()->user();
        $voitDossiersDisciplinaires = $this->visibilite->peutVoirConfidentiel($user);
        $voitIncidentsSurete = $user !== null && $this->visibilite->peutVoir($user, 'incidents_surete');

        // Une tâche reste visible; seuls les événements disciplinaires qui y
        // sont attachés disparaissent hors de la portée confidentielle.
        TacheEvenement::query()->with('tache:id,reference,titre')->whereBetween('created_at', [$du, $au])
            ->when(! $voitDossiersDisciplinaires, fn ($query) => $query->where('type', 'not like', 'dde%'))
            ->latest('created_at')->limit($limite)->get()
            ->each(fn (TacheEvenement $e) => $lignes->push($this->ligne($e->created_at, 'tache', 'Tâche', $e->resume, $e->tache?->titre, $e->user_nom, '/journee')));
        MouvementStock::query()->with(['article:id,libelle', 'unite:id,code'])->whereBetween('created_at', [$du, $au])->latest('created_at')->limit($limite)->get()
            ->each(fn (MouvementStock $m) => $lignes->push($this->ligne($m->created_at, 'magasin', 'Magasin', ucfirst($m->type).' : '.$m->article?->libelle, trim($m->quantite.' '.$m->unite?->code), $m->user_nom, '/registre-ferme?onglet=mouvements')));
        Plantation::query()->with(['culture:id,nom', 'createur:id,name'])->whereBetween('created_at', [$du, $au])->latest('created_at')->limit($limite)->get()
            ->each(fn (Plantation $p) => $lignes->push($this->ligne($p->created_at, 'plantation', 'Plantation', $p->culture->nom.' plantée', $p->lieu, $p->createur?->name, '/registre-ferme?onglet=production')));
        Recolte::query()->with('plantation.culture:id,nom')->whereBetween('created_at', [$du, $au])->latest('created_at')->limit($limite)->get()
            ->each(fn (Recolte $r) => $lignes->push($this->ligne($r->created_at, 'recolte', 'Récolte', $r->quantite.' '.$r->unite.' de '.$r->plantation->culture->nom, $r->canal_commercial, $r->user_nom, '/registre-ferme?onglet=production')));
        Incident::query()->with('declarant:id,name')->whereBetween('signale_le', [$du, $au])
            ->when(! $voitIncidentsSurete, fn ($query) => $query->where('nature', '!=', 'surete'))
            ->latest('signale_le')->limit($limite)->get()
            ->each(fn (Incident $i) => $lignes->push($this->ligne($i->signale_le, 'alerte', 'Incident', $i->reference ?? 'Incident signalé', $i->lieu, $i->declarant?->name, '/registre-ferme?onglet=incidents')));
        Requisition::query()->with(['demandeur:id,name', 'article:id,code,libelle'])->whereBetween('created_at', [$du, $au])
            ->latest('created_at')->limit($limite)->get()
            ->each(fn (Requisition $r) => $lignes->push($this->ligne(
                $r->created_at,
                'requisition',
                'Réquisition',
                $r->reference.' — '.$r->objet,
                $r->article ? trim($r->article->code.' · '.$r->article->libelle) : $r->nouvel_article,
                $r->demandeur?->name,
                '/registre-ferme?onglet=demandes',
            )));

        return $lignes->sortByDesc('horodatage')->values()->take($limite)->values();
    }

    /** @return array<string, mixed> */
    private function ligne(?CarbonInterface $quand, string $type, string $categorie, string $titre, ?string $detail, ?string $par, string $lien): array
    {
        return ['horodatage' => $quand?->toIso8601String(), 'heure' => $quand?->format('H:i'), 'type' => $type, 'categorie' => $categorie, 'titre' => $titre, 'detail' => $detail, 'par' => $par ?: '—', 'lien' => $lien];
    }
}
