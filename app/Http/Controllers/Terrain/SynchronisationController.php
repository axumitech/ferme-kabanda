<?php

namespace App\Http\Controllers\Terrain;

use App\Enums\StatutTache;
use App\Http\Controllers\Controller;
use App\Models\Equipement;
use App\Models\Infrastructure;
use App\Models\JournalAudit;
use App\Models\MotifNonExecution;
use App\Models\OrdreTravail;
use App\Models\Plantation;
use App\Models\Recolte;
use App\Models\Tache;
use App\Models\User;
use App\Services\IncidentService;
use App\Services\OrdreTravailService;
use App\Services\PlantationService;
use App\Services\TacheService;
use App\Services\VisibiliteService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Paquet FKN 6 — Reçoit la file IndexedDB du terrain.
 *
 * La clé UUID fournie par l'appareil rend chaque écriture idempotente. Les
 * services métier restent l'unique porte d'entrée : le carnet ne contourne ni
 * les règles de clôture, ni l'autorisation d'une tâche, ni les validations.
 */
class SynchronisationController extends Controller
{
    /** @var list<string> */
    private const STATUTS_OT_OUVERTS = ['demande', 'approuve', 'planifie', 'en_cours', 'realise', 'verifie'];

    public function __construct(private readonly VisibiliteService $visibilite) {}

    public function __invoke(Request $request): JsonResponse
    {
        $resultats = [];

        foreach ($this->enregistrementsValides($request) as $record) {
            $resultats[] = $this->traiter($record, $request);
        }

        return response()->json(['resultats' => $resultats]);
    }

