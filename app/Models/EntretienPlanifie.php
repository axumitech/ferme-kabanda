<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $prochain_le
 */
class EntretienPlanifie extends Model
{
    protected $table = 'entretiens_planifies';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'dernier_le' => 'date',
            'prochain_le' => 'date',
            'actif' => 'boolean',
            'periodicite_compteur' => 'decimal:2',
            'dernier_compteur' => 'decimal:2',
            'prochain_compteur' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Equipement, $this> */
    public function equipement(): BelongsTo
    {
        return $this->belongsTo(Equipement::class);
    }

    /** @return BelongsTo<Infrastructure, $this> */
    public function infrastructure(): BelongsTo
    {
        return $this->belongsTo(Infrastructure::class);
    }

    /** @return HasMany<InterventionEquipement, $this> */
    public function interventions(): HasMany
    {
        return $this->hasMany(InterventionEquipement::class, 'entretien_planifie_id');
    }

    public function estDu(?Equipement $equipement = null): bool
    {
        $equipement ??= $this->equipement;

        if ($this->prochain_compteur !== null
            && $equipement instanceof Equipement
            && (float) $equipement->compteur_actuel >= (float) $this->prochain_compteur) {
            return true;
        }

        return $this->prochain_le !== null && $this->prochain_le->lte(today());
    }

    public function approche(?Equipement $equipement = null): bool
    {
        $equipement ??= $this->equipement;

        if ($this->prochain_compteur !== null && $equipement instanceof Equipement && $this->alerte_avant_compteur) {
            $reste = (float) $this->prochain_compteur - (float) $equipement->compteur_actuel;

            if ($reste > 0 && $reste <= (float) $this->alerte_avant_compteur) {
                return true;
            }
        }

        return $this->prochain_le !== null
            && $this->prochain_le->isFuture()
            && today()->diffInDays($this->prochain_le) <= 7;
    }

    public function resteAvant(?Equipement $equipement = null): ?string
    {
        $equipement ??= $this->equipement;

        if ($this->prochain_compteur !== null && $equipement instanceof Equipement) {
            $reste = round((float) $this->prochain_compteur - (float) $equipement->compteur_actuel, 1);

            return $reste <= 0
                ? sprintf('DÉPASSÉ de %s %s', abs($reste), $equipement->uniteCompteur())
                : sprintf('dans %s %s', $reste, $equipement->uniteCompteur());
        }

        if ($this->prochain_le) {
            $jours = (int) today()->diffInDays($this->prochain_le, false);

            return $jours < 0 ? sprintf('DÉPASSÉ de %d j', abs($jours)) : sprintf('dans %d j', $jours);
        }

        return null;
    }
}
