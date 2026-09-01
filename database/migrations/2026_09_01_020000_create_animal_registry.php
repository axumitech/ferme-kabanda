<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loges', function (Blueprint $table): void {
            $table->id();
            $table->string('atelier');
            $table->string('numero', 16);
            $table->string('type', 32);
            $table->unsignedSmallInteger('capacite')->nullable();
            $table->unsignedTinyInteger('rangee')->default(1);
            $table->unsignedTinyInteger('position')->default(1);
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->unique(['atelier', 'numero']);
        });

        Schema::create('animaux', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('espece', 16);
            $table->string('categorie', 48);
            $table->string('ligne', 16)->nullable();
            $table->string('cohorte', 24)->nullable();
            $table->string('verrat_interdit', 16)->nullable();
            $table->string('encoche', 32)->nullable();
            $table->string('sexe', 12)->nullable();
            $table->unsignedInteger('effectif')->default(1);
            $table->date('naissance')->nullable();
            $table->string('origine', 32)->nullable();
            $table->foreignId('mere_id')->nullable()->constrained('animaux')->nullOnDelete();
            $table->string('pere', 32)->nullable();
            $table->string('atelier')->nullable();
            $table->foreignId('loge_id')->nullable()->constrained('loges')->nullOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->decimal('poids', 10, 3)->nullable();
            $table->date('poids_le')->nullable();
            $table->string('stade_alimentaire', 48)->nullable();
            $table->string('statut', 16)->default('present');
            $table->date('sortie_le')->nullable();
            $table->string('sortie_motif', 48)->nullable();
            $table->decimal('sortie_valeur', 14, 2)->nullable();
            $table->text('sortie_note')->nullable();
            $table->foreignId('cree_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['atelier', 'statut']);
            $table->index(['espece', 'categorie', 'statut']);
        });

        Schema::create('animal_evenements', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('animal_id')->constrained('animaux')->cascadeOnDelete();
            $table->string('type', 32);
            $table->date('date');
            $table->string('titre');
            $table->text('detail')->nullable();
            $table->string('produit')->nullable();
            $table->string('lot_produit', 48)->nullable();
            $table->string('dose', 48)->nullable();
            $table->string('voie', 16)->nullable();
            $table->unsignedSmallInteger('duree_jours')->nullable();
            $table->date('fin_traitement')->nullable();
            $table->unsignedSmallInteger('dar_jours')->nullable();
            $table->date('dar_jusquau')->nullable();
            $table->string('prescripteur')->nullable();
            $table->decimal('valeur', 16, 4)->nullable();
            $table->string('unite', 24)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_nom');
            $table->string('photo_chemin')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['animal_id', 'date']);
            $table->index(['type', 'date']);
        });

        Schema::create('cycles_reproduction', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('animal_id')->constrained('animaux')->cascadeOnDelete();
            $table->unsignedSmallInteger('numero');
            $table->date('saillie')->nullable();
            $table->string('verrat', 32)->nullable();
            $table->date('mise_bas_prevue')->nullable();
            $table->date('mise_bas')->nullable();
            $table->unsignedSmallInteger('nes_totaux')->nullable();
            $table->unsignedSmallInteger('nes_vivants')->nullable();
            $table->unsignedSmallInteger('mort_nes')->nullable();
            $table->unsignedSmallInteger('momifies')->nullable();
            $table->decimal('poids_portee', 8, 2)->nullable();
            $table->date('sevrage_prevu')->nullable();
            $table->date('sevrage')->nullable();
            $table->unsignedSmallInteger('sevres')->nullable();
            $table->decimal('poids_sevrage', 8, 2)->nullable();
            $table->unsignedSmallInteger('age_sevrage')->nullable();
            $table->date('retour_chaleur')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->unique(['animal_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cycles_reproduction');
        Schema::dropIfExists('animal_evenements');
        Schema::dropIfExists('animaux');
        Schema::dropIfExists('loges');
    }
};
