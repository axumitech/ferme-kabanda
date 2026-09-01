<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mains_courantes', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->dateTime('survenu_le');
            $table->string('type', 24);
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->string('lieu')->nullable();
            $table->text('objet');
            $table->string('personne')->nullable();
            $table->string('vehicule', 48)->nullable();
            $table->string('piece_identite', 64)->nullable();
            $table->foreignId('patrouille_id')->nullable()->constrained('patrouilles')->nullOnDelete();
            $table->foreignId('incident_id')->nullable()->constrained('incidents')->nullOnDelete();
            $table->string('photo_chemin')->nullable();
            $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('agent_nom');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['survenu_le', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mains_courantes');
    }
};
