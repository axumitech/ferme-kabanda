<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\MotifNonExecution;
use App\Models\Tache;
use App\Models\TacheIntervenant;
use App\Models\User;
use App\Support\Numerotation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class TacheService
{
    /** @param array<string, mixed> $donnees */
    public function creer(array $donnees, ?Model $origine = null): Tache
    {
        $appuiIds = $donnees['appui_ids'] ?? [];
        $informeIds = $donnees['informe_ids'] ?? [];
        unset($donnees['appui_ids'], $donnees['informe_ids']);
        $cle = [
            'source' => $donnees['source'] instanceof SourceTache ? $donnees['source']->value : $donnees['source'],
            'titre' => $donnees['titre'],
            'lieu' => $donnees['lieu'] ?? null,
            'date_due' => $donnees['date_due'],
        ];

        if ($origine) {
            $cle['origine_type'] = $origine::class;
            $cle['origine_id'] = $origine->getKey();
        }

        if ($existante = Tache::query()->where($cle)->first()) {
            return $existante;
        }

        $tache = Tache::query()->create(array_merge([
            'reference' => Numerotation::suivant('TSK', true),
            'priorite' => Priorite::Normale,
            'statut' => StatutTache::AFaire,
            'cree_par_id' => auth()->id(),
            'origine_type' => $origine?->getKey() ? $origine::class : null,
            'origine_id' => $origine?->getKey(),
        ], $donnees));

        $tache->journaliserEvenement('creee', "Tâche créée - {$tache->titre}");
        $this->synchroniserIntervenants($tache, $appuiIds, $informeIds);

        return $tache;
    }

    /** @param array<string, mixed> $donnees */
    public function marquerFaite(Tache $tache, array $donnees = []): Tache
    {
        $this->refuserSiJourneeVerrouillee($tache);
        app(ApprobationTacheService::class)->verifierExecutable($tache);

        $tache->update(array_merge([
            'statut' => StatutTache::Faite,
            'fait_le' => now(),
            'fait_par_id' => auth()->id(),
        ], $donnees));

        $tache->journaliserEvenement('faite', 'Exécution enregistrée', $donnees);

        return $tache;
    }

    /**
     * @param  array<int, int|string>  $appuiIds
     * @param  array<int, int|string>  $informeIds
     */
    public function definirIntervenants(Tache $tache, int $responsableId, array $appuiIds, array $informeIds): void
    {
        $tache->forceFill(['responsable_id' => $responsableId])->saveQuietly();

        $roles = collect([$responsableId => TacheIntervenant::RESPONSABLE]);
        foreach ($appuiIds as $id) {
            if ((int) $id !== $responsableId) {
                $roles->put((int) $id, TacheIntervenant::APPUI);
            }
        }
        foreach ($informeIds as $id) {
            if ((int) $id !== $responsableId && ! $roles->has((int) $id)) {
                $roles->put((int) $id, TacheIntervenant::INFORME);
            }
        }

        $tache->intervenants()->whereNotIn('user_id', $roles->keys())->delete();
        foreach ($roles as $userId => $role) {
            $tache->intervenants()->updateOrCreate(['user_id' => $userId], ['role' => $role]);
        }
    }

    public function justifier(Tache $tache, MotifNonExecution $motif, ?string $precision = null): Tache
    {
        $this->refuserSiJourneeVerrouillee($tache);

        if ($motif->preuve_requise !== MotifNonExecution::PREUVE_AUCUNE && blank($precision)) {
            throw new RuntimeException("MOTIF INCOMPLET - « {$motif->libelle} » exige : {$motif->libelleAttendu()}.");
        }

        $statut = $motif->recevable
            ? StatutTache::NonFaiteJustifiee
            : StatutTache::NonFaiteNonJustifiee;

        $tache->update([
            'statut' => $statut,
            'motif_id' => $motif->id,
            'motif_precision' => $precision,
            'justifie_le' => now(),
            'justifie_par_id' => auth()->id(),
        ]);

        $tache->journaliserEvenement(
            $motif->recevable ? 'justifiee' : 'refusee',
            ($motif->recevable ? 'Justifiée : ' : 'Motif non recevable : ').$motif->libelle.($precision ? " ({$precision})" : ''),
            ['motif' => $motif->code, 'precision' => $precision],
        );

        if (! $motif->recevable) {
            $this->ouvrirDossierDisciplinaire($tache, $motif);
        }

        return $tache;
    }

    public function ouvrirDossierDisciplinaire(Tache $tache, MotifNonExecution $motif): void
    {
        if ($tache->dde_statut) {
            return;
        }

        $tache->update([
            'dde_statut' => 'a_valider',
        ]);

        $tache->journaliserEvenement(
            'dde_a_valider',
            'Motif non recevable à valider par un supérieur'.($motif->article_reglement ? " - {$motif->article_reglement}" : ''),
            ['article' => $motif->article_reglement],
        );
    }

    public function validerDossierDisciplinaire(Tache $tache, User $validateur, ?string $observation = null): Tache
    {
        $this->verifierValidateurDde($tache, $validateur);

        if ($tache->dde_statut !== 'a_valider') {
            throw new RuntimeException('Ce dossier disciplinaire n’est pas en attente de validation.');
        }

        $reference = Numerotation::suivant('RH');
        $tache->update([
            'dde_reference' => $reference,
            'dde_statut' => 'confirme',
            'dde_valide_par_id' => $validateur->id,
            'dde_valide_le' => now(),
            'dde_observation' => $observation,
            'escalade_niveau' => 3,
            'escalade_le' => now(),
        ]);
        $tache->journaliserEvenement('dde_confirmee', "Demande d'explication confirmée sous la référence {$reference}", ['reference' => $reference]);

        return $tache;
    }

    public function requalifierDossierDisciplinaire(Tache $tache, User $validateur, string $observation): Tache
    {
        $this->verifierValidateurDde($tache, $validateur);

        if ($tache->dde_statut !== 'a_valider' || blank($observation)) {
            throw new RuntimeException('Une observation est obligatoire pour requalifier un dossier en attente.');
        }

        $tache->update([
            'statut' => StatutTache::NonFaiteJustifiee,
            'dde_statut' => 'requalifie',
            'dde_valide_par_id' => $validateur->id,
            'dde_valide_le' => now(),
            'dde_observation' => $observation,
        ]);
        $tache->journaliserEvenement('dde_requalifiee', "Dossier requalifié : {$observation}");

        return $tache;
    }

    public function cloturer(int $siteId, int $departementId, CarbonInterface $date, ?string $observation = null): ClotureJournaliere
    {
        $taches = Tache::query()
            ->where('site_id', $siteId)
            ->where('departement_id', $departementId)
            ->whereDate('date_due', $date)
            ->where('est_modele', false)
            ->get();

        $ouvertes = $taches->where('statut', StatutTache::AFaire);

        if ($ouvertes->isNotEmpty()) {
            throw new RuntimeException(sprintf(
                'CLÔTURE REFUSÉE - %d tâche(s) sans réponse : %s. Chacune doit être faite ou justifiée.',
                $ouvertes->count(),
                $ouvertes->take(5)->pluck('titre')->implode(' · '),
            ));
        }

        return ClotureJournaliere::query()->updateOrCreate(
            ['date' => $date->toDateString(), 'site_id' => $siteId, 'departement_id' => $departementId],
            [
                'dues' => $taches->count(),
                'faites' => $taches->where('statut', StatutTache::Faite)->count(),
                'justifiees' => $taches->where('statut', StatutTache::NonFaiteJustifiee)->count(),
                'non_justifiees' => $taches->where('statut', StatutTache::NonFaiteNonJustifiee)->count(),
                'verrouillee' => true,
                'cloturee_at' => now(),
                'cloturee_par_id' => auth()->id(),
                'observation' => $observation,
            ],
        );
    }

    public function journeeVerrouillee(?int $siteId, ?int $departementId, CarbonInterface|string $date): bool
    {
        if (! $siteId || ! $departementId) {
            return false;
        }

        return ClotureJournaliere::query()
            ->where('site_id', $siteId)
            ->where('departement_id', $departementId)
            ->whereDate('date', $date)
            ->where('verrouillee', true)
            ->exists();
    }

    protected function refuserSiJourneeVerrouillee(Tache $tache): void
    {
        if ($this->journeeVerrouillee($tache->site_id, $tache->departement_id, $tache->date_due)) {
            throw new RuntimeException(
                'JOURNÉE CLÔTURÉE - cette journée est verrouillée. Seule la Direction peut la rouvrir, et la réouverture est journalisée.',
            );
        }
    }

    /**
     * @param  array<int, int|string>  $appuiIds
     * @param  array<int, int|string>  $informeIds
     */
    private function synchroniserIntervenants(Tache $tache, array $appuiIds, array $informeIds): void
    {
        $roles = collect();
        foreach ($appuiIds as $id) {
            if ($id) {
                $roles->put((int) $id, TacheIntervenant::APPUI);
            }
        }
        foreach ($informeIds as $id) {
            if ($id) {
                $roles->put((int) $id, TacheIntervenant::INFORME);
            }
        }

        if ($tache->responsable_id) {
            $roles->put((int) $tache->responsable_id, TacheIntervenant::RESPONSABLE);
        }

        foreach ($roles as $userId => $role) {
            $tache->intervenants()->updateOrCreate(['user_id' => $userId], ['role' => $role]);
        }
    }

    private function verifierValidateurDde(Tache $tache, User $validateur): void
    {
        if ($validateur->niveau_hierarchie > 3 || in_array($validateur->id, [$tache->responsable_id, $tache->justifie_par_id], true)) {
            throw new RuntimeException('VALIDATION DDE REFUSÉE — seul un supérieur (niveaux 1 à 3), distinct de l’intéressé et du justificateur, peut décider.');
        }
    }

    /** @return array{dues: int, faites: int, justifiees: int, non_justifiees: int, ouvertes: int, taux: float|null} */
    public function tauxExecution(CarbonInterface $du, CarbonInterface $au, ?int $userId = null, ?int $departementId = null): array
    {
        $query = Tache::query()->whereBetween('date_due', [$du, $au])->where('est_modele', false);

        if ($userId) {
            $query->where('responsable_id', $userId);
        }

        if ($departementId) {
            $query->where('departement_id', $departementId);
        }

        $dues = (clone $query)->count();
        $faites = (clone $query)->where('statut', StatutTache::Faite)->count();

        return [
            'dues' => $dues,
            'faites' => $faites,
            'justifiees' => (clone $query)->where('statut', StatutTache::NonFaiteJustifiee)->count(),
            'non_justifiees' => (clone $query)->where('statut', StatutTache::NonFaiteNonJustifiee)->count(),
            'ouvertes' => (clone $query)->where('statut', StatutTache::AFaire)->count(),
            'taux' => $dues > 0 ? round($faites / $dues * 100, 1) : null,
        ];
    }
}
