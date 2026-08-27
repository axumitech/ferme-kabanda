<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MotifNonExecution extends Model
{
    protected $table = 'motifs_non_execution';

    protected $fillable = [
        'code',
        'libelle',
        'recevable',
        'preuve_requise',
        'article_reglement',
        'ordre',
        'actif',
    ];

    public const PREUVE_AUCUNE = 'aucune';

    public const PREUVE_ARTICLE_RUPTURE = 'article_rupture';

    public const PREUVE_BON_TRAVAIL = 'bon_travail';

    public const PREUVE_HIERARCHIE = 'nom_hierarchie';

    public const PREUVE_INCIDENT = 'incident';

    protected function casts(): array
    {
        return ['recevable' => 'boolean', 'actif' => 'boolean'];
    }

    public function libelleAttendu(): string
    {
        return match ($this->preuve_requise) {
            self::PREUVE_BON_TRAVAIL => 'Numéro du bon de travail',
            self::PREUVE_ARTICLE_RUPTURE => "Code de l'article en rupture",
            self::PREUVE_HIERARCHIE => 'Nom de la personne qui a donné la consigne',
            self::PREUVE_INCIDENT => "Référence du rapport d'incident",
            default => '',
        };
    }
}
