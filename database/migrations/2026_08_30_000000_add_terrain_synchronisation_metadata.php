<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Les saisies du carnet portent un UUID créé sur l'appareil. Le rendre
     * unique dans le journal évite qu'une coupure réseau ne duplique une
     * récolte, une déclaration ou la clôture d'une tâche au rejeu.
     */
    public function up(): void
    {
        Schema::table('journal_audit', function (Blueprint $table): void {
            $table->string('reference_externe', 64)->nullable();
            $table->string('appareil', 64)->nullable();
            $table->timestamp('saisi_le')->nullable();
            $table->string('gps', 48)->nullable();
            $table->unique('reference_externe');
        });
    }

    public function down(): void
    {
        Schema::table('journal_audit', function (Blueprint $table): void {
            $table->dropUnique(['reference_externe']);
            $table->dropColumn(['reference_externe', 'appareil', 'saisi_le', 'gps']);
        });
    }
};
