<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Models\CategorieIncident;
use App\Models\Incident;
use App\Models\IncidentAction;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use RuntimeException;

class IncidentService
{
    /** @param array<string, mixed> $data */
    public function declarer(array $data): Incident
    {
        $survenu = Carbon::parse($data['survenu_le']);
        if ($survenu->isFuture()) {
            throw new RuntimeException('Un incident ne peut pas être daté dans le futur.');
        }

        return Incident::query()->create(array_merge($data, ['reference' => Numerotation::suivant('IR', true), 'survenu_le' => $survenu, 'signale_le' => now(), 'echeance_classification' => $survenu->copy()->addHours(4), 'echeance_investigation' => $survenu->copy()->addHours(48), 'echeance_siege' => $survenu->copy()->addHours(72), 'statut' => 'signale', 'declare_par_id' => auth()->id()]));
    }

    /** @param array<int, string> $codes */
    public function classifier(Incident $incident, array $codes, bool $finale = false): Incident
    {
        $categorie = CategorieIncident::query()->whereIn('code', $codes)->orderBy('gravite')->first();
        if (! $categorie) {
            throw new RuntimeException('Au moins une catégorie d’incident connue est obligatoire.');
        } $incident->update([$finale ? 'categorie_finale_id' : 'categorie_id' => $categorie->id, $finale ? 'confirme_le' : 'classifie_le' => now(), 'statut' => $finale ? 'en_investigation' : 'classifie']);

        return $incident->fresh();
    }

    /** @param array<string, mixed> $data */
    public function ajouterAction(Incident $incident, array $data, TacheService $taches): IncidentAction
    {
        foreach (['action', 'responsable_id', 'echeance'] as $field) {
            if (blank($data[$field] ?? null)) {
                throw new RuntimeException("ACTION INCOMPLÈTE — {$field} est obligatoire.");
            }
        } $task = $taches->creer(['source' => SourceTache::Incident, 'titre' => 'CAPA '.$incident->reference.' — '.mb_substr($data['action'], 0, 120), 'description' => $data['action'], 'site_id' => $incident->site_id, 'departement_id' => $incident->departement_id, 'lieu' => $incident->lieu, 'responsable_id' => $data['responsable_id'], 'date_due' => $data['echeance'], 'priorite' => Priorite::Elevee], $incident);

        return $incident->actions()->create(['type' => $data['type'] ?? 'corrective', 'action' => $data['action'], 'responsable_id' => $data['responsable_id'], 'echeance' => $data['echeance'], 'tache_id' => $task->id]);
    }

    public function cloturer(Incident $incident): Incident
    {
        if ($incident->actions()->where('statut', 'ouverte')->exists()) {
            throw new RuntimeException('CLÔTURE REFUSÉE — des actions correctives restent ouvertes.');
        } if ($incident->categorie?->investigation_obligatoire && blank($incident->cause_racine)) {
            throw new RuntimeException('CLÔTURE REFUSÉE — la cause racine est obligatoire.');
        } $incident->update(['statut' => 'cloture', 'cloture_le' => now()]);

        return $incident->fresh();
    }
}
