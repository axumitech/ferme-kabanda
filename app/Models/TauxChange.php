<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

class TauxChange extends Model
{
    use Auditable;

    protected $table = 'taux_change';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['effet_le' => 'date', 'taux' => 'decimal:4'];
    }

    protected function resumeAudit(string $action): string
    {
        return "Taux {$this->devise} {$this->taux} — {$action}";
    }
}
