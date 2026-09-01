<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnimalEvenement extends Model
{
    protected $table = 'animal_evenements';

    public $timestamps = false;

    protected $guarded = [];

    public const TYPES = [
        'naissance' => 'Naissance', 'entree' => 'Entrée au registre', 'pesee' => 'Pesée',
        'traitement' => 'Traitement', 'vaccination' => 'Vaccination',
        'vermifugation' => 'Vermifugation', 'supplementation' => 'Supplémentation',
        'saillie' => 'Saillie', 'diagnostic_gestation' => 'Diagnostic de gestation',
        'mise_bas' => 'Mise bas', 'sevrage' => 'Sevrage', 'retour_chaleur' => 'Retour en chaleur',
        'ration' => "Changement d'alimentation", 'loge' => 'Changement de loge',
        'observation' => 'Observation', 'incident' => 'Incident', 'reforme' => 'Réforme',
        'sortie' => 'Sortie', 'mort' => 'Mortalité',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date', 'fin_traitement' => 'date', 'dar_jusquau' => 'date',
            'valeur' => 'decimal:4', 'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Animal, $this> */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }
}
