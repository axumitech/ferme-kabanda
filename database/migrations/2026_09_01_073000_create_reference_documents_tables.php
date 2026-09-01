<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents_reference', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('titre');
            $table->string('type', 24)->default('politique');
            $table->string('version', 16)->nullable();
            $table->date('date_version')->nullable();
            $table->string('fichier')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->index(['type', 'actif']);
        });

        Schema::create('sections_reference', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('document_reference_id')->constrained('documents_reference')->cascadeOnDelete();
            $table->string('ancre', 48);
            $table->string('titre');
            $table->longText('texte')->nullable();
            $table->unsignedSmallInteger('page')->nullable();
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();
            $table->unique(['document_reference_id', 'ancre']);
        });

        Schema::table('plan_lignes', function (Blueprint $table): void {
            $table->foreignId('section_reference_id')->nullable()->constrained('sections_reference')->nullOnDelete();
        });

        Schema::table('taches', function (Blueprint $table): void {
            $table->foreignId('section_reference_id')->nullable()->constrained('sections_reference')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('taches', fn (Blueprint $table) => $table->dropConstrainedForeignId('section_reference_id'));
        Schema::table('plan_lignes', fn (Blueprint $table) => $table->dropConstrainedForeignId('section_reference_id'));
        Schema::dropIfExists('sections_reference');
        Schema::dropIfExists('documents_reference');
    }
};
