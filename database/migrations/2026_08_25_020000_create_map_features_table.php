<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('map_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reference_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 160)->unique();
            $table->string('feature_type', 20)->index();
            $table->decimal('area_ha', 10, 3)->nullable();
            $table->unsignedInteger('area_m2')->nullable();
            $table->json('points');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('map_features');
    }
};
