<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_imports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('code_plan', 32);
            $table->string('fichier');
            $table->string('statut', 16)->default('analyse');
            $table->unsignedSmallInteger('lignes_lues')->default(0);
            $table->unsignedSmallInteger('lignes_ajout')->default(0);
            $table->unsignedSmallInteger('lignes_modif')->default(0);
            $table->unsignedSmallInteger('lignes_suppr')->default(0);
            $table->unsignedSmallInteger('lignes_identiques')->default(0);
            $table->unsignedSmallInteger('lignes_erreur')->default(0);
            $table->foreignId('importe_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('applique_le')->nullable();
            $table->foreignId('plan_resultat_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->timestamps();
            $table->index('statut');
        });

        Schema::create('plan_import_lignes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('plan_import_id')->constrained('plan_imports')->cascadeOnDelete();
            $table->unsignedSmallInteger('numero_ligne');
            $table->string('cle', 190);
            $table->string('difference', 16);
            $table->json('valeurs_actuelles')->nullable();
            $table->json('valeurs_importees')->nullable();
            $table->json('champs_modifies')->nullable();
            $table->string('erreur')->nullable();
            $table->boolean('acceptee')->nullable();
            $table->foreignId('decide_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decide_le')->nullable();
            $table->string('commentaire')->nullable();
            $table->timestamps();
            $table->index(['plan_import_id', 'difference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_import_lignes');
        Schema::dropIfExists('plan_imports');
    }
};
