<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', fn (Blueprint $table) => $table->boolean('active')->default(true)->index());
        Schema::table('product_stocks', fn (Blueprint $table) => $table->boolean('active')->default(true)->index());

        Schema::create('material_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assignee_reference_item_id')->nullable()->constrained('reference_items')->nullOnDelete();
            $table->foreignId('material_reference_item_id')->nullable()->constrained('reference_items')->nullOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('legacy_key', 80);
            $table->string('assignee_name', 180);
            $table->string('material_name', 180);
            $table->string('size', 30)->nullable();
            $table->date('assigned_on');
            $table->date('expires_on')->nullable();
            $table->string('issued_by_name', 180)->nullable();
            $table->boolean('is_replaced')->default(false);
            $table->text('assignment_reason')->nullable();
            $table->text('end_reason')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'legacy_key']);
            $table->index(['user_id', 'assignee_name']);
            $table->index(['is_replaced', 'expires_on']);
        });

        DB::table('farm_records')
            ->where('record_key', 'epi_dotations')
            ->orderBy('id')
            ->each(function (object $record): void {
                $row = (array) $record;
                $assignments = json_decode((string) $row['value'], true);
                if (! is_array($assignments)) {
                    return;
                }

                foreach ($assignments as $assignment) {
                    if (! is_array($assignment) || blank($assignment['agent'] ?? null) || blank($assignment['type'] ?? null)) {
                        continue;
                    }

                    $assigneeName = (string) $assignment['agent'];
                    $materialName = (string) $assignment['type'];
                    DB::table('material_assignments')->insert([
                        'user_id' => $row['user_id'],
                        'assignee_reference_item_id' => DB::table('reference_items')
                            ->whereIn('category', ['agents_agri', 'agents_ani'])
                            ->where('label', $assigneeName)
                            ->value('id'),
                        'material_reference_item_id' => DB::table('reference_items')
                            ->where('category', 'epi_types')
                            ->where('label', $materialName)
                            ->value('id'),
                        'actor_user_id' => $row['user_id'],
                        'legacy_key' => mb_substr((string) ($assignment['id'] ?? uniqid('epi-', true)), 0, 80),
                        'assignee_name' => mb_substr($assigneeName, 0, 180),
                        'material_name' => mb_substr($materialName, 0, 180),
                        'size' => filled($assignment['taille'] ?? null) ? mb_substr((string) $assignment['taille'], 0, 30) : null,
                        'assigned_on' => $assignment['remise'] ?? now()->toDateString(),
                        'expires_on' => $assignment['expire'] ?? null,
                        'issued_by_name' => filled($assignment['remisPar'] ?? null) ? mb_substr((string) $assignment['remisPar'], 0, 180) : null,
                        'is_replaced' => (bool) ($assignment['remplace'] ?? false),
                        'assignment_reason' => filled($assignment['motif'] ?? null) ? $assignment['motif'] : null,
                        'end_reason' => filled($assignment['finMotif'] ?? null) ? $assignment['finMotif'] : null,
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                    ]);
                }

                DB::table('farm_records')->where('id', $row['id'])->delete();
            });
    }

    public function down(): void
    {
        DB::table('material_assignments')
            ->select('user_id')
            ->distinct()
            ->pluck('user_id')
            ->each(function (mixed $userId): void {
                $assignments = DB::table('material_assignments')
                    ->where('user_id', $userId)
                    ->orderByDesc('assigned_on')
                    ->get()
                    ->map(fn (object $assignment): array => [
                        'id' => $assignment->legacy_key,
                        'agent' => $assignment->assignee_name,
                        'type' => $assignment->material_name,
                        'taille' => $assignment->size ?? '',
                        'remise' => $assignment->assigned_on,
                        'expire' => $assignment->expires_on,
                        'motif' => $assignment->assignment_reason ?? '',
                        'remisPar' => $assignment->issued_by_name ?? '—',
                        'remplace' => (bool) $assignment->is_replaced,
                        'finMotif' => $assignment->end_reason,
                    ])
                    ->all();

                $now = now();
                DB::table('farm_records')->upsert([[
                    'user_id' => $userId,
                    'record_key' => 'epi_dotations',
                    'value' => json_encode($assignments, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]], ['user_id', 'record_key'], ['value', 'updated_at']);
            });

        Schema::dropIfExists('material_assignments');
        Schema::table('product_stocks', fn (Blueprint $table) => $table->dropColumn('active'));
        Schema::table('inventory_items', fn (Blueprint $table) => $table->dropColumn('active'));
    }
};
