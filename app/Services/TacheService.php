<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use App\Models\ClotureJournaliere;
use App\Models\MotifNonExecution;
use App\Models\Tache;
use App\Support\Numerotation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class TacheService
{
    /** @param array<string, mixed> $donnees */
    public function creer(array $donnees, ?Model $origine = null): Tache
    {
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

        return $tache;
    }

    /** @param array<string, mixed> $donnees */
    public function marquerFaite(Tache $tache, array $donnees = []): Tache
    {
        $this->refuserSiJourneeVerrouillee($tache);

        $tache->update(array_merge([
            'statut' => StatutTache::Faite,
            'fait_le' => now(),
            'fait_par_id' => auth()->id(),
        ], $donnees));

        $tache->journaliserEvenement('faite', 'Exécution enregistrée', $donnees);

        return $tache;
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
        if ($tache->dde_reference) {
            return;
        }

        $reference = Numerotation::suivant('RH');

        $tache->update([
            'dde_reference' => $reference,
            'escalade_niveau' => 3,
            'escalade_le' => now(),
        ]);

        $tache->journaliserEvenement(
            'escaladee',
            "Demande d'explication ouverte sous la référence {$reference}".($motif->article_reglement ? " - {$motif->article_reglement}" : ''),
            ['reference' => $reference, 'article' => $motif->article_reglement],
        );
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
