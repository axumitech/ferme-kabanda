<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $patrouille_id
 * @property int $poste_controle_id
 * @property CarbonInterface $passe_le
 * @property string $etat
 * @property string|null $constat
 * @property string|null $photo_chemin
 */
class PassagePatrouille extends Model
{
    use EstImmuable;

    protected $table = 'passages_patrouille';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['passe_le' => 'datetime'];
    }

    /** @return BelongsTo<Patrouille, $this> */
    public function patrouille(): BelongsTo
    {
        return $this->belongsTo(Patrouille::class);
    }

    /** @return BelongsTo<PosteControle, $this> */
    public function poste(): BelongsTo
    {
        return $this->belongsTo(PosteControle::class, 'poste_controle_id');
    }
}
