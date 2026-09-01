<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcelles', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('nom');
            $table->string('type', 16)->default('parc');
            $table->foreignId('parent_id')->nullable()->constrained('parcelles')->nullOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->decimal('surface_m2', 12, 2)->nullable();
            $table->unsignedSmallInteger('nb_planches')->nullable();
            $table->string('irrigation', 32)->nullable();
            $table->string('exposition', 24)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('actif')->default(true);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['site_id', 'type', 'actif']);
        });

        Schema::table('plantations', function (Blueprint $table): void {
            $table->foreignId('parcelle_id')->nullable()->after('site_id')->constrained('parcelles')->nullOnDelete();
            $table->decimal('surface_m2', 12, 2)->nullable()->after('unite');
        });
    }

    public function down(): void
    {
        Schema::table('plantations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parcelle_id');
            $table->dropColumn('surface_m2');
        });

        Schema::dropIfExists('parcelles');
    }
};
