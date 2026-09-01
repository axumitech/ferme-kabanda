<?php

namespace App\Models;

use App\Concerns\Auditable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** @property CarbonInterface|null $date_version */
class DocumentReference extends Model
{
    use Auditable;

    public const TYPES = [
        'politique' => 'Politique',
        'procedure' => 'Procédure',
        'fiche_technique' => 'Fiche technique',
        'manuel' => 'Manuel',
    ];

    protected $table = 'documents_reference';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['date_version' => 'date', 'actif' => 'boolean'];
    }

    /** @return HasMany<SectionReference, $this> */
    public function sections(): HasMany
    {
        return $this->hasMany(SectionReference::class)->orderBy('ordre');
    }

    protected function resumeAudit(string $action): string
    {
        return "Document {$this->code} - {$action}";
    }
}
