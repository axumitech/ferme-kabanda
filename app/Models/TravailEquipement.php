<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TravailEquipement extends Model
{
    use Auditable;

    protected $table = 'travaux_equipement';

    protected $guarded = [];

    public const NATURES = [
        'interne' => 'Travail interne FKN',
        'tiers' => 'Prestation pour un tiers - facturable',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'duree_heures' => 'decimal:2',
            'compteur_debut' => 'decimal:2',
            'compteur_fin' => 'decimal:2',
            'compteur_parcouru' => 'decimal:2',
            'surface_travaillee' => 'decimal:2',
            'carburant_litres' => 'decimal:2',
            'cout_carburant' => 'decimal:2',
            'montant_facture' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Equipement, $this> */
    public function equipement(): BelongsTo
    {
        return $this->belongsTo(Equipement::class);
    }

    /** @return BelongsTo<User, $this> */
    public function operateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operateur_id');
    }

    /** @return BelongsTo<ReferenceItem, $this> */
    public function parcelle(): BelongsTo
    {
        return $this->belongsTo(ReferenceItem::class, 'parcelle_id');
    }

    /** @return BelongsTo<MouvementStock, $this> */
    public function mouvementCarburant(): BelongsTo
    {
        return $this->belongsTo(MouvementStock::class, 'mouvement_carburant_id');
    }

    /** @return BelongsTo<Tache, $this> */
    public function tache(): BelongsTo
    {
        return $this->belongsTo(Tache::class);
    }

    public function consommation(): ?float
    {
        if ((float) $this->carburant_litres <= 0) {
            return null;
        }

        if ($this->equipement?->type_compteur === 'km' && (float) $this->compteur_parcouru > 0) {
            return round((float) $this->carburant_litres / (float) $this->compteur_parcouru * 100, 2);
        }

        return (float) $this->duree_heures > 0
            ? round((float) $this->carburant_litres / (float) $this->duree_heures, 2)
            : null;
    }

    public function ecartConsommation(): ?float
    {
        $reference = (float) ($this->equipement->consommation_ref ?? 0);
        $reelle = $this->consommation();

        return $reference > 0 && $reelle !== null
            ? round(($reelle - $reference) / $reference * 100, 1)
            : null;
    }

    protected function resumeAudit(string $action): string
    {
        return "Fiche de travail {$this->reference} - {$action}";
    }
}
