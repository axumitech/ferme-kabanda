<?php

namespace App\Support;

use InvalidArgumentException;

final class Montant
{
    private const SUBDIVISIONS = ['USD' => 100, 'CDF' => 1];

    private function __construct(
        public readonly int $unites,
        public readonly string $devise,
    ) {}

    public static function zero(string $devise = 'USD'): self
    {
        return new self(0, self::verifier($devise));
    }

    public static function de(int|float|string|null $valeur, string $devise = 'USD'): self
    {
        $devise = self::verifier($devise);

        if ($valeur === null || $valeur === '') {
            return new self(0, $devise);
        }

        $normalise = number_format((float) $valeur, self::decimales($devise), '.', '');

        return new self((int) round((float) $normalise * self::facteur($devise)), $devise);
    }

    public static function centimes(int $unites, string $devise = 'USD'): self
    {
        return new self($unites, self::verifier($devise));
    }

    public function plus(self $autre): self
    {
        $this->memeDevise($autre);

        return new self($this->unites + $autre->unites, $this->devise);
    }

    public function moins(self $autre): self
    {
        $this->memeDevise($autre);

        return new self($this->unites - $autre->unites, $this->devise);
    }

    public function fois(int|float|string $quantite): self
    {
        return new self((int) round($this->unites * (float) $quantite), $this->devise);
    }

    public function versDevise(string $cible, float $taux): self
    {
        $cible = self::verifier($cible);
        if ($cible === $this->devise) {
            return $this;
        }
        if ($taux <= 0) {
            throw new InvalidArgumentException('Le taux de change doit être strictement positif.');
        }

        $value = $this->decimal();

        return self::de($this->devise === 'USD' ? $value * $taux : $value / $taux, $cible);
    }

    public function decimal(): float
    {
        return $this->unites / self::facteur($this->devise);
    }

    public function estZero(): bool
    {
        return $this->unites === 0;
    }

    public function estNegatif(): bool
    {
        return $this->unites < 0;
    }

    public function plusGrandQue(self $autre): bool
    {
        $this->memeDevise($autre);

        return $this->unites > $autre->unites;
    }

    /** @param iterable<int|float|string|null|self> $montants */
    public static function somme(iterable $montants, string $devise = 'USD'): self
    {
        $total = self::zero($devise);

        foreach ($montants as $montant) {
            $total = $total->plus($montant instanceof self ? $montant : self::de($montant, $devise));
        }

        return $total;
    }

    public function formate(): string
    {
        return number_format($this->decimal(), self::decimales($this->devise), ',', ' ').' '.$this->devise;
    }

    public function __toString(): string
    {
        return $this->formate();
    }

    private static function verifier(string $devise): string
    {
        $devise = strtoupper($devise);

        if (! isset(self::SUBDIVISIONS[$devise])) {
            throw new InvalidArgumentException("Devise non gérée : {$devise}. Attendu USD ou CDF.");
        }

        return $devise;
    }

    private static function facteur(string $devise): int
    {
        return self::SUBDIVISIONS[$devise];
    }

    private static function decimales(string $devise): int
    {
        return self::SUBDIVISIONS[$devise] === 1 ? 0 : 2;
    }

    private function memeDevise(self $autre): void
    {
        if ($autre->devise !== $this->devise) {
            throw new InvalidArgumentException(
                "Opération impossible entre {$this->devise} et {$autre->devise} sans conversion.",
            );
        }
    }
}
