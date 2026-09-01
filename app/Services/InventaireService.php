<?php

namespace App\Services;

use App\Enums\TypeMouvement;
use App\Models\Article;
use App\Models\CampagneInventaire;
use App\Models\LigneInventaire;
use App\Models\MouvementStock;
use App\Support\Conversion;
use App\Support\Numerotation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventaireService
{
    public const SEUIL_RECOMPTAGE = 5.0;

    public const SEUIL_VALEUR = 50.0;

    /** @param array<string, mixed> $data */
    public function ouvrir(array $data): CampagneInventaire
    {
        return DB::transaction(function () use ($data): CampagneInventaire {
            $perimeter = collect([
                filled($data['categorie'] ?? null) ? 'catégorie '.Article::CATEGORIES[$data['categorie']] : null,
                filled($data['classe_abc'] ?? null) ? 'classe ABC '.$data['classe_abc'] : null,
                filled($data['emplacement_id'] ?? null) ? 'emplacement #'.$data['emplacement_id'] : null,
            ])->filter()->implode(' · ');

            $campaign = CampagneInventaire::query()->create([
                'reference' => Numerotation::suivant('INV', true),
                'libelle' => $data['libelle'],
                'type' => $data['type'] ?? 'tournant',
                'site_id' => $data['site_id'] ?? null,
                'perimetre' => $perimeter ?: null,
                'date_comptage' => Carbon::parse($data['date_comptage'] ?? today()),
                'statut' => 'ouverte',
                'ouvert_par_id' => auth()->id(),
                'note' => $data['note'] ?? null,
            ]);

            $articles = Article::query()->where('actif', true)
                ->when(filled($data['categorie'] ?? null), fn ($query) => $query->where('categorie', $data['categorie']))
                ->when(filled($data['classe_abc'] ?? null), fn ($query) => $query->where('classe_abc', $data['classe_abc']))
                ->when(filled($data['site_id'] ?? null), fn ($query) => $query->where('site_id', $data['site_id']))
                ->when(filled($data['emplacement_id'] ?? null), fn ($query) => $query->where('emplacement_id', $data['emplacement_id']))
                ->get();

            if ($articles->isEmpty()) {
                throw new RuntimeException('Aucun article dans ce périmètre : la campagne serait vide.');
            }

            foreach ($articles as $article) {
                LigneInventaire::query()->create([
                    'campagne_inventaire_id' => $campaign->id,
                    'article_id' => $article->id,
                    'emplacement_id' => $article->getAttribute('emplacement_id'),
                    'theorique_base' => $article->getAttribute('quantite_base'),
                    'statut' => 'a_compter',
                ]);
            }

            return $campaign->fresh();
        });
    }

    public function compter(LigneInventaire $line, float $counted, ?string $observation = null, bool $recount = false): LigneInventaire
    {
        $line->loadMissing(['campagne', 'article.uniteUsage', 'article.uniteAchat']);
        if (in_array($line->campagne->statut, ['arbitree', 'cloturee'], true)) {
            throw new RuntimeException('Cette campagne est déjà arbitrée : le comptage est clos.');
        }
        if ($recount && $line->statut !== 'a_recompter') {
            throw new RuntimeException('Cette ligne ne demande pas de second comptage.');
        }

        $base = Conversion::versBasePourArticle($line->article, $counted, $line->article->uniteUsage);
        $variance = round($base - (float) $line->theorique_base, 6);
        $unitCost = $this->coutParUniteBase($line->article);
        $requiresRecount = $this->exigeRecomptage($line, $variance, $unitCost) && ! $recount;

        $line->update([
            $recount ? 'recompte_base' : 'compte_base' => $base,
            'ecart_base' => $variance,
            'ecart_valeur' => round($unitCost * $variance, 2),
            'observation' => $observation ?: $line->observation,
            'compte_par_id' => auth()->id(),
            'statut' => $requiresRecount ? 'a_recompter' : 'compte',
        ]);

        if ($line->campagne->statut === 'ouverte' && $line->campagne->lignes()->whereNull('compte_base')->doesntExist()) {
            $line->campagne->update(['statut' => 'comptee']);
        }

        return $line->fresh();
    }

    public function arbitrer(LigneInventaire $line, string $cause, ?string $observation = null): LigneInventaire
    {
        $line->loadMissing(['campagne', 'article']);
        if ($line->compte_base === null) {
            throw new RuntimeException('Cette ligne n’a pas encore été comptée.');
        }
        if ($line->statut === 'a_recompter' && $line->recompte_base === null) {
            throw new RuntimeException('Un second comptage est exigé avant l’arbitrage de cet écart.');
        }
        if (! array_key_exists($cause, LigneInventaire::CAUSES)) {
            throw new RuntimeException('La cause de l’écart n’est pas reconnue.');
        }
        if ($line->compte_par_id === auth()->id() && (auth()->user()->niveau_hierarchie ?? 4) > 2) {
            throw new RuntimeException('Le compteur ne peut pas arbitrer son propre comptage.');
        }

        $line->update(['cause' => $cause, 'observation' => $observation ?: $line->observation, 'statut' => 'valide']);

        $campaign = $line->campagne;
        $unresolved = $campaign->lignes()->whereNotNull('compte_base')->where('ecart_base', '!=', 0)->where('statut', '!=', 'valide')->exists();
        if (! $unresolved && $campaign->lignes()->whereNull('compte_base')->doesntExist()) {
            $campaign->update(['statut' => 'arbitree']);
        }

        return $line->fresh();
    }

    public function cloturer(CampagneInventaire $campaign): CampagneInventaire
    {
        if ($campaign->statut === 'cloturee') {
            throw new RuntimeException('Cet inventaire est déjà clôturé.');
        }
        if ((auth()->user()->niveau_hierarchie ?? 4) > 2) {
            throw new RuntimeException('Seuls la Direction et le Management clôturent un inventaire.');
        }
        $uncounted = $campaign->lignes()->whereNull('compte_base')->count();
        if ($uncounted > 0) {
            throw new RuntimeException("{$uncounted} ligne(s) non comptée(s).");
        }
        $unresolved = $campaign->lignes()->where('ecart_base', '!=', 0)->where('statut', '!=', 'valide')->count();
        if ($unresolved > 0) {
            throw new RuntimeException("{$unresolved} écart(s) sans cause arbitrée.");
        }

        return DB::transaction(function () use ($campaign): CampagneInventaire {
            $totalValue = 0.0;
            foreach ($campaign->lignes()->where('ecart_base', '!=', 0)->with(['article.uniteUsage'])->get() as $line) {
                $realBase = (float) ($line->recompte_base ?? $line->compte_base);
                $article = $line->article;
                $movement = app(MagasinService::class)->inventaire(
                    $article,
                    $article->uniteUsage->depuisBase($realBase),
                    $article->uniteUsage,
                    (LigneInventaire::CAUSES[$line->cause] ?? $line->cause).($line->observation ? ' : '.$line->observation : ''),
                    $campaign,
                );
                $line->update(['mouvement_id' => $movement->id]);
                $totalValue += (float) $line->ecart_valeur;
            }

            Article::query()->whereIn('id', $campaign->lignes()->pluck('article_id'))
                ->update(['dernier_inventaire' => $campaign->date_comptage]);

            $campaign->update([
                'statut' => 'cloturee', 'arbitre_par_id' => auth()->id(),
                'cloturee_le' => now(), 'ecart_valeur' => round($totalValue, 2),
            ]);

            return $campaign->fresh();
        });
    }

    /** @return array{A: int, B: int, C: int} */
    public function classerAbc(): array
    {
        $consumption = MouvementStock::query()->where('type', TypeMouvement::Sortie->value)
            ->where('created_at', '>=', today()->subYear())
            ->selectRaw('article_id, SUM(ABS(quantite_base)) as quantity')
            ->groupBy('article_id')->pluck('quantity', 'article_id');

        $ranked = Article::query()->where('actif', true)->with('uniteAchat')->get()->map(function (Article $article) use ($consumption): array {
            return ['article' => $article, 'value' => (float) ($consumption[$article->id] ?? 0) * $this->coutParUniteBase($article)];
        })->sortByDesc('value')->values();
        $total = (float) $ranked->sum('value');
        $cumulative = 0.0;
        $counts = ['A' => 0, 'B' => 0, 'C' => 0];

        foreach ($ranked as $item) {
            $shareBefore = $cumulative / max($total, PHP_FLOAT_MIN);
            $class = $item['value'] <= 0 ? 'C' : ($shareBefore < 0.80 ? 'A' : ($shareBefore < 0.95 ? 'B' : 'C'));
            $item['article']->forceFill(['classe_abc' => $class])->saveQuietly();
            if ($class === 'A') {
                $counts['A']++;
            } elseif ($class === 'B') {
                $counts['B']++;
            } else {
                $counts['C']++;
            }
            $cumulative += $item['value'];
        }

        return $counts;
    }

    private function exigeRecomptage(LigneInventaire $line, float $variance, float $unitCost): bool
    {
        if ($variance === 0.0) {
            return false;
        }
        $theoretical = (float) $line->theorique_base;
        $rate = $theoretical !== 0.0 ? abs($variance / $theoretical * 100) : 100.0;

        return $rate >= self::SEUIL_RECOMPTAGE || abs($variance * $unitCost) >= self::SEUIL_VALEUR;
    }

    private function coutParUniteBase(Article $article): float
    {
        $weighted = (float) ($article->getAttribute('cout_moyen_pondere') ?? 0);
        if ($weighted > 0) {
            return $weighted;
        }
        $price = (float) ($article->getAttribute('prix_unitaire') ?? 0);
        $purchaseUnit = $article->relationLoaded('uniteAchat') ? $article->uniteAchat : $article->uniteAchat()->first();

        return $purchaseUnit && (float) $purchaseUnit->vers_base > 0 ? $price / (float) $purchaseUnit->vers_base : 0.0;
    }
}
