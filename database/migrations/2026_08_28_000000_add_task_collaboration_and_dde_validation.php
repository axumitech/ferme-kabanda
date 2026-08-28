<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedTinyInteger('niveau_hierarchie')->default(4);
        });

        Schema::create('tache_intervenants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tache_id')->constrained('taches')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 16);
            $table->timestamps();

            $table->unique(['tache_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        Schema::table('taches', function (Blueprint $table): void {
            $table->string('dde_statut', 16)->nullable();
            $table->foreignId('dde_valide_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dde_valide_le')->nullable();
            $table->string('dde_observation')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('taches', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('dde_valide_par_id');
            $table->dropColumn(['dde_statut', 'dde_valide_le', 'dde_observation']);
        });

        Schema::dropIfExists('tache_intervenants');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('niveau_hierarchie'));
    }
};
