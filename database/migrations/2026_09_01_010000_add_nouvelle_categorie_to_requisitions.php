<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisitions', function (Blueprint $table): void {
            $table->string('nouvelle_categorie', 8)->nullable()->after('nouvel_article');
            $table->string('centre_cout', 100)->nullable()->after('justification');
        });
    }

    public function down(): void
    {
        Schema::table('requisitions', function (Blueprint $table): void {
            $table->dropColumn(['nouvelle_categorie', 'centre_cout']);
        });
    }
};
