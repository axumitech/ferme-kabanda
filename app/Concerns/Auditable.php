<?php

namespace App\Concerns;

use App\Models\JournalAudit;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    /** @var list<string> */
    protected array $auditIgnore = ['updated_at', 'created_at', 'remember_token', 'password'];

    protected static function bootAuditable(): void
    {
        static::created(fn ($model) => $model->journaliser('cree', null, $model->attributesToArray()));

        static::updated(function ($model): void {
            $before = [];
            $after = [];

            foreach ($model->getChanges() as $key => $value) {
                if (in_array($key, $model->auditIgnore, true)) {
                    continue;
                }

                $before[$key] = $model->getOriginal($key);
                $after[$key] = $value;
            }

            if ($after !== []) {
                $model->journaliser('modifie', $before, $after);
            }
        });

        static::deleted(fn ($model) => $model->journaliser('supprime', $model->attributesToArray(), null));
    }

    /**
     * @param  array<string, mixed>|null  $avant
     * @param  array<string, mixed>|null  $apres
     */
    public function journaliser(string $action, ?array $avant = null, ?array $apres = null, ?string $resume = null): void
    {
        $user = Auth::user();
        $request = request();

        JournalAudit::query()->create([
            'user_id' => $user?->id,
            'user_nom' => $user instanceof User ? $user->name : 'système',
            'user_matricule' => $user instanceof User ? $user->matricule : null,
            'action' => $action,
            'auditable_type' => static::class,
            'auditable_id' => $this->getKey(),
            'resume' => $resume ?? $this->resumeAudit($action),
            'avant' => $avant,
            'apres' => $apres,
            'ip' => $request->ip(),
            'agent' => substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    protected function resumeAudit(string $action): string
    {
        return class_basename(static::class).' #'.$this->getKey().' - '.$action;
    }
}
