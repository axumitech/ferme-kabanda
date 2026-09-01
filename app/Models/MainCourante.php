<?php

namespace App\Models;

use App\Concerns\EstImmuable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registre chronologique du poste de garde : en ajout seul, jamais raturé.
 *
 * @property int $id
 * @property string $reference
 * @property CarbonInterface $survenu_le
 * @property string $type
 * @property string|null $lieu
 * @property string $objet
 * @property string|null $personne
 * @property string|null $vehicule
 * @property string|null $piece_identite
 * @property string|null $photo_chemin
 * @property int|null $agent_id
 * @property string $agent_nom
 */
class MainCourante extends Model
{
    use EstImmuable;

    public const TYPES = [
        'entree' => 'Entrée de personne ou véhicule',
        'sortie' => 'Sortie de personne ou véhicule',
        'livraison' => 'Livraison reçue ou expédiée',
        'visiteur' => 'Visiteur',
        'ronde' => 'Ronde effectuée',
        'consigne' => 'Consigne reçue ou transmise',
        'anomalie' => 'Anomalie constatée',
    ];

    protected $table = 'mains_courantes';

    protected $guarded = [];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['survenu_le' => 'datetime', 'created_at' => 'datetime'];
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

    /** @return BelongsTo<Patrouille, $this> */
    public function patrouille(): BelongsTo
    {
        return $this->belongsTo(Patrouille::class);
    }

    /** @return BelongsTo<Incident, $this> */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }
}
