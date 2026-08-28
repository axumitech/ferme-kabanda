<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $t): void {
            $t->id();
            $t->string('code', 32);
            $t->string('libelle');
            $t->string('type', 24);
            $t->unsignedSmallInteger('version')->default(1);
            $t->string('statut', 16)->default('brouillon');
            $t->foreignId('site_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('departement_id')->nullable()->constrained()->nullOnDelete();
            $t->date('date_effet')->nullable();
            $t->foreignId('approuve_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('approuve_le')->nullable();
            $t->text('note')->nullable();
            $t->timestamps();
            $t->unique(['code', 'version']);
            $t->index(['code', 'statut']);
        });
        Schema::create('plan_lignes', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $t->string('cle', 190)->index();
            $t->string('cible')->nullable();
            $t->string('code_cible', 32)->nullable();
            $t->integer('jour_offset')->nullable();
            $t->string('recurrence', 16)->nullable();
            $t->string('tache');
            $t->text('description')->nullable();
            $t->text('instruction')->nullable();
            $t->string('categorie', 32)->nullable();
            $t->decimal('quantite', 16, 4)->nullable();
            $t->string('unite', 24)->nullable();
            $t->string('priorite', 16)->default('normale');
            $t->string('role_responsable', 32)->nullable();
            $t->boolean('point_controle')->default(false);
            $t->string('preuve', 32)->nullable();
            $t->string('empreinte', 64);
            $t->timestamps();
        });
        Schema::create('cultures', function (Blueprint $t): void {
            $t->id();
            $t->string('code', 24)->unique();
            $t->string('nom');
            $t->string('famille', 48)->nullable();
            $t->unsignedTinyInteger('delai_rotation')->nullable();
            $t->string('unite_recolte', 24)->default('kg');
            $t->string('unite_travail', 24)->default('planches');
            $t->unsignedSmallInteger('jours_maturite')->nullable();
            $t->text('note')->nullable();
            $t->boolean('actif')->default(true);
            $t->timestamps();
        });
        Schema::create('plantations', function (Blueprint $t): void {
            $t->id();
            $t->string('reference', 24)->unique();
            $t->foreignId('culture_id')->constrained();
            $t->foreignId('site_id')->nullable()->constrained()->nullOnDelete();
            $t->string('lieu');
            $t->date('j0');
            $t->decimal('quantite', 12, 2)->nullable();
            $t->string('unite', 24)->nullable();
            $t->string('statut', 16)->default('active');
            $t->date('fin_le')->nullable();
            $t->string('fin_motif')->nullable();
            $t->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $t->foreignId('cree_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->text('note')->nullable();
            $t->timestamps();
            $t->index(['lieu', 'statut']);
        });
        Schema::create('recoltes', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('plantation_id')->constrained()->cascadeOnDelete();
            $t->date('date');
            $t->decimal('quantite', 12, 2);
            $t->string('unite', 24);
            $t->string('qualite', 24)->nullable();
            $t->string('canal_commercial', 48);
            $t->decimal('pertes', 12, 2)->nullable();
            $t->decimal('valeur', 14, 2)->nullable();
            $t->foreignId('tache_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('user_nom');
            $t->timestamp('created_at')->useCurrent();
        });
        Schema::create('seuils_autorisation', function (Blueprint $t): void {
            $t->id();
            $t->unsignedTinyInteger('niveau');
            $t->string('libelle');
            $t->string('type_operation', 24)->default('depense');
            $t->decimal('montant_max', 14, 2)->nullable();
            $t->boolean('valide_par_direction')->default(false);
            $t->timestamps();
            $t->unique(['niveau', 'type_operation']);
        });
        Schema::create('requisitions', function (Blueprint $t): void {
            $t->id();
            $t->string('reference', 24)->unique();
            $t->string('type', 8);
            $t->foreignId('article_id')->nullable()->constrained()->nullOnDelete();
            $t->decimal('quantite', 16, 4)->nullable();
            $t->foreignId('unite_id')->nullable()->constrained()->nullOnDelete();
            $t->string('nouvel_article')->nullable();
            $t->decimal('montant', 14, 2)->nullable();
            $t->decimal('valeur', 14, 2)->default(0);
            $t->string('objet');
            $t->text('justification')->nullable();
            $t->foreignId('site_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('departement_id')->nullable()->constrained()->nullOnDelete();
            $t->string('statut', 16)->default('demandee');
            $t->unsignedTinyInteger('niveau_requis')->default(3);
            $t->foreignId('demandeur_id')->nullable()->constrained('users')->nullOnDelete();
            $t->foreignId('verifie_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('verifie_le')->nullable();
            $t->foreignId('approuve_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('approuve_le')->nullable();
            $t->foreignId('servi_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('servi_le')->nullable();
            $t->string('motif_refus')->nullable();
            $t->foreignId('tache_service_id')->nullable()->constrained('taches')->nullOnDelete();
            $t->foreignId('mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $t->timestamps();
        });
        Schema::create('categories_incident', function (Blueprint $t): void {
            $t->id();
            $t->string('code', 16)->unique();
            $t->string('libelle');
            $t->text('definition');
            $t->text('exemples')->nullable();
            $t->unsignedTinyInteger('gravite');
            $t->string('nature', 16);
            $t->boolean('investigation_obligatoire')->default(false);
            $t->boolean('remontee_siege')->default(false);
            $t->timestamps();
        });
        Schema::create('incidents', function (Blueprint $t): void {
            $t->id();
            $t->string('reference', 24)->unique();
            $t->string('nature', 16);
            $t->foreignId('categorie_id')->nullable()->constrained('categories_incident')->nullOnDelete();
            $t->foreignId('categorie_finale_id')->nullable()->constrained('categories_incident')->nullOnDelete();
            $t->timestamp('survenu_le');
            $t->timestamp('signale_le')->nullable();
            $t->foreignId('site_id')->nullable()->constrained()->nullOnDelete();
            $t->string('lieu')->nullable();
            $t->foreignId('departement_id')->nullable()->constrained()->nullOnDelete();
            $t->text('description');
            $t->text('actions_immediates')->nullable();
            $t->decimal('cout_estime', 14, 2)->nullable();
            $t->timestamp('echeance_classification')->nullable();
            $t->timestamp('echeance_investigation')->nullable();
            $t->timestamp('echeance_siege')->nullable();
            $t->timestamp('classifie_le')->nullable();
            $t->foreignId('classifie_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('confirme_le')->nullable();
            $t->json('cinq_pourquoi')->nullable();
            $t->text('cause_racine')->nullable();
            $t->string('statut', 24)->default('signale');
            $t->foreignId('declare_par_id')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('cloture_le')->nullable();
            $t->timestamps();
        });
        Schema::create('incident_actions', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('incident_id')->constrained()->cascadeOnDelete();
            $t->string('type', 16);
            $t->text('action');
            $t->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $t->date('echeance');
            $t->foreignId('tache_id')->nullable()->constrained()->nullOnDelete();
            $t->string('statut', 16)->default('ouverte');
            $t->timestamps();
        });
        Schema::table('taches', function (Blueprint $t): void {
            $t->foreignId('plantation_id')->nullable()->constrained('plantations')->nullOnDelete();
            $t->foreignId('plan_ligne_id')->nullable()->constrained('plan_lignes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('taches', fn (Blueprint $t) => [$t->dropConstrainedForeignId('plantation_id'), $t->dropConstrainedForeignId('plan_ligne_id')]);
        Schema::dropIfExists('incident_actions');
        Schema::dropIfExists('incidents');
        Schema::dropIfExists('categories_incident');
        Schema::dropIfExists('requisitions');
        Schema::dropIfExists('seuils_autorisation');
        Schema::dropIfExists('recoltes');
        Schema::dropIfExists('plantations');
        Schema::dropIfExists('cultures');
        Schema::dropIfExists('plan_lignes');
        Schema::dropIfExists('plans');
    }
};
