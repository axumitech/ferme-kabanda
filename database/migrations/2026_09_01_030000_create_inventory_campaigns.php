<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emplacements', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('libelle');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->string('zone', 24)->nullable();
            $table->string('type', 24)->default('casier');
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        Schema::table('articles', function (Blueprint $table): void {
            $table->foreignId('emplacement_id')->nullable()->after('site_id')->constrained('emplacements')->nullOnDelete();
            $table->decimal('cout_moyen_pondere', 14, 6)->default(0);
            $table->string('classe_abc', 1)->nullable();
            $table->date('dernier_inventaire')->nullable();
        });

        Schema::create('campagnes_inventaire', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->string('libelle');
            $table->string('type', 16)->default('tournant');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->string('perimetre')->nullable();
            $table->date('date_comptage');
            $table->string('statut', 16)->default('ouverte');
            $table->foreignId('ouvert_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('arbitre_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cloturee_le')->nullable();
            $table->decimal('ecart_valeur', 14, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::table('mouvements_stock', function (Blueprint $table): void {
            $table->foreignId('campagne_inventaire_id')->nullable()->constrained('campagnes_inventaire')->nullOnDelete();
        });

        Schema::create('lignes_inventaire', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campagne_inventaire_id')->constrained('campagnes_inventaire')->cascadeOnDelete();
            $table->foreignId('article_id')->constrained('articles')->cascadeOnDelete();
            $table->foreignId('emplacement_id')->nullable()->constrained('emplacements')->nullOnDelete();
            $table->decimal('theorique_base', 20, 6);
            $table->decimal('compte_base', 20, 6)->nullable();
            $table->decimal('recompte_base', 20, 6)->nullable();
            $table->decimal('ecart_base', 20, 6)->nullable();
            $table->decimal('ecart_valeur', 14, 2)->nullable();
            $table->string('cause', 32)->nullable();
            $table->text('observation')->nullable();
            $table->string('statut', 16)->default('a_compter');
            $table->foreignId('compte_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $table->timestamps();
            $table->unique(['campagne_inventaire_id', 'article_id'], 'uniq_ligne_inventaire_article');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_inventaire');
        Schema::table('mouvements_stock', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('campagne_inventaire_id');
        });
        Schema::dropIfExists('campagnes_inventaire');
        Schema::table('articles', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('emplacement_id');
            $table->dropColumn(['cout_moyen_pondere', 'classe_abc', 'dernier_inventaire']);
        });
        Schema::dropIfExists('emplacements');
    }
};
