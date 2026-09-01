<?php

namespace App\Services;

use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Models\Article;
use App\Models\EntretienPlanifie;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\OrdreTravail;
use App\Models\OtEvenement;
use App\Models\OtPiece;
use App\Models\OtPointage;
use App\Models\Unite;
use App\Models\User;
use App\Support\Conversion;
use App\Support\HorlogeServeur;
use App\Support\Montant;
use App\Support\Numerotation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class OrdreTravailService
{
    public function __construct(
        protected MagasinService $magasin,
        protected TacheService $taches,
    ) {}

    /** @param array<string, mixed> $donnees */
    public function demander(array $donnees, ?Model $cible = null): OrdreTravail
    {
        if (blank($donnees['objet'] ?? null)) {
            throw new RuntimeException('Un ordre de travail exige un objet précis.');
        }

        return DB::transaction(function () use ($donnees, $cible): OrdreTravail {
            $user = auth()->user();
            $arretProduction = (bool) ($donnees['arret_production'] ?? false);
            $approbationRequise = (bool) ($donnees['approbation_requise'] ?? true);

            $ordre = OrdreTravail::query()->create([
                'reference' => Numerotation::suivant('OT', true),
                'origine' => $donnees['origine'] ?? 'demande',
                'type_intervention' => $donnees['type_intervention'] ?? 'correctif',
                'cible_type' => $cible ? $cible::class : null,
                'cible_id' => $cible?->getKey(),
                'cible_libelle' => $donnees['cible_libelle'] ?? $this->libelleCible($cible),
                'objet' => $donnees['objet'],
                'description' => $donnees['description'] ?? null,
                'diagnostic' => $donnees['diagnostic'] ?? null,
                'priorite' => $arretProduction ? 'urgente' : ($donnees['priorite'] ?? 'normale'),
                'arret_production' => $arretProduction,
                'consequence' => $donnees['consequence'] ?? null,
                'site_id' => $donnees['site_id'] ?? $cible?->getAttribute('site_id'),
                'demandeur_id' => $user?->id,
                'demandeur_nom' => $donnees['demandeur_nom'] ?? ($user instanceof User ? $user->name : 'système'),
                'demande_le' => HorlogeServeur::maintenant(),
                'echeance' => $donnees['echeance'] ?? null,
                'consignation_requise' => (bool) ($donnees['consignation_requise'] ?? false),
                'permis_travail' => $donnees['permis_travail'] ?? 'aucun',
                'epi_requis' => $donnees['epi_requis'] ?? null,
                'incident_id' => $donnees['incident_id'] ?? null,
                'entretien_planifie_id' => $donnees['entretien_planifie_id'] ?? null,
                'inspection_id' => $donnees['inspection_id'] ?? null,
                'photo_avant' => $donnees['photo_avant'] ?? null,
                'statut' => $approbationRequise ? 'demande' : 'approuve',
                'approbation_requise' => $approbationRequise,
            ]);

            if ($cible && $ordre->type_intervention === 'correctif') {
                $anterieurs = OrdreTravail::query()
                    ->where('cible_type', $cible::class)
                    ->where('cible_id', $cible->getKey())
                    ->where('type_intervention', 'correctif')
                    ->where('id', '!=', $ordre->id)
                    ->where('demande_le', '>=', now()->subDays(90))
                    ->count();

                if ($anterieurs > 0) {
                    $ordre->update(['recurrent' => true]);
                    $this->journal(
                        $ordre,
                        'alerte',
                        'PANNE RÉCURRENTE',
                        sprintf('%d correctif(s) sur cette cible en 90 jours. La cause racine sera obligatoire.', $anterieurs),
                    );
                }
            }

            $this->journal(
                $ordre,
                $approbationRequise ? 'demande' : 'circuit',
                $approbationRequise
                    ? 'Ordre de travail demandé : '.$ordre->objet
                    : 'Approbation non requise — ordre prêt à planifier',
            );

            return $ordre->refresh();
        });
    }

    public function approuver(OrdreTravail $ordre, ?string $note = null): OrdreTravail
    {
        $this->exigerStatut($ordre, ['demande']);

        if ($ordre->demandeur_id !== null && $ordre->demandeur_id === auth()->id()) {
            throw new RuntimeException(
                "Vous avez émis cette demande : vous ne pouvez pas l'approuver. Nul n'approuve sa propre demande.",
            );
        }

        $ordre->update([
            'statut' => 'approuve',
            'approuve_par_id' => auth()->id(),
            'approuve_le' => now(),
        ]);
        $this->journal($ordre, 'approbation', 'Approuvé', $note);

        return $ordre->refresh();
    }

    public function refuser(OrdreTravail $ordre, string $motif): OrdreTravail
    {
        $this->exigerStatut($ordre, ['demande', 'approuve']);

        if (blank($motif)) {
            throw new RuntimeException('Un refus exige un motif écrit.');
        }

        $ordre->update(['statut' => 'refuse', 'motif_refus' => $motif]);
        $this->journal($ordre, 'refus', 'Refusé', $motif);

        return $ordre->refresh();
    }

    /** @param array<string, mixed> $donnees */
    public function planifier(OrdreTravail $ordre, array $donnees): OrdreTravail
    {
        $this->exigerStatut($ordre, ['approuve', 'planifie']);

        if (blank($donnees['planifie_le'] ?? null)) {
            throw new RuntimeException('La date de planification est obligatoire.');
        }

        return DB::transaction(function () use ($ordre, $donnees): OrdreTravail {
            $date = Carbon::parse($donnees['planifie_le']);

            $ordre->update([
                'statut' => 'planifie',
                'responsable_id' => $donnees['responsable_id'] ?? null,
                'prestataire' => $donnees['prestataire'] ?? null,
                'planifie_le' => $date,
                'echeance' => $donnees['echeance'] ?? $ordre->echeance ?? $date,
            ]);

            if ($ordre->responsable_id && ! $ordre->tache_id) {
                $tache = $this->taches->creer([
                    'source' => SourceTache::Entretien,
                    'titre' => Str::limit(
                        'Ordre de travail '.$ordre->reference.' - '.$ordre->objet,
                        200,
                        '',
                    ),
                    'description' => $ordre->description,
                    'instruction' => $this->instructionTache($ordre),
                    'date_due' => $date,
                    'priorite' => $this->prioriteTache($ordre->priorite),
                    'responsable_id' => $ordre->responsable_id,
                    'site_id' => $ordre->site_id,
                    'lieu' => $ordre->cible_libelle,
                ], $ordre);

                $tache->update(['ordre_travail_id' => $ordre->id]);
                $ordre->update(['tache_id' => $tache->id]);
            }

            $this->journal(
                $ordre,
                'planification',
                'Planifié au '.$date->format('d/m/Y'),
                $ordre->prestataire ? 'Prestataire : '.$ordre->prestataire : null,
            );

            return $ordre->refresh();
        });
    }

    public function demarrer(OrdreTravail $ordre, bool $consignationFaite = false): OrdreTravail
    {
        $this->exigerStatut($ordre, ['approuve', 'planifie']);

        if ($ordre->consignation_requise && ! $consignationFaite) {
            throw new RuntimeException('CONSIGNATION NON CONFIRMÉE. La mise hors énergie doit être vérifiée avant le démarrage.');
        }

        $ordre->update([
            'statut' => 'en_cours',
            'debut_reel' => now(),
            'consignation_faite' => true,
        ]);

        if ($ordre->cible instanceof Equipement && $ordre->arret_production) {
            $ordre->cible->update([
                'statut' => 'maintenance',
                'motif_immobilisation' => 'Ordre de travail '.$ordre->reference,
            ]);
        }

        $this->journal(
            $ordre,
            'demarrage',
            'Intervention démarrée',
            $ordre->consignation_requise ? 'Consignation confirmée.' : null,
        );

        return $ordre->refresh();
    }

    /** @param array<string, mixed> $donnees */
    public function ajouterPiece(OrdreTravail $ordre, array $donnees): OtPiece
    {
        $this->exigerStatut($ordre, ['planifie', 'en_cours', 'realise']);

        $quantite = (float) ($donnees['quantite'] ?? 0);
        if ($quantite <= 0) {
            throw new RuntimeException('La quantité de pièce doit être strictement positive.');
        }

        return DB::transaction(function () use ($ordre, $donnees, $quantite): OtPiece {
            $origine = $donnees['origine_piece'] ?? 'magasin';
            $cout = Montant::zero('USD');
            $mouvement = null;
            $designation = $donnees['designation'] ?? null;
            $uniteLibelle = $donnees['unite'] ?? null;

            if ($origine === 'magasin') {
                if (empty($donnees['article_id'])) {
                    throw new RuntimeException('Une sortie du magasin exige un article référencé.');
                }

                $article = Article::query()->findOrFail((int) $donnees['article_id']);
                $uniteId = $donnees['unite_id'] ?? $article->unite_usage_id;
                $unite = Unite::query()->find((int) $uniteId) ?? $article->uniteUsage;

                if (! $unite instanceof Unite) {
                    throw new RuntimeException("L'unité de sortie de la pièce est introuvable.");
                }

                $mouvement = $this->magasin->sortie(
                    $article,
                    $quantite,
                    $unite,
                    Str::limit(
                        sprintf('Ordre de travail %s - %s', $ordre->reference, $ordre->objet),
                        255,
                        '',
                    ),
                    $ordre,
                );

                $designation ??= $article->code.' - '.$article->libelle;
                $uniteLibelle ??= $unite->nom;
                $cout = $this->coutArticle($article, $quantite, $unite);
            } elseif (isset($donnees['cout'])) {
                $cout = Montant::de($donnees['cout'], 'USD');
            } elseif (isset($donnees['cout_unitaire'])) {
                $cout = Montant::de($donnees['cout_unitaire'], 'USD')->fois($quantite);
            }

            $piece = $ordre->pieces()->create([
                'article_id' => $donnees['article_id'] ?? null,
                'designation' => $designation ?: 'Pièce non référencée',
                'quantite' => $quantite,
                'unite' => $uniteLibelle,
                'cout_unitaire' => $donnees['cout_unitaire'] ?? ($quantite > 0 ? $cout->decimal() / $quantite : null),
                'cout' => $cout->decimal(),
                'mouvement_id' => $mouvement?->id,
                'origine_piece' => $origine,
            ]);

            $this->recalculerCouts($ordre);
            $this->journal($ordre, 'piece', 'Pièce posée : '.$piece->designation, $piece->quantite.' '.$piece->unite);

            return $piece;
        });
    }

    /** @param array<string, mixed> $donnees */
    public function pointer(OrdreTravail $ordre, array $donnees): OtPointage
    {
        $this->exigerStatut($ordre, ['en_cours', 'realise']);

        $heures = (float) ($donnees['heures'] ?? 0);
        if ($heures <= 0 || $heures > 24) {
            throw new RuntimeException('Le temps passé doit être compris entre 0 et 24 heures pour une journée.');
        }

        $taux = isset($donnees['taux_horaire'])
            ? Montant::de($donnees['taux_horaire'], 'USD')
            : Montant::zero('USD');

        $nomLibre = trim((string) ($donnees['intervenant_nom'] ?? ''));
        if (filled($donnees['user_id'] ?? null)) {
            $userId = (int) $donnees['user_id'];
            $nomIntervenant = User::query()->findOrFail($userId)->name;
        } elseif ($nomLibre !== '') {
            $userId = null;
            $nomIntervenant = $nomLibre;
        } else {
            $userId = auth()->id();
            $user = auth()->user();
            $nomIntervenant = $user instanceof User ? $user->name : 'intervenant';
        }

        $pointage = $ordre->pointages()->create([
            'user_id' => $userId,
            'intervenant_nom' => $nomIntervenant,
            'date' => HorlogeServeur::declaree($donnees['date'] ?? null, 'La date du pointage'),
            'heures' => $heures,
            'taux_horaire' => $taux->estZero() ? null : $taux->decimal(),
            'cout' => $taux->fois($heures)->decimal(),
            'travail' => $donnees['travail'] ?? null,
        ]);

        $this->recalculerCouts($ordre);
        $this->journal($ordre, 'pointage', sprintf('%s - %s h', $pointage->intervenant_nom, $heures));

        return $pointage;
    }

    /** @param array<string, mixed> $donnees */
    public function terminer(OrdreTravail $ordre, array $donnees): OrdreTravail
    {
        $this->exigerStatut($ordre, ['en_cours']);

        if (blank($donnees['travaux_realises'] ?? null)) {
            throw new RuntimeException('Décrivez précisément les travaux réalisés.');
        }

        if ($ordre->recurrent && blank($donnees['cause_racine'] ?? null)) {
            throw new RuntimeException('PANNE RÉCURRENTE : la cause racine est obligatoire.');
        }

        $fin = now();
        $debutReel = $ordre->debut_reel;
        $ordre->update([
            'statut' => 'realise',
            'fin_reelle' => $fin,
            'travaux_realises' => $donnees['travaux_realises'],
            'cause_racine' => $donnees['cause_racine'] ?? null,
            'cout_prestataire' => Montant::de($donnees['cout_prestataire'] ?? 0, 'USD')->decimal(),
            'photo_apres' => $donnees['photo_apres'] ?? null,
            'immobilisation_heures' => $debutReel
                ? round(Carbon::parse($debutReel)->diffInMinutes($fin) / 60, 2)
                : null,
        ]);

        $this->recalculerCouts($ordre);
        $this->journal($ordre, 'realisation', 'Travaux terminés', $donnees['travaux_realises']);

        return $ordre->refresh();
    }

    public function verifier(OrdreTravail $ordre, bool $conforme, ?string $observation = null): OrdreTravail
    {
        $this->exigerStatut($ordre, ['realise']);

        if (! $conforme) {
            if (blank($observation)) {
                throw new RuntimeException('Un refus de conformité doit préciser ce qui doit être repris.');
            }

            $ordre->update(['statut' => 'en_cours', 'fin_reelle' => null]);
            $this->journal($ordre, 'verification', 'NON CONFORME - travaux à reprendre', $observation);

            return $ordre->refresh();
        }

        $ordre->update([
            'statut' => 'verifie',
            'verifie_par_id' => auth()->id(),
            'verifie_le' => now(),
            'observation_verification' => $observation,
        ]);
        $this->journal($ordre, 'verification', 'Conforme', $observation);

        return $ordre->refresh();
    }

    public function clore(OrdreTravail $ordre, bool $remettreEnService = true): OrdreTravail
    {
        $this->exigerStatut($ordre, ['verifie']);

        return DB::transaction(function () use ($ordre, $remettreEnService): OrdreTravail {
            $ordre->update(['statut' => 'clos', 'clos_le' => now()]);
            $cible = $ordre->cible;

            if ($remettreEnService && $cible instanceof Equipement && $cible->statut === 'maintenance') {
                $cible->update(['statut' => 'disponible', 'motif_immobilisation' => null]);
            }

            if ($remettreEnService && $cible instanceof Infrastructure) {
                $cible->update(['etat' => 'bon', 'etat_constate_le' => today()]);
            }

            if ($ordre->entretien_planifie_id) {
                $entretien = EntretienPlanifie::query()->find($ordre->entretien_planifie_id);

                if ($entretien instanceof EntretienPlanifie) {
                    $finReelle = $ordre->fin_reelle;
                    $entretien->update([
                        'dernier_le' => $finReelle !== null
                            ? Carbon::parse($finReelle)->toDateString()
                            : today(),
                        'prochain_le' => $entretien->periodicite_jours
                            ? Carbon::parse($finReelle ?? today())->addDays((int) $entretien->periodicite_jours)
                            : null,
                        'dernier_compteur' => $cible instanceof Equipement ? $cible->compteur_actuel : null,
                        'prochain_compteur' => $cible instanceof Equipement && $entretien->periodicite_compteur
                            ? (float) $cible->compteur_actuel + (float) $entretien->periodicite_compteur
                            : null,
                    ]);
                }
            }

            $this->journal($ordre, 'cloture', 'Ordre de travail clos');

            return $ordre->refresh();
        });
    }

    protected function recalculerCouts(OrdreTravail $ordre): void
    {
        $pieces = Montant::somme(
            $ordre->pieces()->pluck('cout')->map(fn (mixed $cout): Montant => Montant::de($cout, 'USD')),
            'USD',
        );
        $mainOeuvre = Montant::somme(
            $ordre->pointages()->pluck('cout')->map(fn (mixed $cout): Montant => Montant::de($cout, 'USD')),
            'USD',
        );
        $prestataire = Montant::de($ordre->cout_prestataire, 'USD');

        $ordre->update([
            'cout_pieces' => $pieces->decimal(),
            'cout_main_oeuvre' => $mainOeuvre->decimal(),
            'cout_total' => $pieces->plus($mainOeuvre)->plus($prestataire)->decimal(),
        ]);
    }

    /** @param list<string> $attendus */
    protected function exigerStatut(OrdreTravail $ordre, array $attendus): void
    {
        if (! in_array($ordre->statut, $attendus, true)) {
            throw new RuntimeException(sprintf(
                'Ordre de travail %s : statut « %s ». Cette action attend : %s.',
                $ordre->reference,
                OrdreTravail::STATUTS[$ordre->statut] ?? $ordre->statut,
                implode(', ', array_map(fn (string $statut): string => OrdreTravail::STATUTS[$statut] ?? $statut, $attendus)),
            ));
        }
    }

    protected function libelleCible(?Model $cible): ?string
    {
        return match (true) {
            $cible instanceof Equipement => $cible->code.' - '.$cible->nom,
            $cible instanceof Infrastructure => $cible->code.' - '.$cible->nom,
            $cible instanceof Model => class_basename($cible).' #'.$cible->getKey(),
            default => null,
        };
    }

    protected function journal(OrdreTravail $ordre, string $type, string $resume, ?string $detail = null): void
    {
        $user = auth()->user();

        OtEvenement::query()->create([
            'ordre_travail_id' => $ordre->id,
            'type' => $type,
            'resume' => Str::limit($resume, 255, ''),
            'detail' => $detail,
            'user_id' => $user?->id,
            'user_nom' => $user instanceof User ? $user->name : 'système',
        ]);
    }

    protected function instructionTache(OrdreTravail $ordre): ?string
    {
        return trim(sprintf(
            '%s%s%s',
            $ordre->cible_libelle ? 'Cible : '.$ordre->cible_libelle.'. ' : '',
            $ordre->consignation_requise ? 'CONSIGNATION OBLIGATOIRE avant intervention. ' : '',
            $ordre->epi_requis ? 'EPI : '.$ordre->epi_requis.'.' : '',
        )) ?: null;
    }

    protected function prioriteTache(string $priorite): Priorite
    {
        return match ($priorite) {
            'urgente' => Priorite::Urgente,
            'elevee' => Priorite::Elevee,
            'basse' => Priorite::Planifiee,
            default => Priorite::Normale,
        };
    }

    protected function coutArticle(Article $article, float $quantite, Unite $unite): Montant
    {
        if ($article->prix_unitaire === null) {
            return Montant::zero('USD');
        }

        $baseDemandee = Conversion::versBasePourArticle($article, $quantite, $unite);
        $baseParUniteAchat = Conversion::versBasePourArticle($article, 1, $article->uniteAchat);

        if ($baseParUniteAchat <= 0) {
            return Montant::zero('USD');
        }

        return Montant::de($article->prix_unitaire, 'USD')->fois($baseDemandee / $baseParUniteAchat);
    }
}
