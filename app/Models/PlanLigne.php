<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanLigne extends Model
{
    public const CHAMPS_COMPARES = [
        'cible', 'code_cible', 'jour_offset', 'recurrence', 'tache',
        'description', 'instruction', 'categorie', 'quantite', 'unite',
        'priorite', 'role_responsable', 'point_controle', 'preuve',
    ];

    protected $guarded = [];

    protected $casts = ['point_controle' => 'boolean', 'quantite' => 'decimal:4'];

    /** @return BelongsTo<Plan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** @return HasMany<Tache, $this> */
    public function taches(): HasMany
    {
        return $this->hasMany(Tache::class);
    }

    /** @return BelongsTo<SectionReference, $this> */
    public function sectionReference(): BelongsTo
    {
        return $this->belongsTo(SectionReference::class);
    }

    /** @param array<string, mixed> $d */
    public static function calculerCle(array $d): string
    {
        return mb_strtoupper(trim(implode('|', [$d['code_cible'] ?? $d['cible'] ?? '—', isset($d['jour_offset']) ? 'J'.$d['jour_offset'] : ($d['recurrence'] ?? '—'), $d['tache']])));
    }

    /** @param array<string, mixed> $data */
    public static function calculerEmpreinte(array $data): string
    {
        return hash('sha256', json_encode(array_intersect_key($data, array_flip(self::CHAMPS_COMPARES)), JSON_THROW_ON_ERROR));
    }
}
