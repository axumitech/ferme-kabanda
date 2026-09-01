<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('postes_controle', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('nom');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        Schema::create('patrouilles', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->date('date');
            $table->string('tour', 16);
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('agent_nom');
            $table->string('equipe')->nullable();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->dateTime('debut');
            $table->dateTime('fin')->nullable();
            $table->unsignedSmallInteger('points_prevus')->default(0);
            $table->unsignedSmallInteger('points_faits')->default(0);
            $table->boolean('ras')->default(true);
            $table->text('observations')->nullable();
            $table->string('statut', 16)->default('en_cours');
            $table->timestamps();
            $table->index(['date', 'tour']);
            $table->index('statut');
        });

        Schema::create('passages_patrouille', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patrouille_id')->constrained('patrouilles')->cascadeOnDelete();
            $table->foreignId('poste_controle_id')->constrained('postes_controle')->cascadeOnDelete();
            $table->dateTime('passe_le');
            $table->string('etat', 16)->default('conforme');
            $table->text('constat')->nullable();
            $table->string('photo_chemin')->nullable();
            $table->string('gps', 48)->nullable();
            $table->timestamps();
            $table->unique(['patrouille_id', 'poste_controle_id', 'passe_le'], 'uniq_passage_patrouille');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passages_patrouille');
        Schema::dropIfExists('patrouilles');
        Schema::dropIfExists('postes_controle');
    }
};
