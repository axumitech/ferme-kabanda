<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\PlanImport;
use App\Models\PlanImportLigne;
use App\Models\PlanLigne;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PlanImportService
{
    public const COLONNES = [
        'code_plan', 'type_plan', 'cible', 'code_cible', 'jour_offset', 'recurrence',
        'tache', 'description', 'instruction', 'categorie', 'quantite', 'unite',
        'priorite', 'role_responsable', 'point_controle', 'preuve',
    ];

    private const OBLIGATOIRES = ['code_plan', 'tache'];

    private const RECURRENCES = ['quotidien', 'hebdomadaire', 'mensuel', 'trimestriel', 'annuel'];

    private const PRIORITES = ['urgente', 'elevee', 'normale', 'planifiee'];

    public function analyser(string $chemin, string $nomFichier, ?string $codeAttendu = null): PlanImport
    {
        $lignes = $this->lire($chemin);
        if ($lignes === []) {
            throw new RuntimeException('Fichier vide ou en-tête introuvable.');
        }

        $codePlan = mb_strtoupper(trim((string) ($lignes[0]['code_plan'] ?? '')));
        if ($codePlan === '') {
            throw new RuntimeException('La colonne « code_plan » est vide à la première ligne.');
        }
        if ($codeAttendu !== null && mb_strtoupper(trim($codeAttendu)) !== $codePlan) {
            throw new RuntimeException("Le code du formulaire ({$codeAttendu}) ne correspond pas au code du CSV ({$codePlan}).");
        }

        $enVigueur = Plan::enVigueurPour($codePlan);
        $import = PlanImport::query()->create([
            'plan_id' => $enVigueur?->id,
            'code_plan' => $codePlan,
            'fichier' => $nomFichier,
            'statut' => 'analyse',
            'lignes_lues' => count($lignes),
            'importe_par_id' => auth()->id(),
        ]);

        $actuelles = $enVigueur?->lignes()->get()->keyBy('cle') ?? collect();
        $vues = [];
        $compte = ['ajout' => 0, 'modification' => 0, 'suppression' => 0, 'identique' => 0, 'erreur' => 0];

        foreach ($lignes as $index => $brut) {
            $numero = $index + 2;
            $erreur = $this->valider($brut);
            if ($erreur !== null) {
                PlanImportLigne::query()->create([
                    'plan_import_id' => $import->id,
                    'numero_ligne' => $numero,
                    'cle' => mb_substr((string) ($brut['tache'] ?? '—'), 0, 190),
                    'difference' => 'erreur',
                    'valeurs_importees' => $brut,
                    'erreur' => $erreur,
                ]);
                $compte['erreur']++;

                continue;
            }

            $normalise = $this->normaliser($brut);
            $cle = PlanLigne::calculerCle($normalise);
            $vues[] = $cle;
            $actuelle = $actuelles->get($cle);
            $avant = $actuelle?->only(PlanLigne::CHAMPS_COMPARES);
            $modifies = $avant === null ? null : $this->champsModifies($avant, $normalise);
            $difference = $avant === null ? 'ajout' : ($modifies === [] ? 'identique' : 'modification');

            PlanImportLigne::query()->create([
                'plan_import_id' => $import->id,
                'numero_ligne' => $numero,
                'cle' => $cle,
                'difference' => $difference,
                'valeurs_actuelles' => $avant,
                'valeurs_importees' => $normalise,
                'champs_modifies' => $modifies ?: null,
                'acceptee' => $difference === 'identique' ? true : null,
            ]);
            $compte[$difference]++;
        }

        foreach ($actuelles as $cle => $actuelle) {
            if (in_array($cle, $vues, true)) {
                continue;
            }
            PlanImportLigne::query()->create([
                'plan_import_id' => $import->id,
                'numero_ligne' => 0,
                'cle' => $cle,
                'difference' => 'suppression',
                'valeurs_actuelles' => $actuelle->only(PlanLigne::CHAMPS_COMPARES),
            ]);
            $compte['suppression']++;
        }

        $import->update([
            'lignes_ajout' => $compte['ajout'],
            'lignes_modif' => $compte['modification'],
            'lignes_suppr' => $compte['suppression'],
            'lignes_identiques' => $compte['identique'],
            'lignes_erreur' => $compte['erreur'],
        ]);

        return $import->fresh();
    }

    public function decider(PlanImportLigne $ligne, bool $acceptee, ?string $commentaire = null): PlanImportLigne
    {
        if (! in_array($ligne->difference, ['ajout', 'modification', 'suppression'], true)) {
            throw new RuntimeException('Cette ligne ne demande pas de décision.');
        }
        if ($ligne->import?->statut !== 'analyse') {
            throw new RuntimeException('Cet import ne peut plus être arbitré.');
        }

        $ligne->update([
            'acceptee' => $acceptee,
            'commentaire' => $commentaire,
            'decide_par_id' => auth()->id(),
            'decide_le' => now(),
        ]);

        return $ligne->refresh();
    }

    public function appliquer(PlanImport $import, ?string $note = null): Plan
    {
        if ($import->statut !== 'analyse') {
            throw new RuntimeException('Cet import a déjà été traité.');
        }
        $enAttente = $import->enAttenteDeDecision();
        if ($enAttente > 0) {
            throw new RuntimeException("IMPORT REFUSÉ — {$enAttente} écart(s) n'ont pas été tranchés.");
        }

        return DB::transaction(function () use ($import, $note): Plan {
            $import->load('lignes');
            $ancien = $import->plan_id !== null
                ? Plan::query()->whereKey($import->plan_id)->first()
                : null;
            $nouveau = Plan::query()->create([
                'code' => $import->code_plan,
                'libelle' => $ancien !== null ? $ancien->libelle : $import->code_plan,
                'type' => $ancien !== null ? $ancien->type : 'agricole',
                'version' => $ancien !== null ? $ancien->version + 1 : 1,
                'statut' => 'en_vigueur',
                'site_id' => $ancien !== null ? $ancien->site_id : null,
                'departement_id' => $ancien !== null ? $ancien->departement_id : null,
                'date_effet' => today(),
                'approuve_par_id' => auth()->id(),
                'approuve_le' => now(),
                'note' => $note,
            ]);

            foreach ($import->lignes as $ligne) {
                $valeurs = match (true) {
                    $ligne->difference === 'identique' => $ligne->valeurs_importees,
                    $ligne->difference === 'ajout' && $ligne->acceptee => $ligne->valeurs_importees,
                    $ligne->difference === 'modification' && $ligne->acceptee => $ligne->valeurs_importees,
                    $ligne->difference === 'modification' => $ligne->valeurs_actuelles,
                    $ligne->difference === 'suppression' && ! $ligne->acceptee => $ligne->valeurs_actuelles,
                    default => null,
                };
                if ($valeurs === null) {
                    continue;
                }
                $valeurs['plan_id'] = $nouveau->id;
                $valeurs['cle'] = $ligne->cle;
                $valeurs['empreinte'] = PlanLigne::calculerEmpreinte($valeurs);
                PlanLigne::query()->create($valeurs);
            }

            if ($ancien !== null) {
                $ancien->update(['statut' => 'archive']);
            }
            $import->update(['statut' => 'applique', 'applique_le' => now(), 'plan_resultat_id' => $nouveau->id]);

            return $nouveau;
        });
    }

    public function modeleCsv(): string
    {
        $rows = [implode(';', self::COLONNES)];
        $rows[] = implode(';', ['BTAGRI', 'agricole', 'Chou', 'CHOU', '7', '', 'Fertilisation 1', 'Premier apport azoté', 'Urée 120 g/planche puis arroser', 'fertilisation', '120', 'g/planche', 'normale', 'agent', '0', 'photo']);
        $rows[] = implode(';', ['BTAGRI', 'agricole', '', '', '', 'hebdomadaire', 'Contrôle irrigation', 'Fiche signée', 'Vérifier chaque rampe', 'irrigation', '', '', 'normale', 'superviseur', '1', 'signature']);

        return "\u{FEFF}".implode("\n", $rows)."\n";
    }

    /** @return list<array<string, string|null>> */
    private function lire(string $chemin): array
    {
        if (! is_readable($chemin)) {
            throw new RuntimeException('Fichier CSV illisible.');
        }
        $contenu = file_get_contents($chemin);
        if ($contenu === false) {
            throw new RuntimeException('Impossible de lire le fichier CSV.');
        }
        $contenu = preg_replace('/^\xEF\xBB\xBF/', '', $contenu) ?? $contenu;
        $premiere = strtok($contenu, "\n");
        $premiere = is_string($premiere) ? $premiere : '';
        $separateur = substr_count($premiere, ';') >= substr_count($premiere, ',') ? ';' : ',';
        $handle = fopen('php://memory', 'r+');
        if ($handle === false) {
            throw new RuntimeException('Impossible de préparer la lecture du CSV.');
        }
        fwrite($handle, $contenu);
        rewind($handle);
        $entete = fgetcsv($handle, 0, $separateur);
        if (! is_array($entete)) {
            fclose($handle);

            return [];
        }
        $entete = array_map(fn (mixed $column): string => strtolower(trim((string) $column)), $entete);
        $lignes = [];
        while (($row = fgetcsv($handle, 0, $separateur)) !== false) {
            if (count(array_filter($row, fn (mixed $value): bool => trim((string) $value) !== '')) === 0) {
                continue;
            }
            $assoc = [];
            foreach ($entete as $index => $nom) {
                $assoc[$nom] = isset($row[$index]) ? trim((string) $row[$index]) : null;
            }
            $lignes[] = $assoc;
        }
        fclose($handle);

        return $lignes;
    }

    /** @param array<string, string|null> $line */
    private function valider(array $line): ?string
    {
        foreach (self::OBLIGATOIRES as $column) {
            if (blank($line[$column] ?? null)) {
                return "Colonne obligatoire vide : {$column}";
            }
        }
        if (blank($line['jour_offset'] ?? null) && blank($line['recurrence'] ?? null)) {
            return 'Il faut soit un jour_offset (J+), soit une récurrence.';
        }
        if (filled($line['jour_offset'] ?? null) && ! is_numeric($line['jour_offset'])) {
            return 'jour_offset doit être un nombre entier.';
        }
        if (filled($line['recurrence'] ?? null) && ! in_array(strtolower((string) $line['recurrence']), self::RECURRENCES, true)) {
            return 'Récurrence inconnue — attendu : '.implode(', ', self::RECURRENCES);
        }
        if (filled($line['priorite'] ?? null) && ! in_array(strtolower((string) $line['priorite']), self::PRIORITES, true)) {
            return 'Priorité inconnue — attendu : '.implode(', ', self::PRIORITES);
        }
        if (filled($line['quantite'] ?? null) && ! is_numeric(str_replace(',', '.', (string) $line['quantite']))) {
            return 'quantite doit être un nombre.';
        }
        if (filled($line['quantite'] ?? null) && blank($line['unite'] ?? null)) {
            return 'Une quantité exige une unité.';
        }

        return null;
    }

    /** @param array<string, string|null> $line
     * @return array<string, mixed>
     */
    private function normaliser(array $line): array
    {
        $isTrue = fn (mixed $value): bool => in_array(strtolower((string) $value), ['1', 'oui', 'x', 'true', 'vrai'], true);

        return [
            'cible' => ($line['cible'] ?? '') ?: null,
            'code_cible' => ($line['code_cible'] ?? '') ?: null,
            'jour_offset' => filled($line['jour_offset'] ?? null) ? (int) $line['jour_offset'] : null,
            'recurrence' => filled($line['recurrence'] ?? null) ? strtolower((string) $line['recurrence']) : null,
            'tache' => $line['tache'],
            'description' => ($line['description'] ?? '') ?: null,
            'instruction' => ($line['instruction'] ?? '') ?: null,
            'categorie' => ($line['categorie'] ?? '') ?: null,
            'quantite' => filled($line['quantite'] ?? null) ? (float) str_replace(',', '.', (string) $line['quantite']) : null,
            'unite' => ($line['unite'] ?? '') ?: null,
            'priorite' => filled($line['priorite'] ?? null) ? strtolower((string) $line['priorite']) : 'normale',
            'role_responsable' => ($line['role_responsable'] ?? '') ?: null,
            'point_controle' => $isTrue($line['point_controle'] ?? null),
            'preuve' => ($line['preuve'] ?? '') ?: null,
        ];
    }

    /** @param array<string, mixed> $avant
     * @param  array<string, mixed>  $apres
     * @return list<string>
     */
    private function champsModifies(array $avant, array $apres): array
    {
        $modifies = [];
        foreach (PlanLigne::CHAMPS_COMPARES as $champ) {
            $a = $avant[$champ] ?? null;
            $b = $apres[$champ] ?? null;
            if (is_bool($a) || is_bool($b)) {
                $a = (bool) $a;
                $b = (bool) $b;
            } elseif (is_numeric($a) && is_numeric($b)) {
                $a = (float) $a;
                $b = (float) $b;
            } else {
                $a = trim((string) $a);
                $b = trim((string) $b);
            }
            if ($a !== $b) {
                $modifies[] = $champ;
            }
        }

        return $modifies;
    }
}
