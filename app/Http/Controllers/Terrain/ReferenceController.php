<?php

namespace App\Http\Controllers\Terrain;

use App\Enums\StatutTache;
use App\Http\Controllers\Controller;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Site;
use App\Models\Tache;
use App\Models\User;
use App\Services\FluxActiviteService;
use App\Services\VisibiliteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Paquet FKN 6 — Données que le carnet garde dans IndexedDB pour travailler
 * une journée sans couverture. La liste des tâches est volontairement commune
 * à toute l'équipe; `can_act` n'est vrai que pour les personnes autorisées.
 */
class ReferenceController extends Controller
{
    /** @var list<string> */
    private const STATUTS_OT_OUVERTS = ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'];

    public function __invoke(Request $request, FluxActiviteService $flux, VisibiliteService $visibilite): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tasks = Tache::query()
            ->with([
                'responsable:id,name',
                'site:id,code,nom',
                'departement:id,code,nom',
                'intervenants:id,tache_id,user_id,role',
            ])
            ->where('est_modele', false)
            ->where('statut', StatutTache::AFaire)
            ->whereDate('date_due', '<=', today()->addDays(30))
            ->orderBy('date_due')
            ->orderBy('heure_due')
            ->limit(400)
            ->get()
            ->map(function (Tache $task) use ($user): array {
                $isIntervenant = $task->intervenants->contains('user_id', $user->id);
                $isOwner = (int) $task->responsable_id === $user->id;
                $isUnassigned = $task->responsable_id === null;

                return [
                    'id' => $task->id,
                    'reference' => $task->reference,
                    'titre' => $task->titre,
                    'lieu' => $task->lieu,
                    'instruction' => $task->instruction,
                    'date_due' => $task->date_due->toDateString(),
                    'heure_due' => $task->heure_due,
                    'statut' => $task->statut->value,
                    'responsable' => $task->responsable?->name,
                    'site' => $task->site ? ['code' => $task->site->code, 'nom' => $task->site->nom] : null,
                    'departement' => $task->departement ? ['code' => $task->departement->code, 'nom' => $task->departement->nom] : null,
                    'mienne' => $isOwner || $isIntervenant || $isUnassigned,
                    'can_act' => $user->is_admin || $isOwner || $isIntervenant || $isUnassigned,
                ];
            })
            ->values();

        $incidentNatures = [
            ['value' => 'securite', 'label' => 'Sécurité'],
            ['value' => 'environnement', 'label' => 'Environnement'],
        ];

        if ($visibilite->peutVoir($user, 'incidents_surete')) {
            $incidentNatures[] = ['value' => 'surete', 'label' => 'Sûreté'];
        }

        return response()->json([
            'jeton' => csrf_token(),
            'reference' => [
                'sites' => Site::query()
                    ->where('actif', true)
                    ->orderBy('code')
                    ->get(['id', 'code', 'nom'])
                    ->map(fn (Site $site): array => ['id' => $site->id, 'libelle' => "{$site->code} — {$site->nom}"])
                    ->values(),
                'plantations' => Plantation::query()
                    ->with('culture:id,nom,unite_recolte')
                    ->where('statut', 'active')
                    ->orderBy('lieu')
                    ->get()
                    ->map(fn (Plantation $plantation): array => [
                        'id' => $plantation->id,
                        'libelle' => trim("{$plantation->lieu} — {$plantation->culture->nom} ({$plantation->reference})"),
                        'unite' => $plantation->culture->unite_recolte ?? $plantation->unite ?? 'kg',
                    ])
                    ->values(),
                'equipements' => Equipement::query()
                    ->where('actif', true)
                    ->orderBy('code')
                    ->get(['id', 'code', 'nom'])
                    ->map(fn (Equipement $equipement): array => [
                        'id' => $equipement->id,
                        'libelle' => "{$equipement->code} — {$equipement->nom}",
                    ])
                    ->values(),
                'infrastructures' => Infrastructure::query()
                    ->where('actif', true)
                    ->orderBy('code')
                    ->get(['id', 'code', 'nom'])
                    ->map(fn (Infrastructure $infrastructure): array => [
                        'id' => $infrastructure->id,
                        'libelle' => "{$infrastructure->code} — {$infrastructure->nom}",
                    ])
                    ->values(),
                'ordres_travail' => OrdreTravail::query()
                    ->whereIn('statut', self::STATUTS_OT_OUVERTS)
                    ->orderByDesc('demande_le')
                    ->limit(50)
                    ->get(['id', 'reference', 'objet', 'cible_libelle', 'statut'])
                    ->values(),
                'motifs' => MotifNonExecution::query()
                    ->where('actif', true)
                    ->orderBy('ordre')
                    ->orderBy('libelle')
                    ->get(['id', 'code', 'libelle', 'recevable', 'preuve_requise'])
                    ->values(),
                'canaux_recolte' => Recolte::CANAUX,
                'natures_incident' => $incidentNatures,
            ],
            'taches' => $tasks,
            'journee' => $flux->journee(today(), 60)
                ->map(fn (array $line): array => [
                    'heure' => $line['heure'],
                    'categorie' => $line['categorie'],
                    'titre' => $line['titre'],
                    'detail' => $line['detail'],
                    'par' => $line['par'],
                ])
                ->values(),
        ]);
    }
}
