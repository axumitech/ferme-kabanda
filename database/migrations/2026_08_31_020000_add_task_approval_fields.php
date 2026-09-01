<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('taches', function (Blueprint $table): void {
            $table->string('statut_approbation', 20)->default('approuvee')->after('statut');
            $table->timestamp('soumise_le')->nullable()->after('statut_approbation');
            $table->foreignId('approuve_par_id')->nullable()->after('soumise_le')->constrained('users')->nullOnDelete();
            $table->timestamp('approuve_le')->nullable()->after('approuve_par_id');
            $table->text('motif_refus')->nullable()->after('approuve_le');
            $table->text('justification_demande')->nullable()->after('motif_refus');
            $table->decimal('cout_estime', 14, 2)->nullable()->after('justification_demande');
            $table->index(['statut_approbation', 'date_due']);
        });
    }

    public function down(): void
    {
        Schema::table('taches', function (Blueprint $table): void {
            $table->dropForeign(['approuve_par_id']);
            $table->dropIndex(['statut_approbation', 'date_due']);
            $table->dropColumn([
                'statut_approbation',
                'soumise_le',
                'approuve_par_id',
                'approuve_le',
                'motif_refus',
                'justification_demande',
                'cout_estime',
            ]);
        });
    }
};
