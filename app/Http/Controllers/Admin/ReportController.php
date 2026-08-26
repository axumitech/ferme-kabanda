<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FarmRecord;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->is_admin, 403);

        $reports = FarmRecord::query()
            ->with('user:id,name,email')
            ->where('record_key', 'like', 'rap:%')
            ->latest('updated_at')
            ->limit(250)
            ->get()
            ->map(function (FarmRecord $record): array {
                [, $office, $date] = array_pad(explode(':', $record->record_key, 3), 3, null);
                $decoded = json_decode($record->value, true);
                $data = is_array($decoded) ? $decoded : [];
                $sections = ['travaux', 'produits', 'eau', 'recoltes', 'cheptel', 'alim', 'sante', 'problemes', 'formFreq'];
                $entries = static function (string $section) use ($data): array {
                    $value = $data[$section] ?? [];

                    return is_array($value) ? $value : [];
                };
                $entryCount = collect($sections)->sum(fn (string $section): int => count($entries($section)));

                return [
                    'id' => $record->id,
                    'office' => $office,
                    'date' => $date,
                    'user' => $record->user,
                    'entry_count' => $entryCount,
                    'problem_count' => count($entries('problemes')),
                    'harvest_total' => collect($entries('recoltes'))->sum(
                        fn (mixed $item): float => is_array($item) ? (float) ($item['kg'] ?? 0) : 0,
                    ),
                    'updated_at' => $record->updated_at?->toIso8601String(),
                    'data' => $data,
                ];
            });

        return Inertia::render('admin/reports', ['reports' => $reports]);
    }
}
