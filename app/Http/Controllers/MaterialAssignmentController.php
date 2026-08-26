<?php

namespace App\Http\Controllers;

use App\Models\MaterialAssignment;
use App\Models\ReferenceItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaterialAssignmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['assignments' => $this->legacyAssignments($request->user())]);
    }

    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'assignments' => ['required', 'array', 'max:1000'],
            'assignments.*.id' => ['required', 'string', 'max:80', 'distinct'],
            'assignments.*.agent' => ['required', 'string', 'max:180'],
            'assignments.*.type' => ['required', 'string', 'max:180'],
            'assignments.*.taille' => ['nullable', 'string', 'max:30'],
            'assignments.*.remise' => ['required', 'date_format:Y-m-d'],
            'assignments.*.expire' => ['nullable', 'date_format:Y-m-d'],
            'assignments.*.motif' => ['nullable', 'string', 'max:1000'],
            'assignments.*.remisPar' => ['nullable', 'string', 'max:180'],
            'assignments.*.remplace' => ['required', 'boolean'],
            'assignments.*.finMotif' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            $user = $request->user();
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            foreach ($validated['assignments'] as $assignment) {
                MaterialAssignment::query()->updateOrCreate(
                    ['user_id' => $user->id, 'legacy_key' => $assignment['id']],
                    [
                        'assignee_reference_item_id' => ReferenceItem::query()
                            ->whereIn('category', ['agents_agri', 'agents_ani'])
                            ->where('label', $assignment['agent'])->value('id'),
                        'material_reference_item_id' => ReferenceItem::query()
                            ->where('category', 'epi_types')
                            ->where('label', $assignment['type'])->value('id'),
                        'actor_user_id' => $user->id,
                        'assignee_name' => $assignment['agent'],
                        'material_name' => $assignment['type'],
                        'size' => $assignment['taille'] ?? null,
                        'assigned_on' => $assignment['remise'],
                        'expires_on' => $assignment['expire'] ?? null,
                        'issued_by_name' => $assignment['remisPar'] ?? null,
                        'is_replaced' => $assignment['remplace'],
                        'assignment_reason' => $assignment['motif'] ?? null,
                        'end_reason' => $assignment['finMotif'] ?? null,
                    ],
                );
            }
        }, 3);

        return $this->index($request);
    }

    /** @return list<array<string, mixed>> */
    private function legacyAssignments(User $user): array
    {
        return array_values(MaterialAssignment::query()
            ->whereBelongsTo($user)
            ->orderByDesc('assigned_on')
            ->orderByDesc('id')
            ->get()
            ->map(fn (MaterialAssignment $assignment): array => [
                'id' => $assignment->legacy_key,
                'agent' => $assignment->assignee_name,
                'type' => $assignment->material_name,
                'taille' => $assignment->size ?? '',
                'remise' => $assignment->assigned_on->toDateString(),
                'expire' => $assignment->expires_on?->toDateString(),
                'motif' => $assignment->assignment_reason ?? '',
                'remisPar' => $assignment->issued_by_name ?? '—',
                'remplace' => $assignment->is_replaced,
                'finMotif' => $assignment->end_reason,
            ])->values()->all());
    }
}
