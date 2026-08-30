<?php

namespace App\Http\Controllers;

use App\Models\FarmRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FarmRecordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $prefix = Validator::make(
            ['prefix' => $request->string('prefix')->toString()],
            ['prefix' => ['nullable', 'string', 'max:190']],
        )->validate()['prefix'] ?? '';

        // farm_records est le magasin de compatibilité du vieux carnet : une
        // ligne est un document JSON complet, unique par (utilisateur, clé), et
        // non un registre append-only. Le présenter comme partagé reviendrait à
        // choisir arbitrairement le document d'un collègue et cacher les autres.
        // Les données réellement communes passent par les tables normalisées,
        // le registre et les API terrain dédiées.
        $keys = FarmRecord::query()
            ->whereBelongsTo($request->user())
            ->when($prefix !== '', fn ($query) => $query->where('record_key', 'like', $prefix.'%'))
            ->orderBy('record_key')
            ->pluck('record_key');

        return response()->json(['keys' => $keys]);
    }

    public function show(Request $request, string $recordKey): JsonResponse
    {
        $recordKey = $this->validatedKey($recordKey);
        $record = FarmRecord::query()
            ->whereBelongsTo($request->user())
            ->where('record_key', $recordKey)
            ->first();

        return response()->json($record ? ['value' => $record->value] : null);
    }

    public function store(Request $request, string $recordKey): JsonResponse
    {
        $recordKey = $this->validatedKey($recordKey);
        $validated = $request->validate([
            'value' => ['required', 'string', 'json', 'max:2000000'],
        ]);

        $now = now();
        FarmRecord::query()->upsert(
            [[
                'user_id' => $request->user()->id,
                'record_key' => $recordKey,
                'value' => $validated['value'],
                'created_at' => $now,
                'updated_at' => $now,
            ]],
            ['user_id', 'record_key'],
            ['value', 'updated_at'],
        );

        $record = FarmRecord::query()
            ->whereBelongsTo($request->user())
            ->where('record_key', $recordKey)
            ->firstOrFail();

        return response()->json([
            'value' => $record->value,
            'updated_at' => $record->updated_at?->toIso8601String(),
        ]);
    }

    private function validatedKey(string $recordKey): string
    {
        return Validator::make(
            ['record_key' => $recordKey],
            ['record_key' => ['required', 'string', 'max:190', Rule::notIn(['articles', 'stock', 'epi_dotations'])]],
        )->validate()['record_key'];
    }
}
