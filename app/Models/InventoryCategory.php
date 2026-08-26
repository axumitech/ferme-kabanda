<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $code
 * @property string $name
 */
class InventoryCategory extends Model
{
    protected $fillable = ['user_id', 'code', 'name'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<InventoryItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }
}
