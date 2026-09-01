<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipements', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('nom');
            $table->string('categorie', 24);
            $table->string('marque')->nullable();
            $table->string('modele')->nullable();
            $table->string('immatriculation', 32)->nullable();
            $table->string('numero_serie', 64)->nullable();
            $table->year('annee')->nullable();
            $table->date('acquis_le')->nullable();
            $table->decimal('valeur_acquisition', 14, 2)->nullable();
            $table->string('type_compteur', 16)->default('heures');
            $table->decimal('compteur_actuel', 14, 2)->default(0);
            $table->string('carburant', 16)->nullable();
            $table->decimal('capacite_reservoir', 10, 2)->nullable();
            $table->decimal('consommation_ref', 10, 3)->nullable();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('statut', 16)->default('disponible');
            $table->string('motif_immobilisation')->nullable();
            $table->decimal('tarif_horaire', 12, 2)->nullable();
            $table->decimal('tarif_hectare', 12, 2)->nullable();
            $table->text('note')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->index(['categorie', 'statut']);
        });

        Schema::create('infrastructures', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('nom');
            $table->string('categorie', 32);
            $table->text('description')->nullable();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('parcelle_id')->nullable()->constrained('reference_items')->nullOnDelete();
            $table->string('localisation')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->year('annee_mise_en_service')->nullable();
            $table->decimal('valeur_remplacement', 14, 2)->nullable();
            $table->string('caracteristiques')->nullable();
            $table->string('etat', 16)->default('bon');
            $table->date('etat_constate_le')->nullable();
            $table->unsignedTinyInteger('criticite')->default(3);
            $table->date('derniere_inspection')->nullable();
            $table->date('prochaine_inspection')->nullable();
            $table->unsignedSmallInteger('periodicite_inspection_jours')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->index(['categorie', 'etat']);
        });

        Schema::create('entretiens_planifies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('equipement_id')->nullable()->constrained('equipements')->cascadeOnDelete();
            $table->foreignId('infrastructure_id')->nullable()->constrained('infrastructures')->cascadeOnDelete();
            $table->string('libelle');
            $table->string('type', 16)->default('preventif');
            $table->decimal('periodicite_compteur', 12, 2)->nullable();
            $table->unsignedSmallInteger('periodicite_jours')->nullable();
            $table->decimal('dernier_compteur', 14, 2)->nullable();
            $table->date('dernier_le')->nullable();
            $table->decimal('prochain_compteur', 14, 2)->nullable();
            $table->date('prochain_le')->nullable();
            $table->unsignedSmallInteger('alerte_avant_compteur')->nullable();
            $table->text('operations')->nullable();
            $table->text('pieces')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->index(['equipement_id', 'actif']);
            $table->index(['infrastructure_id', 'actif']);
        });

        Schema::create('inspections_infrastructure', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('infrastructure_id')->constrained('infrastructures')->cascadeOnDelete();
            $table->date('date');
            $table->string('etat_constate', 16);
            $table->string('etat_precedent', 16)->nullable();
            $table->text('constat');
            $table->text('actions_immediates')->nullable();
            $table->boolean('intervention_requise')->default(false);
            $table->string('photo_chemin')->nullable();
            $table->foreignId('inspecteur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('inspecteur_nom');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['infrastructure_id', 'date']);
        });

        Schema::create('ordres_travail', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->string('origine', 24);
            $table->string('type_intervention', 16)->default('correctif');
            $table->nullableMorphs('cible');
            $table->string('cible_libelle')->nullable();
            $table->string('objet');
            $table->text('description')->nullable();
            $table->text('diagnostic')->nullable();
            $table->string('priorite', 16)->default('normale');
            $table->boolean('arret_production')->default(false);
            $table->text('consequence')->nullable();
            $table->string('statut', 16)->default('demande');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('demandeur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('demandeur_nom');
            $table->timestamp('demande_le')->useCurrent();
            $table->foreignId('approuve_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approuve_le')->nullable();
            $table->text('motif_refus')->nullable();
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('prestataire')->nullable();
            $table->date('echeance')->nullable();
            $table->date('planifie_le')->nullable();
            $table->timestamp('debut_reel')->nullable();
            $table->timestamp('fin_reelle')->nullable();
            $table->decimal('immobilisation_heures', 10, 2)->nullable();
            $table->boolean('consignation_requise')->default(false);
            $table->boolean('consignation_faite')->default(false);
            $table->string('permis_travail', 32)->nullable();
            $table->string('epi_requis')->nullable();
            $table->decimal('cout_pieces', 12, 2)->default(0);
            $table->decimal('cout_main_oeuvre', 12, 2)->default(0);
            $table->decimal('cout_prestataire', 12, 2)->default(0);
            $table->decimal('cout_total', 12, 2)->default(0);
            $table->text('travaux_realises')->nullable();
            $table->text('cause_racine')->nullable();
            $table->boolean('recurrent')->default(false);
            $table->foreignId('verifie_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verifie_le')->nullable();
            $table->text('observation_verification')->nullable();
            $table->timestamp('clos_le')->nullable();
            $table->foreignId('incident_id')->nullable()->constrained('incidents')->nullOnDelete();
            $table->foreignId('tache_id')->nullable()->constrained('taches')->nullOnDelete();
            $table->foreignId('entretien_planifie_id')->nullable()->constrained('entretiens_planifies')->nullOnDelete();
            $table->foreignId('inspection_id')->nullable()->constrained('inspections_infrastructure')->nullOnDelete();
            $table->string('photo_avant')->nullable();
            $table->string('photo_apres')->nullable();
            $table->timestamps();
            $table->index(['statut', 'priorite']);
            $table->index(['echeance', 'statut']);
        });

        Schema::create('ot_pieces', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ordre_travail_id')->constrained('ordres_travail')->cascadeOnDelete();
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->string('designation');
            $table->decimal('quantite', 12, 3);
            $table->string('unite', 24)->nullable();
            $table->decimal('cout_unitaire', 12, 4)->nullable();
            $table->decimal('cout', 12, 2)->default(0);
            $table->foreignId('mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $table->string('origine_piece', 16)->default('magasin');
            $table->timestamps();
        });

        Schema::create('ot_pointages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ordre_travail_id')->constrained('ordres_travail')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('intervenant_nom');
            $table->date('date');
            $table->decimal('heures', 8, 2);
            $table->decimal('taux_horaire', 10, 2)->nullable();
            $table->decimal('cout', 12, 2)->default(0);
            $table->string('travail')->nullable();
            $table->timestamps();
        });

        Schema::create('ot_evenements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('ordre_travail_id')->constrained('ordres_travail')->cascadeOnDelete();
            $table->string('type', 24);
            $table->string('resume');
            $table->text('detail')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_nom');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['ordre_travail_id', 'created_at']);
        });

        if (DB::getDriverName() === 'sqlite') {
            // SQLite sait ajouter une colonne REFERENCES sans reconstruire la table.
            // Le Schema builder reconstruirait ici `taches` et pourrait perdre ses colonnes.
            DB::statement(
                'alter table "taches" add column "ordre_travail_id" integer null '
                .'references "ordres_travail" ("id") on delete set null'
            );

            Schema::table('taches', function (Blueprint $table): void {
                $table->index('ordre_travail_id');
            });
        } else {
            Schema::table('taches', function (Blueprint $table): void {
                $table->foreignId('ordre_travail_id')->nullable()->constrained('ordres_travail')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('taches', function (Blueprint $table): void {
                $table->dropIndex(['ordre_travail_id']);
            });
            DB::statement('alter table "taches" drop column "ordre_travail_id"');
        } else {
            Schema::table('taches', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('ordre_travail_id');
            });
        }

        Schema::dropIfExists('ot_evenements');
        Schema::dropIfExists('ot_pointages');
        Schema::dropIfExists('ot_pieces');
        Schema::dropIfExists('ordres_travail');
        Schema::dropIfExists('inspections_infrastructure');
        Schema::dropIfExists('entretiens_planifies');
        Schema::dropIfExists('infrastructures');
        Schema::dropIfExists('equipements');
    }
};
