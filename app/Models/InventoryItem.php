<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $inventory_category_id
 * @property string $code
 * @property string $name
 * @property string $unit
 * @property string $quantity_on_hand
 * @property string $unit_price
 * @property string|null $minimum_quantity
 * @property string|null $cost_center
 * @property Carbon|null $created_on
 * @property-read InventoryCategory $category
 */
class InventoryItem extends Model
{
    protected $fillable = [
        'user_id',
        'inventory_category_id',
        'code',
        'name',
        'unit',
        'quantity_on_hand',
        'unit_price',
        'minimum_quantity',
        'cost_center',
        'created_on',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'quantity_on_hand' => 'decimal:3',
            'unit_price' => 'decimal:2',
            'minimum_quantity' => 'decimal:3',
            'created_on' => 'date',
            'active' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<InventoryCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    /** @return HasMany<InventoryMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }
}
