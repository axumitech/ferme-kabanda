<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 24)->unique();
            $table->string('nom');
            $table->string('canal', 24)->default('marche');
            $table->string('contact')->nullable();
            $table->string('telephone', 32)->nullable();
            $table->string('devise_preferee', 3)->default('USD');
            $table->decimal('prix_reference', 12, 2)->nullable();
            $table->string('unite_reference', 24)->nullable();
            $table->unsignedSmallInteger('delai_paiement_jours')->nullable();
            $table->text('note')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
        Schema::create('taux_change', function (Blueprint $table): void {
            $table->id();
            $table->string('devise', 3)->default('CDF');
            $table->decimal('taux', 14, 4);
            $table->date('effet_le');
            $table->string('source')->nullable();
            $table->foreignId('saisi_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('saisi_par_nom')->nullable();
            $table->timestamps();
            $table->unique(['devise', 'effet_le']);
        });
        Schema::create('ventes', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->string('bon_livraison', 24)->nullable()->unique();
            $table->date('date');
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->string('client_libre')->nullable();
            $table->string('canal', 24)->nullable();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->string('devise', 3)->default('USD');
            $table->decimal('taux_applique', 14, 4);
            $table->decimal('montant', 14, 2)->default(0);
            $table->decimal('montant_usd', 14, 2)->default(0);
            $table->decimal('montant_cdf', 16, 2)->default(0);
            $table->string('statut', 16)->default('brouillon');
            $table->string('mode_paiement', 24)->nullable();
            $table->decimal('montant_regle', 14, 2)->default(0);
            $table->date('echeance')->nullable();
            $table->text('note')->nullable();
            $table->string('transport')->nullable();
            $table->foreignId('cree_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('livre_par_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('livree_le')->nullable();
            $table->timestamps();
            $table->index(['date', 'statut']);
        });
        Schema::create('vente_lignes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();
            $table->string('nature', 24);
            $table->string('designation');
            $table->foreignId('animal_id')->nullable()->constrained('animaux')->nullOnDelete();
            $table->foreignId('plantation_id')->nullable()->constrained('plantations')->nullOnDelete();
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->decimal('poids_vif', 10, 2)->nullable();
            $table->decimal('poids_carcasse', 10, 2)->nullable();
            $table->decimal('rendement', 5, 2)->nullable();
            $table->decimal('quantite', 12, 3);
            $table->string('unite', 24);
            $table->decimal('prix_unitaire', 12, 2);
            $table->string('devise', 3)->default('USD');
            $table->decimal('montant', 14, 2);
            $table->decimal('montant_usd', 14, 2)->default(0);
            $table->foreignId('mouvement_id')->nullable()->constrained('mouvements_stock')->nullOnDelete();
            $table->timestamps();
        });
        Schema::table('animaux', fn (Blueprint $table) => $table->foreignId('vente_id')->nullable()->constrained('ventes')->nullOnDelete());
        Schema::table('recoltes', fn (Blueprint $table) => $table->decimal('quantite_vendue', 12, 2)->default(0));

        DB::table('taux_change')->insert(['devise' => 'CDF', 'taux' => 2200, 'effet_le' => now()->startOfMonth()->toDateString(), 'source' => 'Taux interne de référence — à confirmer', 'created_at' => now(), 'updated_at' => now()]);
        foreach ([['EZHL', 'EZHL', 'premium', 7, 'kg carcasse'], ['MARCHE', 'Marché de Kasangulu', 'marche', null, null], ['KINSHASA', 'Clients Kinshasa', 'marche', null, null], ['CUISINE', 'Cuisine interne FKN', 'interne', null, null], ['PERSONNEL', 'Personnel FKN', 'interne', null, null]] as [$code, $nom, $canal, $prix, $unite]) {
            DB::table('clients')->insert(['code' => $code, 'nom' => $nom, 'canal' => $canal, 'devise_preferee' => 'USD', 'prix_reference' => $prix, 'unite_reference' => $unite, 'actif' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('recoltes', fn (Blueprint $table) => $table->dropColumn('quantite_vendue'));
        Schema::table('animaux', fn (Blueprint $table) => $table->dropConstrainedForeignId('vente_id'));
        Schema::dropIfExists('vente_lignes');
        Schema::dropIfExists('ventes');
        Schema::dropIfExists('taux_change');
        Schema::dropIfExists('clients');
    }
};
