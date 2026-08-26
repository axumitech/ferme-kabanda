<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MapFeature extends Model
{
    protected $fillable = [
        'reference_item_id',
        'name',
        'feature_type',
        'area_ha',
        'area_m2',
        'points',
        'sort_order',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'points' => 'array',
            'area_ha' => 'decimal:3',
            'area_m2' => 'integer',
            'sort_order' => 'integer',
            'active' => 'boolean',
        ];
    }

    /** @return BelongsTo<ReferenceItem, $this> */
    public function referenceItem(): BelongsTo
    {
        return $this->belongsTo(ReferenceItem::class);
    }
}
