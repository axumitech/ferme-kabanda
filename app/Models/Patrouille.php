<?php

namespace App\Models;

use App\Concerns\Auditable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $reference
 * @property CarbonInterface $date
 * @property string $tour
 * @property int|null $agent_id
 * @property string $agent_nom
 * @property string|null $equipe
 * @property int|null $site_id
 * @property CarbonInterface $debut
 * @property CarbonInterface|null $fin
 * @property int $points_prevus
 * @property int $points_faits
 * @property bool $ras
 * @property string|null $observations
 * @property string $statut
 */
class Patrouille extends Model
{
    use Auditable;

    public const TOURS = ['jour' => 'Tour de jour', 'nuit' => 'Tour de nuit'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'debut' => 'datetime',
            'fin' => 'datetime',
            'ras' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return HasMany<PassagePatrouille, $this> */
    public function passages(): HasMany
    {
        return $this->hasMany(PassagePatrouille::class)->orderBy('passe_le');
    }

    public function couverture(): int
    {
        return $this->points_prevus > 0
            ? (int) round($this->points_faits / $this->points_prevus * 100)
            : 0;
    }

    protected function resumeAudit(string $action): string
    {
        return "Patrouille {$this->reference} — {$action}";
    }
}
