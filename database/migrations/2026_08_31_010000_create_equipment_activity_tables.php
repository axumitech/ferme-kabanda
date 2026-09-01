<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('travaux_equipement', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('equipement_id')->constrained('equipements')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('operateur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operateur_nom');
            $table->time('heure_debut')->nullable();
            $table->time('heure_fin')->nullable();
            $table->decimal('duree_heures', 8, 2)->nullable();
            $table->decimal('compteur_debut', 14, 2)->nullable();
            $table->decimal('compteur_fin', 14, 2)->nullable();
            $table->decimal('compteur_parcouru', 12, 2)->nullable();
            $table->string('nature', 16)->default('interne');
            $table->string('travail');
            // Le parcellaire actuel est porté par le référentiel partagé.
            $table->foreignId('parcelle_id')->nullable()->constrained('reference_items')->nullOnDelete();
            $table->decimal('surface_travaillee', 12, 2)->nullable();
            $table->string('destination')->nullable();
            $table->string('client_libre')->nullable();
            $table->decimal('carburant_litres', 10, 2)->nullable();
            $table->foreignId('mouvement_carburant_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $table->decimal('cout_carburant', 12, 2)->nullable();
            $table->decimal('montant_facture', 14, 2)->nullable();
            $table->string('devise', 3)->default('USD');
            $table->foreignId('tache_id')->nullable()->constrained('taches')->nullOnDelete();
            $table->text('observation')->nullable();
            $table->text('anomalie')->nullable();
            $table->string('photo_chemin')->nullable();
            $table->string('statut', 16)->default('saisi');
            $table->timestamps();
            $table->index(['equipement_id', 'date']);
        });

        Schema::create('interventions_equipement', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('equipement_id')->constrained('equipements')->cascadeOnDelete();
            $table->foreignId('entretien_planifie_id')->nullable()->constrained('entretiens_planifies')->nullOnDelete();
            $table->date('date');
            $table->string('type', 16);
            $table->decimal('compteur', 14, 2)->nullable();
            $table->text('description');
            $table->text('pieces_utilisees')->nullable();
            $table->decimal('cout_pieces', 12, 2)->nullable();
            $table->decimal('cout_main_oeuvre', 12, 2)->nullable();
            $table->string('prestataire')->nullable();
            $table->decimal('immobilisation_heures', 10, 2)->nullable();
            $table->foreignId('realise_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('realise_par_nom')->nullable();
            $table->string('photo_chemin')->nullable();
            $table->timestamps();
            $table->index(['equipement_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interventions_equipement');
        Schema::dropIfExists('travaux_equipement');
    }
};
