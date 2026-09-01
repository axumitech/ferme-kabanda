<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordres_travail', function (Blueprint $table): void {
            $table->boolean('approbation_requise')->default(true)->after('statut');
        });
    }

    public function down(): void
    {
        Schema::table('ordres_travail', function (Blueprint $table): void {
            $table->dropColumn('approbation_requise');
        });
    }
};
