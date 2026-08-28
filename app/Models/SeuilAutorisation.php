<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeuilAutorisation extends Model
{
    protected $table = 'seuils_autorisation';

    protected $guarded = [];

    protected $casts = ['montant_max' => 'decimal:2', 'valide_par_direction' => 'boolean'];
}
