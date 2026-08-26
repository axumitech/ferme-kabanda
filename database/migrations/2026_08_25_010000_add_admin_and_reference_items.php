<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('password');
        });

        Schema::create('reference_items', function (Blueprint $table) {
            $table->id();
            $table->string('category', 60)->index();
            $table->string('label', 160);
            $table->string('description', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['category', 'label']);
        });

        $defaults = [
            'parcelles' => ['Parc 1', 'Parc 2', 'Parc 3', 'Parc 4', 'Parc 5', 'Parc 6', 'Parc 7', 'Parc 8', 'A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'D — Bananeraie', 'E — Maïs', 'Serre / Pépinière'],
            'ateliers' => ['Porcherie A — K1', 'Porcherie B — K1', 'Poulailler — K1', 'Bovins — K2', 'Pisciculture — K1'],
            'cultures' => ['Chou', 'Tomate', 'Aubergine', 'Piment', 'Gombo', 'Amarante', 'Oseille', 'Épinard', 'Laitue', 'Oignon', 'Carotte', 'Maïs', 'Bananier', 'Gingembre'],
            'agents_agri' => ['MAMENGI DINA — chef d’équipe', 'MANZIZIKA BAKALA', 'DIMASA KIOKA', 'KAZIALA MUSONGO', 'DIMALU PAULO', 'NSINGI NGIMBANI', 'MANSONI IGNACE', 'MAKABIKA BIKULA', 'Ir Evaristo CHANDA — superviseur', 'Journalier'],
            'agents_ani' => ['Ir Andy SALANI — superviseur', 'NGOVO DINGANGA AMIGO — porcher', 'ROSSY MAYUMU KIBAL', 'Gardien de bétail K2', 'Journalier'],
            'taches_agri' => ['Arrosage', 'Désherbage', 'Paillage', 'Fertilisation', 'Traitement phyto', 'Récolte', 'Semis', 'Repiquage', 'Taille / Ébourgeonnage', 'Œilletonnage', 'Préparation de planche', 'Buttage', 'Éclaircissage', 'Contrôle irrigation', 'Nettoyage des allées', 'Arrachage', 'Autre'],
            'unites' => ['planches', 'pieds', 'lignes', 'm²', 'kg', 'sacs', 'litres', 'minutes', 'caisses'],
        ];

        $now = now();
        foreach ($defaults as $category => $labels) {
            foreach ($labels as $order => $label) {
                DB::table('reference_items')->insert([
                    'category' => $category,
                    'label' => $label,
                    'sort_order' => $order,
                    'active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reference_items');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_admin'));
    }
};
