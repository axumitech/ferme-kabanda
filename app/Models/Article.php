<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Article extends Model
{
    use Auditable;

    protected $fillable = [
        'code',
        'categorie',
        'libelle',
        'description',
        'unite_achat_id',
        'unite_usage_id',
        'facteur_personnalise',
        'produit_terrain',
        'prix_unitaire',
        'seuil_min',
        'site_id',
        'emplacement_id',
        'centre_cout',
        'cout_moyen_pondere',
        'classe_abc',
        'dernier_inventaire',
        'quantite_base',
        'actif',
    ];

    public const CATEGORIES = [
        'ENG' => 'Engrais et amendements',
        'PHY' => 'Produits phytosanitaires',
        'SEM' => 'Semences et plants',
        'ALI' => 'Aliments du bétail',
        'VET' => 'Produits vétérinaires',
        'PIE' => 'Pièces détachées',
        'OUT' => 'Outillage',
        'EPI' => 'Équipements de protection',
        'CAR' => 'Carburants et lubrifiants',
        'CON' => 'Matériaux de construction',
        'IRR' => "Matériel d'irrigation",
        'BUR' => 'Fournitures de bureau',
        'DIV' => 'Divers',
    ];

    protected function casts(): array
    {
        return [
            'prix_unitaire' => 'decimal:4',
            'seuil_min' => 'decimal:4',
            'quantite_base' => 'decimal:6',
            'facteur_personnalise' => 'decimal:6',
            'cout_moyen_pondere' => 'decimal:6',
            'dernier_inventaire' => 'date',
            'actif' => 'boolean',
        ];
    }

    /** @return BelongsTo<Unite, $this> */
    public function uniteAchat(): BelongsTo
    {
        return $this->belongsTo(Unite::class, 'unite_achat_id');
    }

    /** @return BelongsTo<Unite, $this> */
    public function uniteUsage(): BelongsTo
    {
        return $this->belongsTo(Unite::class, 'unite_usage_id');
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<Emplacement, $this> */
    public function emplacement(): BelongsTo
    {
        return $this->belongsTo(Emplacement::class);
    }

    /** @return HasMany<MouvementStock, $this> */
    public function mouvements(): HasMany
    {
        return $this->hasMany(MouvementStock::class);
    }

    public function stockUsage(): float
    {
        return $this->uniteUsage->depuisBase((float) $this->quantite_base);
    }

    public function stockAchat(): float
    {
        return $this->uniteAchat->depuisBase((float) $this->quantite_base);
    }

    public function sousSeuil(): bool
    {
        return $this->seuil_min !== null && $this->stockUsage() <= (float) $this->seuil_min;
    }

    public function valeur(): float
    {
        return $this->prix_unitaire === null ? 0.0 : $this->stockAchat() * (float) $this->prix_unitaire;
    }

    protected function resumeAudit(string $action): string
    {
        return "Article {$this->code} - {$this->libelle} - {$action}";
    }
}
