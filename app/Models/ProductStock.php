<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $product_name
 * @property string $quantity_on_hand
 */
class ProductStock extends Model
{
    protected $fillable = ['user_id', 'product_name', 'unit', 'quantity_on_hand', 'minimum_quantity', 'active'];

    protected function casts(): array
    {
        return [
            'quantity_on_hand' => 'decimal:3',
            'minimum_quantity' => 'decimal:3',
            'active' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<ProductStockMovement, $this> */
    public function movements(): HasMany
    {
        return $this->hasMany(ProductStockMovement::class);
    }
}
