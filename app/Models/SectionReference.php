<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SectionReference extends Model
{
    protected $table = 'sections_reference';

    protected $guarded = [];

    /** @return BelongsTo<DocumentReference, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(DocumentReference::class, 'document_reference_id');
    }

    public function reference(): string
    {
        return "{$this->document->code} § {$this->ancre}";
    }
}
