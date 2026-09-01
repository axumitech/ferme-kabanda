<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property Carbon $demande_le
 * @property Carbon|null $approuve_le
 * @property Carbon|null $echeance
 * @property Carbon|null $debut_reel
 * @property Carbon|null $fin_reelle
 * @property Carbon|null $clos_le
 */
class OrdreTravail extends Model
{
    use Auditable;

    protected $table = 'ordres_travail';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'demande_le' => 'datetime',
            'approuve_le' => 'datetime',
            'echeance' => 'date',
            'planifie_le' => 'date',
            'debut_reel' => 'datetime',
            'fin_reelle' => 'datetime',
            'verifie_le' => 'datetime',
            'clos_le' => 'datetime',
            'arret_production' => 'boolean',
            'approbation_requise' => 'boolean',
            'consignation_requise' => 'boolean',
            'consignation_faite' => 'boolean',
            'recurrent' => 'boolean',
            'cout_pieces' => 'decimal:2',
            'cout_main_oeuvre' => 'decimal:2',
            'cout_prestataire' => 'decimal:2',
            'cout_total' => 'decimal:2',
            'immobilisation_heures' => 'decimal:2',
        ];
    }

    public const ORIGINES = [
        'demande' => "Demande d'un agent",
        'preventif' => "Plan d'entretien",
        'correctif' => 'Panne constatée',
        'inspection' => "Inspection d'infrastructure",
        'incident' => 'Incident HSE',
        'ronde' => 'Ronde de sécurité',
    ];

    public const TYPES = [
        'preventif' => 'Préventif — avant la panne',
        'correctif' => 'Correctif — après la panne',
        'amelioration' => 'Amélioration',
        'reglementaire' => 'Réglementaire / obligatoire',
    ];

    public const STATUTS = [
        'demande' => 'Demandé - à approuver',
        'approuve' => 'Approuvé - à planifier',
        'planifie' => 'Planifié',
        'en_cours' => 'En cours',
        'realise' => 'Réalisé - à vérifier',
        'verifie' => 'Vérifié - à clore',
        'clos' => 'Clos',
        'refuse' => 'Refusé',
        'annule' => 'Annulé',
    ];

    public const ETAPES = ['Demande', 'Approbation', 'Planification', 'Exécution', 'Vérification', 'Clôture'];

    public const PERMIS = [
        'aucun' => 'Aucun permis requis',
        'hauteur' => 'Travail en hauteur',
        'chaud' => 'Travail par point chaud',
        'electrique' => 'Intervention électrique',
        'espace_confine' => 'Espace confiné',
    ];

    /** @return MorphTo<Model, $this> */
    public function cible(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return HasMany<OtPiece, $this> */
    public function pieces(): HasMany
    {
        return $this->hasMany(OtPiece::class, 'ordre_travail_id');
    }

    /** @return HasMany<OtPointage, $this> */
    public function pointages(): HasMany
    {
        return $this->hasMany(OtPointage::class, 'ordre_travail_id');
    }

    /** @return HasMany<OtEvenement, $this> */
    public function evenements(): HasMany
    {
        return $this->hasMany(OtEvenement::class, 'ordre_travail_id')->orderByDesc('created_at');
    }

    /** @return BelongsTo<User, $this> */
    public function demandeur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'demandeur_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<User, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    /** @return BelongsTo<User, $this> */
    public function approbateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approuve_par_id');
    }

    /** @return BelongsTo<User, $this> */
    public function verificateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verifie_par_id');
    }

    /** @return BelongsTo<Incident, $this> */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /** @return BelongsTo<Tache, $this> */
    public function tache(): BelongsTo
    {
        return $this->belongsTo(Tache::class);
    }

    /** @return BelongsTo<EntretienPlanifie, $this> */
    public function entretien(): BelongsTo
    {
        return $this->belongsTo(EntretienPlanifie::class, 'entretien_planifie_id');
    }

    /** @return BelongsTo<InspectionInfrastructure, $this> */
    public function inspection(): BelongsTo
    {
        return $this->belongsTo(InspectionInfrastructure::class, 'inspection_id');
    }

    public function ouvert(): bool
    {
        return ! in_array($this->statut, ['clos', 'refuse', 'annule'], true);
    }

    public function enRetard(): bool
    {
        return $this->ouvert() && $this->echeance !== null && $this->echeance->isPast();
    }

    public function joursOuvert(): int
    {
        return (int) $this->demande_le->diffInDays($this->clos_le ?? now());
    }

    public function dureeReparation(): ?float
    {
        return $this->debut_reel && $this->fin_reelle
            ? round($this->debut_reel->diffInMinutes($this->fin_reelle) / 60, 2)
            : null;
    }

    public function etapeCourante(): int
    {
        return match ($this->statut) {
            'demande' => 0,
            'approuve' => 1,
            'planifie' => 2,
            'en_cours' => 3,
            'realise', 'verifie' => 4,
            'clos' => 5,
            default => 0,
        };
    }

    protected function resumeAudit(string $action): string
    {
        return "Ordre de travail {$this->reference} - {$action}";
    }
}
