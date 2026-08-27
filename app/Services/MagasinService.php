<?php

namespace App\Services;

use App\Enums\TypeMouvement;
use App\Models\Article;
use App\Models\MouvementStock;
use App\Models\Unite;
use App\Support\Conversion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MagasinService
{
    public function entree(Article $article, float $quantite, Unite $unite, string $motif, ?Model $origine = null, ?float $valeur = null): MouvementStock
    {
        return $this->ecrire($article, TypeMouvement::Entree, $quantite, $unite, $motif, $origine, $valeur);
    }

    public function sortie(Article $article, float $quantite, Unite $unite, string $motif, ?Model $origine = null): MouvementStock
    {
        $base = Conversion::versBasePourArticle($article, $quantite, $unite);

        if ($base > (float) $article->quantite_base) {
            throw new RuntimeException("Stock insuffisant pour {$article->code}.");
        }

        return $this->ecrire($article, TypeMouvement::Sortie, $quantite, $unite, $motif, $origine);
    }

    public function inventaire(Article $article, float $compte, Unite $unite, string $observation = ''): MouvementStock
    {
        $baseCompte = Conversion::versBasePourArticle($article, $compte, $unite);
        $ecart = $baseCompte - (float) $article->quantite_base;
        $type = $ecart >= 0 ? TypeMouvement::Entree : TypeMouvement::Sortie;

        return $this->ecrire(
            $article,
            $type,
            abs($unite->depuisBase($ecart)),
            $unite,
            'Inventaire physique - écart constaté'.($observation ? ' : '.$observation : ''),
        );
    }

    public function annuler(MouvementStock $mouvement, string $motif): MouvementStock
    {
        if ($mouvement->annule_mouvement_id) {
            throw new RuntimeException('Ce mouvement est déjà une annulation.');
        }

        if (MouvementStock::query()->where('annule_mouvement_id', $mouvement->id)->exists()) {
            throw new RuntimeException('Ce mouvement a déjà été annulé.');
        }

        $inverse = $mouvement->type === TypeMouvement::Sortie->value ? TypeMouvement::Entree : TypeMouvement::Sortie;

        return $this->ecrire(
            $mouvement->article,
            $inverse,
            (float) $mouvement->quantite,
            $mouvement->unite,
            "Annulation du mouvement #{$mouvement->id} - {$motif}",
            annule: $mouvement->id,
        );
    }

    protected function ecrire(
        Article $article,
        TypeMouvement $type,
        float $quantite,
        Unite $unite,
        string $motif,
        ?Model $origine = null,
        ?float $valeur = null,
        ?int $annule = null,
    ): MouvementStock {
        if (! $unite->estCompatible($article->uniteUsage)) {
            throw new RuntimeException("Unité incompatible pour {$article->code}.");
        }

        return DB::transaction(function () use ($article, $type, $quantite, $unite, $motif, $origine, $valeur, $annule): MouvementStock {
            $base = Conversion::versBasePourArticle($article, $quantite, $unite) * $type->signe();
            $user = auth()->user();
            $userName = $user ? $user->name : 'système';

            $mouvement = MouvementStock::query()->create([
                'article_id' => $article->id,
                'type' => $type->value,
                'quantite' => $quantite,
                'unite_id' => $unite->id,
                'quantite_base' => $base,
                'motif' => $motif,
                'origine_type' => $origine ? $origine::class : null,
                'origine_id' => $origine?->getKey(),
                'site_id' => $article->site_id,
                'centre_cout' => $article->centre_cout,
                'valeur' => $valeur,
                'user_id' => $user?->id,
                'user_nom' => $userName,
                'annule_mouvement_id' => $annule,
            ]);

            $article->quantite_base = (float) MouvementStock::query()
                ->where('article_id', $article->id)
                ->sum('quantite_base');
            $article->saveQuietly();

            return $mouvement;
        }, 3);
    }

    public function recalculerTout(): int
    {
        $count = 0;

        Article::query()->chunkById(200, function ($articles) use (&$count): void {
            foreach ($articles as $article) {
                $article->quantite_base = (float) MouvementStock::query()
                    ->where('article_id', $article->id)
                    ->sum('quantite_base');
                $article->saveQuietly();
                $count++;
            }
        });

        return $count;
    }
}
