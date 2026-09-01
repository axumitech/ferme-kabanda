<?php

namespace App\Services;

use App\Models\PassagePatrouille;
use App\Models\Patrouille;
use App\Models\PosteControle;
use App\Models\User;
use App\Support\Numerotation;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PatrouilleService
{
    /** @param array<string, mixed> $data */
    public function ouvrir(array $data): Patrouille
    {
        $agent = User::query()->whereKey($data['agent_id'])->first();
        if ($agent === null) {
            throw new RuntimeException('Agent introuvable.');
        }
        $ouverte = Patrouille::query()
            ->where('agent_id', $agent->id)
            ->where('statut', 'en_cours')
            ->first();

        if ($ouverte !== null) {
            throw new RuntimeException("La patrouille {$ouverte->reference} de {$ouverte->agent_nom} est encore ouverte. Clôturez-la avant d'en ouvrir une autre.");
        }

        $pointsPrevus = PosteControle::query()
            ->where('actif', true)
            ->when($data['site_id'] ?? null, fn ($query, $siteId) => $query->where('site_id', $siteId))
            ->count();

        return Patrouille::query()->create([
            'reference' => Numerotation::suivant('PAT', true),
            'date' => $data['date'],
            'tour' => $data['tour'],
            'agent_id' => $agent->id,
            'agent_nom' => $agent->name,
            'equipe' => $data['equipe'] ?? null,
            'site_id' => $data['site_id'] ?? null,
            'debut' => now(),
            'points_prevus' => $pointsPrevus,
            'statut' => 'en_cours',
        ]);
    }

    /** @param array<string, mixed> $data */
    public function pointer(Patrouille $patrouille, PosteControle $poste, array $data): PassagePatrouille
    {
        if ($patrouille->statut !== 'en_cours') {
            throw new RuntimeException("La patrouille {$patrouille->reference} est déjà clôturée.");
        }
        if ($patrouille->site_id !== null && $poste->site_id !== null && $patrouille->site_id !== $poste->site_id) {
            throw new RuntimeException("Ce poste de contrôle n'appartient pas au site de la patrouille.");
        }
        if ($data['etat'] === 'anomalie' && blank($data['constat'] ?? null)) {
            throw new RuntimeException('Décrivez obligatoirement l’anomalie constatée.');
        }

        return DB::transaction(function () use ($patrouille, $poste, $data): PassagePatrouille {
            $passage = PassagePatrouille::query()->create([
                'patrouille_id' => $patrouille->id,
                'poste_controle_id' => $poste->id,
                'passe_le' => now(),
                'etat' => $data['etat'],
                'constat' => $data['constat'] ?? null,
                'photo_chemin' => $data['photo_chemin'] ?? null,
            ]);

            $patrouille->update([
                'points_faits' => $patrouille->passages()->distinct('poste_controle_id')->count('poste_controle_id'),
                'ras' => $patrouille->ras && $data['etat'] === 'conforme',
            ]);

            return $passage;
        });
    }

    public function cloturer(Patrouille $patrouille, ?string $observations): Patrouille
    {
        if ($patrouille->statut !== 'en_cours') {
            throw new RuntimeException('Cette patrouille est déjà clôturée.');
        }

        $patrouille->update([
            'fin' => now(),
            'observations' => $observations,
            'statut' => $patrouille->points_faits >= $patrouille->points_prevus ? 'terminee' : 'incomplete',
        ]);

        return $patrouille->refresh();
    }
}
