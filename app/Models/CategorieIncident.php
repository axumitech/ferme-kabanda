<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategorieIncident extends Model
{
    protected $table = 'categories_incident';

    protected $guarded = [];

    protected $casts = ['investigation_obligatoire' => 'boolean', 'remontee_siege' => 'boolean'];
}