    /**
     * Convertit le payload HTTP validé en formes PHP explicites, afin que la
     * synchronisation ne traite jamais une structure ambigüe reçue du réseau.
     *
     * @return list<array{uuid: string, type: 'tache_faite'|'tache_non_faite'|'recolte'|'incident'|'ordre_travail', donnees: array<string, mixed>, appareil?: string, saisi_le?: string, gps?: array<string, mixed>}>
     */
    private function enregistrementsValides(Request $request): array
    {
        $validated = $request->validate([
            'enregistrements' => ['required', 'array', 'max:200'],
            'enregistrements.*.uuid' => ['required', 'string', 'max:64'],
            'enregistrements.*.type' => ['required', 'string', Rule::in([
                'tache_faite',
                'tache_non_faite',
                'recolte',
                'incident',
                'ordre_travail',
            ])],
            'enregistrements.*.donnees' => ['required', 'array'],
            'enregistrements.*.appareil' => ['nullable', 'string', 'max:64'],
            'enregistrements.*.saisi_le' => ['nullable', 'date'],
            'enregistrements.*.gps' => ['nullable', 'array'],
            'enregistrements.*.gps.lat' => ['nullable', 'numeric', 'between:-90,90'],
            'enregistrements.*.gps.lon' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $enregistrements = $validated['enregistrements'] ?? null;
        if (! is_array($enregistrements)) {
            throw ValidationException::withMessages(['enregistrements' => 'La file terrain est invalide.']);
        }

        $records = [];
        foreach ($enregistrements as $enregistrement) {
            if (! is_array($enregistrement)
                || ! is_string($enregistrement['uuid'] ?? null)
                || ! is_string($enregistrement['type'] ?? null)
                || ! is_array($enregistrement['donnees'] ?? null)
            ) {
                throw ValidationException::withMessages(['enregistrements' => 'Une saisie terrain est invalide.']);
            }

            $type = $enregistrement['type'];
            if (! in_array($type, ['tache_faite', 'tache_non_faite', 'recolte', 'incident', 'ordre_travail'], true)) {
                throw ValidationException::withMessages(['enregistrements' => 'Le type de saisie terrain est inconnu.']);
            }

            $record = [
                'uuid' => $enregistrement['uuid'],
                'type' => $type,
                'donnees' => $enregistrement['donnees'],
            ];
            if (is_string($enregistrement['appareil'] ?? null)) {
                $record['appareil'] = $enregistrement['appareil'];
            }
            if (is_string($enregistrement['saisi_le'] ?? null)) {
                $record['saisi_le'] = $enregistrement['saisi_le'];
            }
            if (is_array($enregistrement['gps'] ?? null)) {
                $record['gps'] = $enregistrement['gps'];
            }

            $records[] = $record;
        }

        return $records;
    }

    /**
     * @param  array{uuid: string, type: 'tache_faite'|'tache_non_faite'|'recolte'|'incident'|'ordre_travail', donnees: array<string, mixed>, appareil?: string, saisi_le?: string, gps?: array<string, mixed>}  $record
     * @return array{uuid: string, accepte: bool, message: string}
     */
    private function traiter(array $record, Request $request): array
    {
        $uuid = $record['uuid'];
        $alreadyReceived = false;

        try {
            DB::transaction(function () use ($record, $request, $uuid, &$alreadyReceived): void {
                if (JournalAudit::query()->where('reference_externe', $uuid)->exists()) {
                    $alreadyReceived = true;

                    return;
                }

                $user = $request->user();
                if (! $user instanceof User) {
                    throw new AuthorizationException('Votre session terrain a expiré. Connectez-vous à nouveau.');
                }

                $data = $record['donnees'];

                match ($record['type']) {
                    'tache_faite' => $this->tacheFaite($data, $user),
                    'tache_non_faite' => $this->tacheNonFaite($data, $user),
                    'recolte' => $this->recolte($data),
                    'incident' => $this->incident($data, $user),
                    'ordre_travail' => $this->ordreTravail($data),
                };

                JournalAudit::query()->create([
                    'user_id' => $user->id,
                    'user_nom' => $user->name,
                    'user_matricule' => $user->matricule,
                    'action' => 'synchro_terrain',
                    'resume' => 'Saisie terrain — '.$record['type'],
                    'apres' => $data,
                    'ip' => $request->ip(),
                    'agent' => substr((string) $request->userAgent(), 0, 255),
                    'reference_externe' => $uuid,
                    'appareil' => $record['appareil'] ?? null,
                    'saisi_le' => isset($record['saisi_le']) ? Carbon::parse($record['saisi_le']) : null,
                    'gps' => $this->gps($record),
                ]);
            });

            return [
                'uuid' => $uuid,
                'accepte' => true,
                'message' => $alreadyReceived ? 'Déjà reçu.' : 'Enregistré.',
            ];
        } catch (QueryException $exception) {
            // Deux envois simultanés peuvent atteindre l'unique contrainte en
            // même temps. Le second est aussi un succès : le premier a écrit.
            if (JournalAudit::query()->where('reference_externe', $uuid)->exists()) {
                return ['uuid' => $uuid, 'accepte' => true, 'message' => 'Déjà reçu.'];
            }

            report($exception);

            return ['uuid' => $uuid, 'accepte' => false, 'message' => 'La saisie n’a pas pu être enregistrée. Réessayez après actualisation du carnet.'];
        } catch (AuthorizationException $exception) {
            return ['uuid' => $uuid, 'accepte' => false, 'message' => $exception->getMessage()];
        } catch (ValidationException $exception) {
            return [
                'uuid' => $uuid,
                'accepte' => false,
                'message' => collect($exception->errors())->flatten()->first() ?? 'Les données de la saisie sont invalides.',
            ];
        } catch (Throwable $exception) {
            report($exception);

            return [
                'uuid' => $uuid,
                'accepte' => false,
                'message' => 'Cette saisie ne peut pas être enregistrée pour le moment. Réessayez plus tard.',
            ];
        }
    }

    /** @param array<string, mixed> $data */
    private function tacheFaite(array $data, User $user): void
    {
        $data = Validator::make($data, [
            'tache_id' => ['required', 'integer', 'exists:taches,id'],
            'quantite' => ['nullable', 'numeric', 'min:0'],
            'unite' => ['nullable', 'string', 'max:40'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ])->validate();

        $task = Tache::query()->findOrFail((int) $data['tache_id']);
        $this->authorizeTaskAction($task, $user);
        $this->ensureOpen($task);

        app(TacheService::class)->marquerFaite($task, array_filter([
            'quantite' => $data['quantite'] ?? null,
            'unite' => $data['unite'] ?? null,
            'commentaire' => $data['commentaire'] ?? null,
        ], fn (mixed $value): bool => $value !== null && $value !== ''));
    }

    /** @param array<string, mixed> $data */
    private function tacheNonFaite(array $data, User $user): void
    {
        $motifData = Validator::make($data, [
            'motif_id' => [
                'required',
                'integer',
                Rule::exists('motifs_non_execution', 'id')->where('actif', true),
            ],
        ])->validate();

        $motif = MotifNonExecution::query()
            ->whereKey((int) $motifData['motif_id'])
            ->where('actif', true)
            ->firstOrFail();
        $estPanne = mb_strtoupper(trim($motif->code)) === 'PANNE';

        $data = Validator::make($data, [
            'tache_id' => ['required', 'integer', 'exists:taches,id'],
            'motif_id' => [
                'required',
                'integer',
                Rule::exists('motifs_non_execution', 'id')->where('actif', true),
            ],
            'motif_precision' => ['nullable', 'string', $estPanne ? 'max:150' : 'max:180'],
            'ordre_travail_id' => [
                Rule::requiredIf($estPanne),
                Rule::prohibitedIf(! $estPanne),
                'nullable',
                'integer',
                Rule::exists('ordres_travail', 'id')
                    ->where(fn ($query) => $query->whereIn('statut', self::STATUTS_OT_OUVERTS)),
            ],
        ], [
            'ordre_travail_id.required' => 'Le motif PANNE exige un ordre de travail ouvert.',
            'ordre_travail_id.prohibited' => 'Un ordre de travail ne peut être lié qu’au motif PANNE.',
            'ordre_travail_id.exists' => 'L’ordre de travail sélectionné est introuvable ou n’est plus ouvert.',
        ])->validate();

        $task = Tache::query()->findOrFail((int) $data['tache_id']);
        $this->authorizeTaskAction($task, $user);
        $this->ensureOpen($task);

        $ordre = $estPanne
            ? OrdreTravail::query()
                ->whereKey((int) $data['ordre_travail_id'])
                ->whereIn('statut', self::STATUTS_OT_OUVERTS)
                ->firstOrFail()
            : null;
        $precision = trim(implode(' ', array_filter([
            $ordre?->reference,
            $data['motif_precision'] ?? null,
        ], fn ($value): bool => filled($value))));

        DB::transaction(function () use ($task, $ordre, $motif, $precision): void {
            if ($ordre) {
                $task->forceFill(['ordre_travail_id' => $ordre->id])->saveQuietly();
            }

            app(TacheService::class)->justifier($task, $motif, $precision !== '' ? $precision : null);
        });
    }

    /** @param array<string, mixed> $data */
    private function recolte(array $data): void
    {
        $data = Validator::make($data, [
            'plantation_id' => ['required', 'integer', 'exists:plantations,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'quantite' => ['required', 'numeric', 'gt:0'],
            'unite' => ['nullable', 'string', 'max:24'],
            'qualite' => ['nullable', 'string', 'max:24'],
            'canal_commercial' => ['required', 'string', Rule::in(Recolte::CANAUX)],
            'pertes' => ['nullable', 'numeric', 'min:0'],
        ])->validate();

        $plantation = Plantation::query()->where('statut', 'active')->findOrFail((int) $data['plantation_id']);
        app(PlantationService::class)->recolter($plantation, $data);
    }

    /** @param array<string, mixed> $data */
    private function incident(array $data, User $user): void
    {
        $data = Validator::make($data, [
            'nature' => ['required', Rule::in(['securite', 'surete', 'environnement'])],
            'survenu_le' => ['required', 'date'],
            'description' => ['required', 'string', 'max:5000'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'lieu' => ['nullable', 'string', 'max:180'],
            'departement_id' => ['nullable', 'integer', 'exists:departements,id'],
            'actions_immediates' => ['nullable', 'string', 'max:2000'],
        ])->validate();

        if ($data['nature'] === 'surete' && ! $this->visibilite->peutVoir($user, 'incidents_surete')) {
            throw new AuthorizationException('Un incident de sûreté doit être transmis par une personne habilitée.');
        }

        app(IncidentService::class)->declarer($data);
    }

    /** @param array<string, mixed> $data */
    private function ordreTravail(array $data): void
    {
        $data = Validator::make($data, [
            'cible_type' => ['nullable', 'string', Rule::in(['equipement', 'infrastructure'])],
            'cible_id' => ['nullable', 'integer', 'min:1'],
            'objet' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'site_id' => [
                'nullable',
                'integer',
                Rule::exists('sites', 'id')->where('actif', true),
            ],
            'priorite' => ['required', 'string', Rule::in(['basse', 'normale', 'elevee', 'urgente'])],
            'arret_production' => ['required', 'boolean'],
            'consequence' => ['nullable', 'string', 'max:2000'],
            'consignation_requise' => ['required', 'boolean'],
            'permis_travail' => ['required', 'string', Rule::in(['aucun', 'hauteur', 'chaud', 'electrique', 'espace_confine'])],
            'epi_requis' => ['nullable', 'string', 'max:255'],
        ])->validate();

        $targetType = $data['cible_type'] ?? null;
        $targetId = $data['cible_id'] ?? null;

        if (($targetType === null) !== ($targetId === null)) {
            throw ValidationException::withMessages([
                'cible' => 'La nature et la cible de la panne doivent être renseignées ensemble.',
            ]);
        }

        $target = match ($targetType) {
            'equipement' => Equipement::query()->where('actif', true)->find((int) $targetId),
            'infrastructure' => Infrastructure::query()->where('actif', true)->find((int) $targetId),
            default => null,
        };

        if ($targetType !== null && $target === null) {
            throw ValidationException::withMessages([
                'cible' => 'L’équipement ou l’infrastructure sélectionné n’est plus actif.',
            ]);
        }

        unset($data['cible_type'], $data['cible_id']);

        app(OrdreTravailService::class)->demander(array_merge($data, [
            'origine' => 'demande',
            'type_intervention' => 'correctif',
        ]), $target);
    }

    private function authorizeTaskAction(Tache $task, User $user): void
    {
        $isIntervenant = $task->intervenants()->where('user_id', $user->id)->exists();
        $allowed = $user->is_admin
            || $task->responsable_id === $user->id
            || $isIntervenant
            || $task->responsable_id === null;

        if (! $allowed) {
            throw new AuthorizationException('Cette tâche appartient à un autre responsable. Vous pouvez la consulter, pas la clôturer.');
        }
    }

    private function ensureOpen(Tache $task): void
    {
        if ($task->statut !== StatutTache::AFaire) {
            throw new \RuntimeException('Cette tâche a déjà reçu une réponse. Actualisez le carnet avant de la modifier.');
        }
    }

    /** @param array<string, mixed> $record */
    private function gps(array $record): ?string
    {
        $gps = $record['gps'] ?? null;

        if (! is_array($gps) || ! array_key_exists('lat', $gps) || ! array_key_exists('lon', $gps)) {
            return null;
        }

        return round((float) $gps['lat'], 5).','.round((float) $gps['lon'], 5);
    }
}
