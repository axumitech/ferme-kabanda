<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $plan_import_id
 * @property int $numero_ligne
 * @property string $cle
 * @property string $difference
 * @property array<string, mixed>|null $valeurs_actuelles
 * @property array<string, mixed>|null $valeurs_importees
 * @property list<string>|null $champs_modifies
 * @property string|null $erreur
 * @property bool|null $acceptee
 * @property string|null $commentaire
 */
class PlanImportLigne extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'valeurs_actuelles' => 'array',
            'valeurs_importees' => 'array',
            'champs_modifies' => 'array',
            'acceptee' => 'boolean',
            'decide_le' => 'datetime',
        ];
    }

    /** @return BelongsTo<PlanImport, $this> */
    public function import(): BelongsTo
    {
        return $this->belongsTo(PlanImport::class, 'plan_import_id');
    }
}
