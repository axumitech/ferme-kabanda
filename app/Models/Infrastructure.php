<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $prochaine_inspection
 */
class Infrastructure extends Model
{
    use Auditable;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'etat_constate_le' => 'date',
            'derniere_inspection' => 'date',
            'prochaine_inspection' => 'date',
            'actif' => 'boolean',
            'valeur_remplacement' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    public const CATEGORIES = [
        'irrigation' => "Réseau d'irrigation",
        'eau' => 'Eau - forage, pompage, stockage',
        'energie' => 'Énergie - solaire, groupe, réseau électrique',
        'batiment' => 'Bâtiment',
        'cloture' => 'Clôture et périmètre',
        'voirie' => 'Voirie et accès',
        'stockage' => 'Stockage et magasin',
        'assainissement' => 'Assainissement et compostage',
    ];

    public const ETATS = [
        'bon' => 'Bon — rien à signaler',
        'moyen' => 'Moyen — surveiller',
        'mauvais' => 'Mauvais — intervention à programmer',
        'critique' => 'Critique — intervention immédiate',
        'hors_service' => 'Hors service',
    ];

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<ReferenceItem, $this> */
    public function parcelle(): BelongsTo
    {
        return $this->belongsTo(ReferenceItem::class, 'parcelle_id');
    }

    /** @return BelongsTo<User, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    /** @return HasMany<InspectionInfrastructure, $this> */
    public function inspections(): HasMany
    {
        return $this->hasMany(InspectionInfrastructure::class)->orderByDesc('date');
    }

    /** @return HasMany<EntretienPlanifie, $this> */
    public function entretiens(): HasMany
    {
        return $this->hasMany(EntretienPlanifie::class);
    }

    /** @return MorphMany<OrdreTravail, $this> */
    public function ordresTravail(): MorphMany
    {
        return $this->morphMany(OrdreTravail::class, 'cible')->orderByDesc('demande_le');
    }

    public function inspectionEnRetard(): bool
    {
        return $this->prochaine_inspection !== null && $this->prochaine_inspection->isPast();
    }

    public function demandeIntervention(): bool
    {
        return in_array($this->etat, ['mauvais', 'critique', 'hors_service'], true);
    }

    /** @return Collection<int, OrdreTravail> */
    public function otOuverts(): Collection
    {
        return $this->ordresTravail()
            ->whereNotIn('statut', ['clos', 'refuse', 'annule'])
            ->get();
    }

    protected function resumeAudit(string $action): string
    {
        return "Infrastructure {$this->code} - {$action}";
    }
}
