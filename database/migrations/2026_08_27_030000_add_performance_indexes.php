<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->index(['actif', 'seuil_min', 'unite_usage_id'], 'articles_active_threshold_usage_index');
            $table->index(['actif', 'code'], 'articles_active_code_index');
        });

        Schema::table('mouvements_stock', function (Blueprint $table): void {
            $table->index(['created_at', 'article_id'], 'mouvements_stock_created_article_index');
        });

        Schema::table('product_stocks', function (Blueprint $table): void {
            $table->index(['active', 'minimum_quantity'], 'product_stocks_active_minimum_index');
        });

        Schema::table('product_stock_movements', function (Blueprint $table): void {
            $table->index(['occurred_at', 'product_stock_id'], 'product_stock_movements_occurred_stock_index');
        });

        Schema::table('material_assignments', function (Blueprint $table): void {
            $table->index(['is_replaced', 'assigned_on'], 'material_assignments_replaced_assigned_index');
        });

        Schema::table('taches', function (Blueprint $table): void {
            $table->index(['est_modele', 'date_due', 'statut'], 'taches_model_due_status_index');
            $table->index(['est_modele', 'updated_at'], 'taches_model_updated_index');
            $table->index(['responsable_id', 'est_modele', 'date_due', 'statut'], 'taches_resp_model_due_status_index');
        });

        Schema::table('clotures_journalieres', function (Blueprint $table): void {
            $table->index(['date', 'verrouillee'], 'clotures_date_locked_index');
            $table->index('updated_at', 'clotures_updated_index');
        });

        Schema::table('farm_records', function (Blueprint $table): void {
            $table->index(['user_id', 'updated_at'], 'farm_records_user_updated_index');
        });

        Schema::table('journal_audit', function (Blueprint $table): void {
            $table->index('created_at', 'journal_audit_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('journal_audit', function (Blueprint $table): void {
            $table->dropIndex('journal_audit_created_index');
        });

        Schema::table('farm_records', function (Blueprint $table): void {
            $table->dropIndex('farm_records_user_updated_index');
        });

        Schema::table('clotures_journalieres', function (Blueprint $table): void {
            $table->dropIndex('clotures_date_locked_index');
            $table->dropIndex('clotures_updated_index');
        });

        Schema::table('taches', function (Blueprint $table): void {
            $table->dropIndex('taches_model_due_status_index');
            $table->dropIndex('taches_model_updated_index');
            $table->dropIndex('taches_resp_model_due_status_index');
        });

        Schema::table('material_assignments', function (Blueprint $table): void {
            $table->dropIndex('material_assignments_replaced_assigned_index');
        });

        Schema::table('product_stock_movements', function (Blueprint $table): void {
            $table->dropIndex('product_stock_movements_occurred_stock_index');
        });

        Schema::table('product_stocks', function (Blueprint $table): void {
            $table->dropIndex('product_stocks_active_minimum_index');
        });

        Schema::table('mouvements_stock', function (Blueprint $table): void {
            $table->dropIndex('mouvements_stock_created_article_index');
        });

        Schema::table('articles', function (Blueprint $table): void {
            $table->dropIndex('articles_active_threshold_usage_index');
            $table->dropIndex('articles_active_code_index');
        });
    }
};
