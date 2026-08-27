<?php

namespace App\Support;

use App\Models\Article;
use App\Models\Unite;
use InvalidArgumentException;

class Conversion
{
    public static function convertir(float $quantite, Unite $de, Unite $vers): float
    {
        if (! $de->estCompatible($vers)) {
            throw new InvalidArgumentException("Conversion impossible : {$de->code} vers {$vers->code}.");
        }

        return $vers->depuisBase($de->versBase($quantite));
    }

    public static function versBasePourArticle(Article $article, float $quantite, Unite $unite): float
    {
        if ($article->facteur_personnalise !== null && $unite->conditionnement) {
            return $quantite * (float) $article->facteur_personnalise;
        }

        return $unite->versBase($quantite);
    }
}
