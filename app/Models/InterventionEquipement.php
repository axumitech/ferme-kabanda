<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterventionEquipement extends Model
{
    use Auditable;

    protected $table = 'interventions_equipement';

    protected $guarded = [];

    public const TYPES = [
        'preventif' => 'Entretien préventif',
        'correctif' => 'Réparation corrective',
        'reparation' => 'Réparation lourde',
        'controle' => 'Contrôle / visite',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'compteur' => 'decimal:2',
            'cout_pieces' => 'decimal:2',
            'cout_main_oeuvre' => 'decimal:2',
            'immobilisation_heures' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Equipement, $this> */
    public function equipement(): BelongsTo
    {
        return $this->belongsTo(Equipement::class);
    }

    /** @return BelongsTo<EntretienPlanifie, $this> */
    public function entretien(): BelongsTo
    {
        return $this->belongsTo(EntretienPlanifie::class, 'entretien_planifie_id');
    }

    /** @return BelongsTo<User, $this> */
    public function realisePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'realise_par_id');
    }

    public function coutTotal(): float
    {
        return round((float) $this->cout_pieces + (float) $this->cout_main_oeuvre, 2);
    }

    protected function resumeAudit(string $action): string
    {
        return "Intervention {$this->reference} - {$action}";
    }
}
