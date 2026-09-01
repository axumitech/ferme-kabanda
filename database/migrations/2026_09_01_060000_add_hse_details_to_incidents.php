<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incidents', function (Blueprint $table): void {
            $table->text('temoins')->nullable()->after('actions_immediates');
            $table->string('personnes_impliquees')->nullable()->after('temoins');
            $table->boolean('tiers_implique')->default(false)->after('personnes_impliquees');
            $table->text('facteurs_contributifs')->nullable()->after('cause_racine');
        });
    }

    public function down(): void
    {
        Schema::table('incidents', function (Blueprint $table): void {
            $table->dropColumn([
                'temoins',
                'personnes_impliquees',
                'tiers_implique',
                'facteurs_contributifs',
            ]);
        });
    }
};
