<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sites')) {
            Schema::create('sites', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 12)->unique();
                $table->string('nom');
                $table->string('type', 24)->default('ferme');
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('departements')) {
            Schema::create('departements', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 12)->unique();
                $table->string('nom');
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });
        }

        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'matricule')) {
                $table->string('matricule', 24)->nullable()->unique()->after('id');
            }

            if (! Schema::hasColumn('users', 'fonction')) {
                $table->string('fonction')->nullable();
            }

            if (! Schema::hasColumn('users', 'site_id')) {
                $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'departement_id')) {
                $table->foreignId('departement_id')->nullable()->constrained('departements')->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'actif')) {
                $table->boolean('actif')->default(true);
            }

            if (! Schema::hasColumn('users', 'derniere_connexion_at')) {
                $table->timestamp('derniere_connexion_at')->nullable();
            }
        });

        if (! Schema::hasTable('numerotations')) {
            Schema::create('numerotations', function (Blueprint $table): void {
                $table->id();
                $table->string('cle', 12);
                $table->unsignedSmallInteger('annee');
                $table->unsignedTinyInteger('mois')->nullable();
                $table->unsignedInteger('dernier')->default(0);
                $table->timestamps();
                $table->unique(['cle', 'annee', 'mois']);
            });
        }

        if (! Schema::hasTable('journal_audit')) {
            Schema::create('journal_audit', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('user_nom');
                $table->string('user_matricule', 24)->nullable();
                $table->string('action', 32);
                $table->string('auditable_type')->nullable();
                $table->unsignedBigInteger('auditable_id')->nullable();
                $table->string('resume')->nullable();
                $table->json('avant')->nullable();
                $table->json('apres')->nullable();
                $table->string('ip', 45)->nullable();
                $table->string('agent')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['auditable_type', 'auditable_id']);
                $table->index(['user_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('motifs_non_execution')) {
            Schema::create('motifs_non_execution', function (Blueprint $table): void {
                $table->id();
                $table->string('code', 32)->unique();
                $table->string('libelle');
                $table->boolean('recevable');
                $table->string('preuve_requise', 32)->default('aucune');
                $table->string('article_reglement', 64)->nullable();
                $table->unsignedTinyInteger('ordre')->default(0);
                $table->boolean('actif')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('taches')) {
            Schema::create('taches', function (Blueprint $table): void {
                $table->id();
                $table->string('reference', 24)->unique();
                $table->string('source', 32);
                $table->nullableMorphs('origine');
                $table->string('titre');
                $table->text('description')->nullable();
                $table->text('instruction')->nullable();
                $table->foreignId('departement_id')->nullable()->constrained('departements')->nullOnDelete();
                $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
                $table->string('lieu')->nullable();
                $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('cree_par_id')->nullable()->constrained('users')->nullOnDelete();
                $table->date('date_due');
                $table->time('heure_due')->nullable();
                $table->string('priorite', 16)->default('normale');
                $table->string('statut', 32)->default('a_faire');
                $table->string('recurrence', 16)->nullable();
                $table->foreignId('modele_id')->nullable()->constrained('taches')->nullOnDelete();
                $table->boolean('est_modele')->default(false);
                $table->timestamp('fait_le')->nullable();
                $table->foreignId('fait_par_id')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('quantite', 16, 4)->nullable();
                $table->string('unite', 40)->nullable();
                $table->text('commentaire')->nullable();
                $table->string('photo_chemin')->nullable();
                $table->foreignId('motif_id')->nullable()->constrained('motifs_non_execution')->nullOnDelete();
                $table->string('motif_precision')->nullable();
                $table->timestamp('justifie_le')->nullable();
                $table->foreignId('justifie_par_id')->nullable()->constrained('users')->nullOnDelete();
                $table->boolean('motif_valide')->nullable();
                $table->foreignId('valide_par_id')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedTinyInteger('escalade_niveau')->default(0);
                $table->timestamp('escalade_le')->nullable();
                $table->string('dde_reference', 24)->nullable();
                $table->timestamps();
                $table->index(['responsable_id', 'date_due', 'statut']);
                $table->index(['departement_id', 'date_due', 'statut']);
                $table->index(['statut', 'date_due']);
            });
        }

        if (! Schema::hasTable('tache_evenements')) {
            Schema::create('tache_evenements', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tache_id')->constrained('taches')->cascadeOnDelete();
                $table->string('type', 32);
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('user_nom');
                $table->string('resume');
                $table->json('donnees')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->index(['tache_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('clotures_journalieres')) {
            Schema::create('clotures_journalieres', function (Blueprint $table): void {
                $table->id();
                $table->date('date');
                $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
                $table->foreignId('departement_id')->constrained('departements')->cascadeOnDelete();
                $table->unsignedSmallInteger('dues')->default(0);
                $table->unsignedSmallInteger('faites')->default(0);
                $table->unsignedSmallInteger('justifiees')->default(0);
                $table->unsignedSmallInteger('non_justifiees')->default(0);
                $table->boolean('verrouillee')->default(false);
                $table->timestamp('cloturee_at')->nullable();
                $table->foreignId('cloturee_par_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('observation')->nullable();
                $table->timestamps();
                $table->unique(['date', 'site_id', 'departement_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('clotures_journalieres');
        Schema::dropIfExists('tache_evenements');
        Schema::dropIfExists('taches');
        Schema::dropIfExists('motifs_non_execution');
        Schema::dropIfExists('journal_audit');
        Schema::dropIfExists('numerotations');

        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'site_id')) {
                $table->dropConstrainedForeignId('site_id');
            }

            if (Schema::hasColumn('users', 'departement_id')) {
                $table->dropConstrainedForeignId('departement_id');
            }

            foreach (['matricule', 'fonction', 'actif', 'derniere_connexion_at'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('departements');
        Schema::dropIfExists('sites');
    }
};
