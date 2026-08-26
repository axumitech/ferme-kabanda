<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
            $table->index(['deleted_at', 'is_admin', 'name'], 'users_active_admin_name_index');
        });

        Schema::table('reference_items', function (Blueprint $table) {
            $table->index(
                ['category', 'active', 'sort_order'],
                'reference_items_category_active_order_index',
            );
        });

        Schema::table('map_features', function (Blueprint $table) {
            $table->index(['active', 'sort_order'], 'map_features_active_order_index');
        });

        Schema::table('farm_records', function (Blueprint $table) {
            $table->index(['record_key', 'updated_at'], 'farm_records_key_updated_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_active_admin_name_index');
            $table->dropSoftDeletes();
        });
        Schema::table('reference_items', fn (Blueprint $table) => $table->dropIndex('reference_items_category_active_order_index'));
        Schema::table('map_features', fn (Blueprint $table) => $table->dropIndex('map_features_active_order_index'));
        Schema::table('farm_records', fn (Blueprint $table) => $table->dropIndex('farm_records_key_updated_index'));
    }
};
