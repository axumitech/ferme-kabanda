<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanLigne extends Model
{
    protected $guarded = [];

    protected $casts = ['point_controle' => 'boolean', 'quantite' => 'decimal:4'];

    /** @return BelongsTo<Plan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** @param array<string, mixed> $d */
    public static function calculerCle(array $d): string
    {
        return mb_strtoupper(trim(implode('|', [$d['code_cible'] ?? $d['cible'] ?? '—', isset($d['jour_offset']) ? 'J'.$d['jour_offset'] : ($d['recurrence'] ?? '—'), $d['tache']])));
    }
}
