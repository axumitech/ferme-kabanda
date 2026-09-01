<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Emplacement extends Model
{
    use Auditable;

    protected $guarded = [];

    public const TYPES = [
        'casier' => 'Casier',
        'palette' => 'Palette',
        'cuve' => 'Cuve',
        'vrac' => 'Vrac',
        'froid' => 'Chambre froide',
    ];

    protected function casts(): array
    {
        return ['actif' => 'boolean'];
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return HasMany<Article, $this> */
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    protected function resumeAudit(string $action): string
    {
        return "Emplacement {$this->code} — {$action}";
    }
}
