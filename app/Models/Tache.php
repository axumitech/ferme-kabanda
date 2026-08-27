<?php

namespace App\Models;

use App\Concerns\Auditable;
use App\Enums\Priorite;
use App\Enums\SourceTache;
use App\Enums\StatutTache;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Tache extends Model
{
    use Auditable;

    protected $fillable = [
        'reference',
        'source',
        'origine_type',
        'origine_id',
        'titre',
        'description',
        'instruction',
        'departement_id',
        'site_id',
        'lieu',
        'responsable_id',
        'cree_par_id',
        'date_due',
        'heure_due',
        'priorite',
        'statut',
        'recurrence',
        'modele_id',
        'est_modele',
        'fait_le',
        'fait_par_id',
        'quantite',
        'unite',
        'commentaire',
        'photo_chemin',
        'motif_id',
        'motif_precision',
        'justifie_le',
        'justifie_par_id',
        'motif_valide',
        'valide_par_id',
        'escalade_niveau',
        'escalade_le',
        'dde_reference',
    ];

    protected function casts(): array
    {
        return [
            'source' => SourceTache::class,
            'priorite' => Priorite::class,
            'statut' => StatutTache::class,
            'date_due' => 'date',
            'fait_le' => 'datetime',
            'justifie_le' => 'datetime',
            'escalade_le' => 'datetime',
            'est_modele' => 'boolean',
            'motif_valide' => 'boolean',
            'quantite' => 'decimal:4',
        ];
    }

    /** @return BelongsTo<Departement, $this> */
    public function departement(): BelongsTo
    {
        return $this->belongsTo(Departement::class);
    }

    /** @return BelongsTo<Site, $this> */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** @return BelongsTo<User, $this> */
    public function responsable(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    /** @return BelongsTo<User, $this> */
    public function createur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cree_par_id');
    }

    /** @return BelongsTo<MotifNonExecution, $this> */
    public function motif(): BelongsTo
    {
        return $this->belongsTo(MotifNonExecution::class, 'motif_id');
    }

    /** @return MorphTo<Model, $this> */
    public function origine(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return HasMany<TacheEvenement, $this> */
    public function evenements(): HasMany
    {
        return $this->hasMany(TacheEvenement::class)->orderBy('created_at');
    }

    /** @param Builder<Tache> $query */
    public function scopeOuvertes(Builder $query): void
    {
        $query->where('statut', StatutTache::AFaire);
    }

    /** @param Builder<Tache> $query */
    public function scopeDuJour(Builder $query, mixed $date = null): void
    {
        $query->whereDate('date_due', $date ?? today());
    }

    /** @param Builder<Tache> $query */
    public function scopeEnRetard(Builder $query): void
    {
        $query->ouvertes()->whereDate('date_due', '<', today());
    }

    public function estEnRetard(): bool
    {
        $statut = $this->getAttribute('statut');
        $dateDue = $this->getAttribute('date_due');

        return $statut === StatutTache::AFaire
            && $dateDue instanceof CarbonInterface
            && $dateDue->isBefore(today());
    }

    public function joursDeRetard(): int
    {
        $dateDue = $this->getAttribute('date_due');

        return $this->estEnRetard() && $dateDue instanceof CarbonInterface
            ? (int) $dateDue->diffInDays(today())
            : 0;
    }

    public function escaladeDue(): bool
    {
        $priorite = $this->getAttribute('priorite');

        return $priorite instanceof Priorite
            && $this->joursDeRetard() > $priorite->delaiEscalade();
    }

    /** @param array<string, mixed> $donnees */
    public function journaliserEvenement(string $type, string $resume, array $donnees = []): void
    {
        $user = auth()->user();

        $this->evenements()->create([
            'type' => $type,
            'user_id' => $user?->id,
            'user_nom' => $user instanceof User ? $user->name : 'système',
            'resume' => $resume,
            'donnees' => $donnees ?: null,
        ]);
    }

    protected function resumeAudit(string $action): string
    {
        return "{$this->reference} - {$this->titre} - {$action}";
    }
}
