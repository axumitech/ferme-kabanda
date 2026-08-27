<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClotureJournaliere extends Model
{
    use Auditable;

    protected $table = 'clotures_journalieres';

    protected $fillable = [
        'date',
        'site_id',
        'departement_id',
        'dues',
        'faites',
        'justifiees',
        'non_justifiees',
        'verrouillee',
        'cloturee_at',
        'cloturee_par_id',
        'observation',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'verrouillee' => 'boolean',
            'cloturee_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<Departement, $this> */
    public function departement(): BelongsTo
    {
        return $this->belongsTo(Departement::class);
    }

    /** @return BelongsTo<User, $this> */
    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cloturee_par_id');
    }
}
