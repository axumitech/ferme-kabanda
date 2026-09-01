<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Equipement extends Model
{
    use Auditable;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'acquis_le' => 'date',
            'actif' => 'boolean',
            'compteur_actuel' => 'decimal:2',
            'valeur_acquisition' => 'decimal:2',
            'capacite_reservoir' => 'decimal:2',
            'consommation_ref' => 'decimal:3',
            'tarif_horaire' => 'decimal:2',
            'tarif_hectare' => 'decimal:2',
        ];
    }

    public const CATEGORIES = [
        'tracteur' => 'Tracteur',
        'vehicule' => 'Véhicule',
        'groupe' => 'Groupe électrogène',
        'pompe' => 'Pompe',
        'attelage' => 'Attelage / outil porté',
        'outil' => 'Outillage',
    ];

    public const STATUTS = [
        'disponible' => 'Disponible',
        'en_service' => 'En service',
        'maintenance' => 'En maintenance',
        'immobilise' => 'Immobilisé',
        'reforme' => 'Réformé',
    ];

    /** @return HasMany<EntretienPlanifie, $this> */
    public function entretiens(): HasMany
    {
        return $this->hasMany(EntretienPlanifie::class);
    }

    /** @return HasMany<TravailEquipement, $this> */
    public function travaux(): HasMany
    {
        return $this->hasMany(TravailEquipement::class)->orderByDesc('date');
    }

    /** @return HasMany<InterventionEquipement, $this> */
    public function interventions(): HasMany
    {
        return $this->hasMany(InterventionEquipement::class)->orderByDesc('date');
    }

    /** @return MorphMany<OrdreTravail, $this> */
    public function ordresTravail(): MorphMany
    {
        return $this->morphMany(OrdreTravail::class, 'cible')->orderByDesc('demande_le');
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

    public function uniteCompteur(): string
    {
        return match ($this->type_compteur) {
            'km' => 'km',
            'heures' => 'h',
            default => '',
        };
    }

    /** @return Collection<int, EntretienPlanifie> */
    public function entretiensDus(): Collection
    {
        return $this->entretiens()
            ->where('actif', true)
            ->get()
            ->filter(fn (EntretienPlanifie $entretien): bool => $entretien->estDu($this) || $entretien->approche($this));
    }

    protected function resumeAudit(string $action): string
    {
        return "Équipement {$this->code} - {$action}";
    }
}
