<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $legacy_key
 * @property string $assignee_name
 * @property string $material_name
 * @property string|null $size
 * @property Carbon $assigned_on
 * @property Carbon|null $expires_on
 * @property string|null $issued_by_name
 * @property bool $is_replaced
 * @property string|null $assignment_reason
 * @property string|null $end_reason
 */
class MaterialAssignment extends Model
{
    protected $fillable = [
        'user_id',
        'assignee_reference_item_id',
        'material_reference_item_id',
        'actor_user_id',
        'legacy_key',
        'assignee_name',
        'material_name',
        'size',
        'assigned_on',
        'expires_on',
        'issued_by_name',
        'is_replaced',
        'assignment_reason',
        'end_reason',
    ];

    protected function casts(): array
    {
        return [
            'assigned_on' => 'date',
            'expires_on' => 'date',
            'is_replaced' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<ReferenceItem, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(ReferenceItem::class, 'assignee_reference_item_id');
    }

    /** @return BelongsTo<ReferenceItem, $this> */
    public function material(): BelongsTo
    {
        return $this->belongsTo(ReferenceItem::class, 'material_reference_item_id');
    }
}
