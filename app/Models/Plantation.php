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
 * @property string $lieu
 * @property CarbonInterface $j0
 * @property string|null $quantite
 * @property string|null $unite
 * @property CarbonInterface|null $created_at
 */
class Plantation extends Model
{
    use Auditable;

    protected $guarded = [];

    protected $casts = ['j0' => 'date', 'fin_le' => 'date', 'quantite' => 'decimal:2'];

    /** @return BelongsTo<Culture, $this> */
    public function culture(): BelongsTo
    {
        return $this->belongsTo(Culture::class);
    }

    /** @return BelongsTo<User, $this> */
    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par_id');
    }

    /** @return HasMany<Recolte, $this> */
    public function recoltes(): HasMany
    {
        return $this->hasMany(Recolte::class);
    }

    /** @return HasMany<Tache, $this> */
    public function taches(): HasMany
    {
        return $this->hasMany(Tache::class);
    }
}
