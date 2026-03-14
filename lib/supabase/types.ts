export type Json = any;

type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<{ id: string; name: string; slug: string; plan: string; status: string; settings: Json; trial_ends_at: string | null; created_at: string; updated_at: string }>;
      profiles: Table<{ id: string; tenant_id: string; email: string; first_name: string | null; last_name: string | null; role: string; status: string; preferences: Json; attributes: Json; last_login_at: string | null; created_at: string; updated_at: string }>;
      api_keys: Table<{ id: string; tenant_id: string; user_id: string; name: string; key_hash: string; key_prefix: string; scopes: string[]; last_used_at: string | null; expires_at: string | null; revoked_at: string | null; created_at: string }>;
      products: Table<{ id: string; tenant_id: string; sku: string; name: string; description: string | null; category: string | null; uom: string; weight_kg: number | null; lead_time_days: number; safety_stock_days: number; min_order_qty: number; standard_cost_cents: number; currency_code: string; status: string; attributes: Json; search_vector?: unknown; created_at: string; updated_at: string; deleted_at: string | null }>;
      suppliers: Table<{ id: string; tenant_id: string; code: string; name: string; country_code: string | null; currency_code: string; payment_terms_days: number; lead_time_days: number; min_order_value_cents: number; status: string; risk_rating: string; contact_email: string | null; attributes: Json; created_at: string; updated_at: string; deleted_at: string | null }>;
      facilities: Table<{ id: string; tenant_id: string; code: string; name: string; type: "plant" | "warehouse" | "distribution_center" | "cross_dock"; address: Json; country_code: string | null; timezone: string; status: string; attributes: Json; created_at: string; updated_at: string }>;
      bom_headers: Table<{ id: string; tenant_id: string; product_id: string; version: string; status: string; effective_from: string | null; effective_to: string | null; created_at: string; updated_at: string }>;
      bom_lines: Table<{ id: string; tenant_id: string; bom_header_id: string; parent_product_id: string; component_product_id: string; quantity: number; uom: string; scrap_factor_pct: number; is_phantom: boolean; position_number: number | null; created_at: string }>;
      demand_history: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; period_start: string; period_end: string; actual_qty: number; source: string; created_at: string }>;
      statistical_forecasts: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; run_id: string; period_start: string; period_end: string; forecast_qty: number; lower_bound_qty: number | null; upper_bound_qty: number | null; confidence_pct: number | null; model_type: string; created_at: string }>;
      forecast_overrides: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; period_start: string; period_end: string; statistical_qty: number; proposed_qty: number; reason: string | null; reason_code: string | null; proposed_by: string | null; status: string; reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string }>;
      forecast_accuracy: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; run_id: string; horizon_weeks: number; mape: number | null; wmape: number | null; bias: number | null; mae: number | null; calculated_at: string }>;
      forecast_runs: Table<{ id: string; tenant_id: string; facility_id: string | null; horizon_weeks: number; status: string; product_ids: string[]; total_products: number; processed_products: number; failed_products: number; triggered_by: string | null; started_at: string | null; completed_at: string | null; result_summary: Json; created_at: string; updated_at: string }>;
      planning_cycles: Table<{ id: string; tenant_id: string; cycle_name: string; cycle_type: string; status: string; horizon_start: string; horizon_end: string; created_by: string | null; approved_by: string | null; approved_at: string | null; locked_at: string | null; created_at: string; updated_at: string }>;
      planned_orders: Table<{ id: string; tenant_id: string; planning_cycle_id: string; product_id: string; facility_id: string; order_type: string; status: string; quantity: number; uom: string; planned_start_date: string; planned_end_date: string; due_date: string; supplier_id: string | null; firm_planned: boolean; pegging: Json; confirmed_qty: number | null; confirmed_date: string | null; supplier_response_status: string; supplier_response_reason: string | null; actual_delivery_date: string | null; closed_at: string | null; promised_lead_time_days: number | null; created_at: string; updated_at: string }>;
      open_supply_orders: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; order_type: string; external_order_id: string | null; quantity: number; confirmed_qty: number | null; expected_date: string; status: string; source_system: string | null; original_lead_time_days?: number | null; created_at: string; updated_at: string }>;
      inventory_positions: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; on_hand_qty: number; in_transit_qty: number; reserved_qty: number; reorder_point_qty: number; safety_stock_qty: number; unit_cost_cents: number; currency_code: string; last_counted_at: string | null; updated_at: string }>;
      inventory_transactions: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; transaction_type: string; quantity: number; before_qty: number; after_qty: number; reference_type: string | null; reference_id: string | null; unit_cost_cents: number | null; transaction_date: string; created_by: string | null; created_at: string }>;
      inventory_policies: Table<{ id: string; tenant_id: string; product_id: string; facility_id: string; service_level_pct: number; lead_time_days: number; holding_cost_pct: number; ordering_cost_cents: number; calculated_safety_stock: number | null; calculated_rop: number | null; calculated_eoq: number | null; is_override: boolean; ordering_policy?: string | null; calculated_at: string | null; created_at: string; updated_at: string }>;
      planning_sessions: Table<{ id: string; tenant_id: string; planning_cycle_id: string; status: string; description: string | null; owner_id: string | null; created_at: string; updated_at: string }>;
      planning_cells: Table<{ id: string; tenant_id: string; session_id: string; entity_type: string; entity_id: string; period_start: string; field_name: string; current_value: Json; original_value: Json | null; locked_by: string | null; locked_at: string | null; last_modified_by: string | null; last_modified_at: string | null; version: number }>;
      scenarios: Table<{ id: string; tenant_id: string; planning_cycle_id: string; name: string; description: string | null; status: string; branched_from_id: string | null; promoted_by: string | null; promoted_at: string | null; created_by: string | null; created_at: string; updated_at: string }>;
      scenario_overrides: Table<{ id: string; tenant_id: string; scenario_id: string; entity_type: string; entity_id: string; period_start: string; field_name: string; override_value: Json; original_value: Json | null; created_by: string | null; created_at: string }>;
      exceptions: Table<{ id: string; tenant_id: string; exception_type: string; severity: string; status: string; title: string; description: string | null; entity_type: string | null; entity_id: string | null; entity_name: string | null; facility_id: string | null; detected_at: string; acknowledged_at: string | null; acknowledged_by: string | null; resolved_at: string | null; resolved_by: string | null; resolution_notes: string | null; resolution_action: string | null; priority_score: number; ai_recommendation: string | null; suppressed_until: string | null; context_json: Json; last_alert_sent_at: string | null; created_at: string; updated_at: string }>;
      exception_comments: Table<{ id: string; tenant_id: string; exception_id: string; user_id: string; comment: string; created_at: string }>;
      exception_alert_log: Table<{ id: string; tenant_id: string; exception_id: string; alert_type: string; created_at: string }>;
      sop_cycles: Table<{ id: string; tenant_id: string; cycle_name: string; cycle_month: number; cycle_year: number; status: string; step_due_dates: Json; completed_at: string | null; created_at: string; updated_at: string }>;
      sop_actions: Table<{ id: string; tenant_id: string; sop_cycle_id: string; title: string; description: string | null; owner_id: string | null; due_date: string | null; status: string; priority: string; completed_at: string | null; created_at: string; updated_at: string }>;
      capacity_submissions: Table<{ id: string; tenant_id: string; supplier_id: string; product_id: string; period_start: string; period_end: string; available_qty: number; committed_qty: number | null; lead_time_days: number | null; notes: string | null; status: string; submitted_by: string | null; submitted_at: string | null; created_at: string; updated_at: string }>;
      supplier_scorecards: Table<{ id: string; tenant_id: string; supplier_id: string; score_month: number; score_year: number; otif_pct: number; lead_time_adherence_pct: number; defect_rate_pct: number; composite_score: number; grade: string; created_at: string; updated_at: string }>;
      kpi_snapshots: Table<{ id: string; tenant_id: string; kpi_code: string; kpi_name: string; period_start: string; period_end: string; granularity: string; dimension: Json; value: number; uom: string | null; trend_direction: string | null; vs_prior_period_pct: number | null; vs_target_pct: number | null; target_value: number | null; calculated_at: string }>;
      report_definitions: Table<{ id: string; tenant_id: string; name: string; report_type: string; config: Json; output_format: string; created_by: string | null; created_at: string; updated_at: string }>;
      report_runs: Table<{ id: string; tenant_id: string; report_definition_id: string; status: string; file_path: string | null; output_format: string; error_message: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string }>;
      scheduled_reports: Table<{ id: string; tenant_id: string; report_definition_id: string; cron_expression: string; next_run_at: string; is_active: boolean; created_at: string; updated_at: string }>;
      connectors: Table<{ id: string; tenant_id: string; connector_type: string; name: string; status: string; config_encrypted: Json; sync_schedule_cron: string | null; last_sync_at: string | null; last_sync_status: string | null; created_at: string; updated_at: string }>;
      connector_mappings: Table<{ id: string; tenant_id: string; connector_id: string; object_type: string; source_field: string; target_field: string; transform_type: "direct" | "lookup" | "formula" | "constant" | "conditional"; transform_config: Json; created_at: string; updated_at: string }>;
      webhook_subscriptions: Table<{ id: string; tenant_id: string; name: string; target_url: string; event_types: string[]; secret_hash: string; is_active: boolean; failure_count: number; created_at: string; updated_at: string }>;
      webhook_deliveries: Table<{ id: string; tenant_id: string; webhook_subscription_id: string; event_type: string; payload: Json; response_status: number | null; response_body: string | null; attempt_count: number; delivered_at: string | null; created_at: string; updated_at: string }>;
      sync_jobs: Table<{ id: string; tenant_id: string; connector_id: string; object_type: string; status: string; records_processed: number; error_count: number; errors: Json; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string }>;
      job_results: Table<{ id: string; tenant_id: string; job_type: string; status: string; result: Json; created_by: string | null; created_at: string; updated_at: string }>;
      mrp_runs: Table<{ id: string; tenant_id: string; planning_cycle_id: string; status: "queued" | "running" | "completed" | "completed_with_errors" | "failed"; total_products: number; processed_products: number; failed_products: number; started_at: string | null; completed_at: string | null; triggered_by: string | null; summary: Json; created_at: string; updated_at: string }>;
      mrp_messages: Table<{ id: string; tenant_id: string; mrp_run_id: string; planning_cycle_id: string; product_id: string | null; facility_id: string | null; planned_order_id: string | null; severity: string; message_type: string; title: string; detail: string | null; payload: Json; created_at: string }>;
      audit_log: Table<{ id: string; tenant_id: string | null; user_id: string | null; entity_type: string; entity_id: string | null; action: "create" | "update" | "delete" | "login" | "export"; before_data: Json | null; after_data: Json | null; ip_address: string | null; user_agent: string | null; created_at: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      explode_bom: {
        Args: { p_tenant_id: string; p_product_id: string; p_quantity?: number; p_max_depth?: number };
        Returns: Array<{ level: number; parent_product_id: string; component_product_id: string; component_sku: string; component_name: string; required_qty: number; uom: string }>;
      };
      calculate_net_requirements: {
        Args: { p_tenant_id: string; p_product_id: string; p_facility_id: string; p_period_start: string; p_period_end: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

