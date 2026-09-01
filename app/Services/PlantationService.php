<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Models\Culture;
use App\Models\Parcelle;
use App\Models\Plan;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Tache;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use RuntimeException;

class PlantationService
{
    public function __construct(protected TacheService $taches) {}

    /** @param array<string, mixed> $data */
    public function planter(array $data): Plantation
    {
        $culture = Culture::query()->findOrFail((int) $data['culture_id']);
        $parcelle = filled($data['parcelle_id'] ?? null) ? Parcelle::query()->find((int) $data['parcelle_id']) : null;
        if ($parcelle && ! $parcelle->actif) {
            throw new RuntimeException("La parcelle {$parcelle->code} est désactivée.");
        }

        $lieu = $data['lieu'] ?? $parcelle?->nom;
        $recente = Plantation::query()
            ->when($parcelle, fn ($query) => $query->where('parcelle_id', $parcelle->id), fn ($query) => $query->where('lieu', $lieu))
            ->where('statut', '!=', 'active')
            ->whereHas('culture', fn ($query) => $query->where('famille', $culture->famille))
            ->latest('j0')->first();
        if ($culture->famille && $culture->delai_rotation && $recente && empty($data['forcer_rotation'])) {
            throw new RuntimeException("ROTATION — {$culture->famille} a déjà occupé ce lieu. Une dérogation explicite est requise.");
        }

        $plantation = Plantation::query()->create([
            'reference' => Numerotation::suivant('PLT', true),
            'culture_id' => $culture->id,
            'site_id' => $data['site_id'] ?? $parcelle?->site_id,
            'parcelle_id' => $parcelle?->id,
            'lieu' => $lieu,
            'j0' => $data['j0'],
            'quantite' => $data['quantite'] ?? null,
            'unite' => $data['unite'] ?? $culture->unite_travail,
            'surface_m2' => $data['surface_m2'] ?? null,
            'plan_id' => $data['plan_id'] ?? Plan::enVigueurPour('BTAGRI')?->id,
            'cree_par_id' => auth()->id(),
            'note' => $data['note'] ?? null,
        ]);
        $this->genererTaches($plantation);

        return $plantation;
    }

    public function genererTaches(Plantation $plantation, ?Plan $planForce = null): int
    {
        $plan = $planForce ?? $plantation->plan ?? Plan::enVigueurPour('BTAGRI');
        if (! $plan) {
            return 0;
        }
        $lignes = $plan->lignes()->whereNotNull('jour_offset')
            ->where(fn ($query) => $query->where('code_cible', $plantation->culture->code)->orWhere('cible', $plantation->culture->nom))->get();
        $count = 0;
        foreach ($lignes as $ligne) {
            if (Tache::query()->where('plantation_id', $plantation->id)->where('plan_ligne_id', $ligne->id)->exists()) {
                continue;
            }
            $this->taches->creer([
                'source' => SourceTache::CalendrierCultural,
                'titre' => "{$ligne->tache} — {$plantation->culture->nom} {$plantation->lieu}",
                'description' => $ligne->description,
                'instruction' => $ligne->instruction,
                'lieu' => $plantation->lieu,
                'site_id' => $plantation->site_id,
                'plantation_id' => $plantation->id,
                'plan_ligne_id' => $ligne->id,
                'date_due' => Carbon::parse($plantation->j0)->addDays((int) $ligne->jour_offset)->toDateString(),
                'priorite' => Priorite::tryFrom($ligne->priorite) ?? Priorite::Normale,
                'quantite' => $ligne->quantite,
                'unite' => $ligne->unite,
            ], $plantation);
            $count++;
        }

        return $count;
    }

    /** @param array<string, mixed> $data */
    public function recolter(Plantation $plantation, array $data): Recolte
    {
        $date = Carbon::parse($data['date'] ?? today());
        if ($plantation->recolte_bloquee_jusquau && $date->lt($plantation->recolte_bloquee_jusquau)) {
            throw new RuntimeException('RÉCOLTE REFUSÉE — délai avant récolte non atteint. Récolte autorisée à partir du '.$plantation->recolte_bloquee_jusquau->format('d/m/Y').'.');
        }
        if (blank($data['canal_commercial'] ?? null)) {
            throw new RuntimeException('CANAL COMMERCIAL OBLIGATOIRE — une récolte doit avoir une destination.');
        }
        $recolte = $plantation->recoltes()->create([
            'date' => $date,
            'quantite' => $data['quantite'],
            'unite' => $data['unite'] ?? $plantation->culture->unite_recolte,
            'qualite' => $data['qualite'] ?? null,
            'canal_commercial' => $data['canal_commercial'],
            'pertes' => $data['pertes'] ?? null,
            'valeur' => $data['valeur'] ?? null,
            'tache_id' => $data['tache_id'] ?? null,
            'user_id' => auth()->id(),
            'user_nom' => auth()->user()->name,
        ]);
        if ($plantation->statut === 'active') {
            $plantation->update(['statut' => 'recoltee']);
        }

        return $recolte;
    }

    public function terminer(Plantation $plantation, string $motif): Plantation
    {
        $plantation->update(['statut' => 'terminee', 'fin_le' => today(), 'fin_motif' => $motif]);

        return $plantation;
    }
}
