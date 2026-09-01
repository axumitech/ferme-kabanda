<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('matieres_actives', function (Blueprint $table): void {
            $table->id();
            $table->string('nom')->unique();
            $table->string('famille', 24);
            $table->string('groupe_frac', 16)->nullable();
            $table->string('groupe_irac', 16)->nullable();
            $table->string('groupe_hrac', 16)->nullable();
            $table->string('mode_action')->nullable();
            $table->boolean('interdit')->default(false);
            $table->string('motif_interdiction')->nullable();
            $table->unsignedSmallInteger('dar_jours')->nullable();
            $table->unsignedSmallInteger('delai_reentree_heures')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->index(['famille', 'interdit']);
        });

        Schema::create('traitements_culture', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('plantation_id')->constrained('plantations')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('matiere_active_id')->nullable()->constrained('matieres_actives')->nullOnDelete();
            $table->string('produit');
            $table->string('lot_produit')->nullable();
            $table->decimal('dose_valeur', 10, 3)->nullable();
            $table->string('dose_unite', 24)->nullable();
            $table->decimal('planches_traitees', 10, 2)->nullable();
            $table->string('cible')->nullable();
            $table->unsignedSmallInteger('dar_jours')->nullable();
            $table->date('recolte_autorisee_le')->nullable();
            $table->boolean('epi_porte')->default(false);
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->foreignId('mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $table->foreignId('tache_id')->nullable()->constrained('taches')->nullOnDelete();
            $table->string('photo_chemin')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_nom');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['plantation_id', 'date']);
        });

        Schema::table('plantations', function (Blueprint $table): void {
            $table->date('recolte_bloquee_jusquau')->nullable()->after('statut');
        });
    }

    public function down(): void
    {
        Schema::table('plantations', fn (Blueprint $table) => $table->dropColumn('recolte_bloquee_jusquau'));
        Schema::dropIfExists('traitements_culture');
        Schema::dropIfExists('matieres_actives');
    }
};
