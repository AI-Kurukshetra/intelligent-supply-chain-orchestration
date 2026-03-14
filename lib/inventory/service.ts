import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  calculateEOQ,
  calculateReorderPoint,
  calculateSafetyStock
} from "@/lib/inventory/optimization";
import type { Database, Json } from "@/lib/supabase/types";
import { ProblemDetail } from "@/lib/utils/errors";
import {
  InventoryAdjustmentSchema,
  InventoryPolicyOverrideSchema,
  InventoryPolicyTriggerSchema
} from "@/lib/validation/inventory";

export type InventoryPositionRow = Database["public"]["Tables"]["inventory_positions"]["Row"];
export type InventoryTransactionRow = Database["public"]["Tables"]["inventory_transactions"]["Row"];
export type InventoryPolicyRow = Database["public"]["Tables"]["inventory_policies"]["Row"];

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type FacilityRow = Database["public"]["Tables"]["facilities"]["Row"];
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type ForecastRow = Database["public"]["Tables"]["statistical_forecasts"]["Row"];
type DemandHistoryRow = Database["public"]["Tables"]["demand_history"]["Row"];
type PolicyUpsertRow = {
  id?: string;
  tenant_id: string;
  product_id: string;
  facility_id: string;
  service_level_pct: number;
  lead_time_days: number;
  holding_cost_pct: number;
  ordering_cost_cents: number;
  calculated_safety_stock: number;
  calculated_rop: number;
  calculated_eoq: number;
  is_override: boolean;
  calculated_at: string;
};

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(Math.max(variance, 0));
}

function buildCategoryColor(category: string | null) {
  if (!category) {
    return "#f59e0b";
  }
  if (category.toLowerCase().includes("pcb")) {
    return "#0ea5e9";
  }
  if (category.toLowerCase().includes("cable")) {
    return "#10b981";
  }
  return "#f59e0b";
}

export async function listInventoryPositions(input: {
  tenantId: string;
  facilityId?: string | null;
  belowReorderPoint?: boolean;
  search?: string | null;
}) {
  const supabase = await createSupabaseServiceClient();
  const [positionsResult, productsResult, facilitiesResult, forecastsResult] = await Promise.all([
    supabase.from("inventory_positions").select("*").eq("tenant_id", input.tenantId).order("updated_at", { ascending: false }),
    supabase.from("products").select("*").eq("tenant_id", input.tenantId).is("deleted_at", null),
    supabase.from("facilities").select("*").eq("tenant_id", input.tenantId),
    supabase.from("statistical_forecasts").select("*").eq("tenant_id", input.tenantId).order("period_start", { ascending: true })
  ]);

  if (positionsResult.error || productsResult.error || facilitiesResult.error || forecastsResult.error) {
    throw new ProblemDetail(
      500,
      "Inventory Query Failed",
      positionsResult.error?.message ??
        productsResult.error?.message ??
        facilitiesResult.error?.message ??
        forecastsResult.error?.message ??
        "Unable to load inventory positions."
    );
  }

  const products = new Map(((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]));
  const facilities = new Map(((facilitiesResult.data ?? []) as FacilityRow[]).map((facility) => [facility.id, facility]));
  const forecasts = (forecastsResult.data ?? []) as ForecastRow[];

  return ((positionsResult.data ?? []) as InventoryPositionRow[])
    .filter((position) => !input.facilityId || position.facility_id === input.facilityId)
    .map((position) => {
      const product = products.get(position.product_id) ?? null;
      const facility = facilities.get(position.facility_id) ?? null;
      const availableQty = Number(position.on_hand_qty) - Number(position.reserved_qty);
      const nextForecasts = forecasts
        .filter((forecast) => forecast.product_id === position.product_id && forecast.facility_id === position.facility_id)
        .slice(0, 13);
      const averageWeeklyDemand = mean(nextForecasts.map((forecast) => Number(forecast.forecast_qty)));
      const daysOfSupply = averageWeeklyDemand > 0 ? (availableQty / averageWeeklyDemand) * 7 : null;
      return {
        ...position,
        available_qty: Number(availableQty.toFixed(2)),
        days_of_supply: daysOfSupply === null ? null : Number(daysOfSupply.toFixed(2)),
        product,
        facility
      };
    })
    .filter((row) => {
      if (input.belowReorderPoint && row.available_qty >= Number(row.reorder_point_qty)) {
        return false;
      }
      if (!input.search) {
        return true;
      }
      const term = input.search.toLowerCase();
      return [row.product?.sku, row.product?.name, row.facility?.name].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      );
    });
}

export async function adjustInventory(input: {
  tenantId: string;
  userId: string;
  payload: unknown;
}) {
  const parsed = InventoryAdjustmentSchema.parse(input.payload);
  const supabase = await createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("inventory_positions")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("product_id", parsed.product_id)
    .eq("facility_id", parsed.facility_id)
    .single();

  if (existingError || !existing) {
    throw new ProblemDetail(404, "Not Found", existingError?.message ?? "Inventory position not found.");
  }

  const beforeQty = Number(existing.on_hand_qty);
  const afterQty = Number((beforeQty + parsed.quantity).toFixed(4));
  const timestamp = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("inventory_positions")
    .update({
      on_hand_qty: afterQty,
      last_counted_at: timestamp,
      updated_at: timestamp
    })
    .eq("tenant_id", input.tenantId)
    .eq("product_id", parsed.product_id)
    .eq("facility_id", parsed.facility_id)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new ProblemDetail(500, "Adjustment Failed", updateError?.message ?? "Unable to update inventory position.");
  }

  const { error: transactionError } = await supabase.from("inventory_transactions").insert({
    tenant_id: input.tenantId,
    product_id: parsed.product_id,
    facility_id: parsed.facility_id,
    transaction_type: parsed.transaction_type,
    quantity: parsed.quantity,
    before_qty: beforeQty,
    after_qty: afterQty,
    reference_type: parsed.reason ?? "manual_adjustment",
    reference_id: null,
    unit_cost_cents: existing.unit_cost_cents,
    transaction_date: timestamp.slice(0, 10),
    created_by: input.userId
  });

  if (transactionError) {
    throw new ProblemDetail(500, "Transaction Failed", transactionError.message);
  }

  return updated as InventoryPositionRow;
}

export async function getInventoryPositionDetail(tenantId: string, productId: string, facilityId: string) {
  const supabase = await createSupabaseServiceClient();
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 91);

  const [positionResult, transactionsResult, productResult, facilityResult] = await Promise.all([
    supabase
      .from("inventory_positions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("facility_id", facilityId)
      .single(),
    supabase
      .from("inventory_transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("facility_id", facilityId)
      .gte("transaction_date", fromDate.toISOString().slice(0, 10))
      .order("transaction_date", { ascending: false }),
    supabase.from("products").select("*").eq("tenant_id", tenantId).eq("id", productId).single(),
    supabase.from("facilities").select("*").eq("tenant_id", tenantId).eq("id", facilityId).single()
  ]);

  if (positionResult.error || !positionResult.data) {
    throw new ProblemDetail(404, "Not Found", positionResult.error?.message ?? "Inventory position not found.");
  }
  if (transactionsResult.error || productResult.error || facilityResult.error) {
    throw new ProblemDetail(
      500,
      "Inventory Detail Failed",
      transactionsResult.error?.message ??
        productResult.error?.message ??
        facilityResult.error?.message ??
        "Unable to load inventory detail."
    );
  }

  return {
    position: positionResult.data as InventoryPositionRow,
    product: productResult.data as ProductRow,
    facility: facilityResult.data as FacilityRow,
    transactions: (transactionsResult.data ?? []) as InventoryTransactionRow[]
  };
}

export async function listInventoryPolicies(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [policiesResult, productsResult, facilitiesResult] = await Promise.all([
    supabase.from("inventory_policies").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    supabase.from("products").select("*").eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("facilities").select("*").eq("tenant_id", tenantId)
  ]);

  if (policiesResult.error || productsResult.error || facilitiesResult.error) {
    throw new ProblemDetail(
      500,
      "Policy Query Failed",
      policiesResult.error?.message ??
        productsResult.error?.message ??
        facilitiesResult.error?.message ??
        "Unable to load inventory policies."
    );
  }

  const products = new Map(((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]));
  const facilities = new Map(((facilitiesResult.data ?? []) as FacilityRow[]).map((facility) => [facility.id, facility]));

  return ((policiesResult.data ?? []) as InventoryPolicyRow[]).map((policy) => ({
    ...policy,
    product: products.get(policy.product_id) ?? null,
    facility: facilities.get(policy.facility_id) ?? null
  }));
}

export async function overrideInventoryPolicy(input: { tenantId: string; id: string; payload: unknown }) {
  const parsed = InventoryPolicyOverrideSchema.parse(input.payload);
  const supabase = await createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("inventory_policies")
    .update({
      ...parsed,
      is_override: true,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new ProblemDetail(500, "Policy Override Failed", error?.message ?? "Unable to override inventory policy.");
  }

  return data as InventoryPolicyRow;
}

export async function calculatePoliciesForTenant(tenantId: string, serviceLevelPct?: number) {
  const supabase = await createSupabaseServiceClient();
  const [positionsResult, policiesResult, productsResult, suppliersResult, historyResult] = await Promise.all([
    supabase.from("inventory_positions").select("*").eq("tenant_id", tenantId),
    supabase.from("inventory_policies").select("*").eq("tenant_id", tenantId),
    supabase.from("products").select("*").eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null),
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("demand_history").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(20000)
  ]);

  if (positionsResult.error || policiesResult.error || productsResult.error || suppliersResult.error || historyResult.error) {
    throw new ProblemDetail(
      500,
      "Policy Calculation Failed",
      positionsResult.error?.message ??
        policiesResult.error?.message ??
        productsResult.error?.message ??
        suppliersResult.error?.message ??
        historyResult.error?.message ??
        "Unable to load policy inputs."
    );
  }

  const policies = new Map(((policiesResult.data ?? []) as InventoryPolicyRow[]).map((policy) => [`${policy.product_id}:${policy.facility_id}`, policy]));
  const products = new Map(((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]));
  const suppliers = (suppliersResult.data ?? []) as SupplierRow[];
  const history = (historyResult.data ?? []) as DemandHistoryRow[];

  const upserts: PolicyUpsertRow[] = [];
  const positionUpdates: Array<{ id: string; safety_stock_qty: number; reorder_point_qty: number }> = [];

  for (const position of (positionsResult.data ?? []) as InventoryPositionRow[]) {
    const product = products.get(position.product_id);
    if (!product) {
      continue;
    }

    const policyKey = `${position.product_id}:${position.facility_id}`;
    const existingPolicy = policies.get(policyKey);
    if (existingPolicy?.is_override) {
      continue;
    }

    const demandSamples = history
      .filter((entry) => entry.product_id === position.product_id && entry.facility_id === position.facility_id)
      .slice(0, 52)
      .map((entry) => Number(entry.actual_qty) / 7);
    const demandAvgPerDay = mean(demandSamples);
    const demandStdPerDay = stdDev(demandSamples);
    const attributes = (product.attributes ?? {}) as Record<string, Json>;
    const relatedSuppliers = suppliers.filter(
      (supplier) => attributes.preferred_supplier_id === supplier.id || attributes.supplier_id === supplier.id
    );
    const leadTimeSamples = (relatedSuppliers.length > 0 ? relatedSuppliers : [{ lead_time_days: product.lead_time_days } as SupplierRow]).map(
      (supplier) => Number(supplier.lead_time_days)
    );
    const leadTimeDays = Math.max(mean(leadTimeSamples), 1);
    const leadTimeVariabilityDays = Math.max(stdDev(leadTimeSamples), 1);
    const nextServiceLevel = Number(serviceLevelPct ?? existingPolicy?.service_level_pct ?? 95);
    const holdingCostPct = Number(existingPolicy?.holding_cost_pct ?? 25);
    const orderingCostCents = Number(existingPolicy?.ordering_cost_cents ?? 50000);
    const annualDemand = demandAvgPerDay * 365;
    const safetyStock = calculateSafetyStock({
      serviceLevelPct: nextServiceLevel,
      leadTimeDays,
      leadTimeVariabilityDays,
      demandAvgPerDay,
      demandStdPerDay
    });
    const reorderPoint = calculateReorderPoint(demandAvgPerDay, leadTimeDays, safetyStock);
    const eoq = calculateEOQ({
      annualDemand,
      orderingCostCents,
      unitCostCents: Number(position.unit_cost_cents || product.standard_cost_cents),
      holdingCostPct
    });
    const calculatedAt = new Date().toISOString();

    upserts.push({
      ...(existingPolicy?.id ? { id: existingPolicy.id } : {}),
      tenant_id: tenantId,
      product_id: position.product_id,
      facility_id: position.facility_id,
      service_level_pct: nextServiceLevel,
      lead_time_days: Math.round(leadTimeDays),
      holding_cost_pct: holdingCostPct,
      ordering_cost_cents: orderingCostCents,
      calculated_safety_stock: safetyStock,
      calculated_rop: reorderPoint,
      calculated_eoq: eoq,
      is_override: false,
      calculated_at: calculatedAt
    });

    positionUpdates.push({
      id: position.id,
      safety_stock_qty: safetyStock,
      reorder_point_qty: reorderPoint
    });
  }

  if (upserts.length > 0) {
    const { error: upsertError } = await supabase.from("inventory_policies").upsert(upserts);
    if (upsertError) {
      throw new ProblemDetail(500, "Policy Upsert Failed", upsertError.message);
    }
  }

  for (const update of positionUpdates) {
    const { error } = await supabase
      .from("inventory_positions")
      .update({
        safety_stock_qty: update.safety_stock_qty,
        reorder_point_qty: update.reorder_point_qty,
        updated_at: new Date().toISOString()
      })
      .eq("id", update.id);
    if (error) {
      throw new ProblemDetail(500, "Position Update Failed", error.message);
    }
  }

  return {
    calculated: upserts.length,
    positions_updated: positionUpdates.length
  };
}

export async function listExcessObsolete(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const staleCutoff = new Date();
  staleCutoff.setUTCDate(staleCutoff.getUTCDate() - 90);

  const [positionsResult, productsResult, facilitiesResult, historyResult, transactionsResult] = await Promise.all([
    supabase.from("inventory_positions").select("*").eq("tenant_id", tenantId),
    supabase.from("products").select("*").eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("facilities").select("*").eq("tenant_id", tenantId),
    supabase.from("demand_history").select("*").eq("tenant_id", tenantId).order("period_start", { ascending: false }).limit(20000),
    supabase.from("inventory_transactions").select("*").eq("tenant_id", tenantId).order("transaction_date", { ascending: false }).limit(20000)
  ]);

  if (positionsResult.error || productsResult.error || facilitiesResult.error || historyResult.error || transactionsResult.error) {
    throw new ProblemDetail(
      500,
      "Excess Query Failed",
      positionsResult.error?.message ??
        productsResult.error?.message ??
        facilitiesResult.error?.message ??
        historyResult.error?.message ??
        transactionsResult.error?.message ??
        "Unable to load excess inventory inputs."
    );
  }

  const products = new Map(((productsResult.data ?? []) as ProductRow[]).map((product) => [product.id, product]));
  const facilities = new Map(((facilitiesResult.data ?? []) as FacilityRow[]).map((facility) => [facility.id, facility]));
  const history = (historyResult.data ?? []) as DemandHistoryRow[];
  const transactions = (transactionsResult.data ?? []) as InventoryTransactionRow[];

  return ((positionsResult.data ?? []) as InventoryPositionRow[])
    .map((position) => {
      const product = products.get(position.product_id) ?? null;
      const facility = facilities.get(position.facility_id) ?? null;
      const forwardDemand = history
        .filter((entry) => entry.product_id === position.product_id && entry.facility_id === position.facility_id)
        .slice(0, 26)
        .reduce((sum, entry) => sum + Number(entry.actual_qty), 0);
      const weeksOfSupply = forwardDemand > 0 ? Number(((Number(position.on_hand_qty) / forwardDemand) * 26).toFixed(2)) : Number(position.on_hand_qty);
      const lastTransaction = transactions.find(
        (transaction) => transaction.product_id === position.product_id && transaction.facility_id === position.facility_id
      );
      const stale = !lastTransaction || new Date(lastTransaction.transaction_date) < staleCutoff;
      const excessQty = Math.max(Number(position.on_hand_qty) - forwardDemand, 0);
      const excessValue = Math.round(excessQty * Number(position.unit_cost_cents));
      const flagged = Number(position.on_hand_qty) > forwardDemand || stale;

      return {
        ...position,
        product,
        facility,
        weeks_of_supply: weeksOfSupply,
        excess_qty: Number(excessQty.toFixed(2)),
        excess_value_cents: excessValue,
        recommendation: stale ? "Review for obsolete stock disposition" : "Reduce replenishment and redeploy stock",
        category_color: buildCategoryColor(product?.category ?? null),
        flagged
      };
    })
    .filter((row) => row.flagged)
    .sort((left, right) => right.excess_value_cents - left.excess_value_cents);
}

export async function detectExcessObsoleteForTenant(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const flagged = await listExcessObsolete(tenantId);

  for (const row of flagged.slice(0, 50)) {
    const { error } = await supabase.from("exceptions").insert({
      tenant_id: tenantId,
      exception_type: "inventory_excess",
      severity: row.weeks_of_supply > 40 ? "high" : "medium",
      status: "open",
      title: row.recommendation === "Review for obsolete stock disposition" ? "Potential obsolete inventory detected" : "Excess inventory detected",
      description: `${row.product?.sku ?? row.product_id} at ${row.facility?.name ?? row.facility_id} has ${row.weeks_of_supply} weeks of supply.`,
      entity_type: "inventory_position",
      entity_id: row.id,
      entity_name: row.product?.name ?? row.product_id,
      facility_id: row.facility_id,
      priority_score: Math.min(100, Math.max(50, Math.round(row.weeks_of_supply))),
      ai_recommendation: row.recommendation
    });

    if (error) {
      throw new ProblemDetail(500, "Excess Detection Failed", error.message);
    }
  }

  return { flagged: flagged.length };
}

export async function getInventoryTurns(tenantId: string) {
  const supabase = await createSupabaseServiceClient();
  const [transactionsResult, positionsResult] = await Promise.all([
    supabase.from("inventory_transactions").select("*").eq("tenant_id", tenantId),
    supabase.from("inventory_positions").select("*").eq("tenant_id", tenantId)
  ]);

  if (transactionsResult.error || positionsResult.error) {
    throw new ProblemDetail(
      500,
      "Turns Query Failed",
      transactionsResult.error?.message ?? positionsResult.error?.message ?? "Unable to calculate inventory turns."
    );
  }

  const transactions = (transactionsResult.data ?? []) as InventoryTransactionRow[];
  const positions = (positionsResult.data ?? []) as InventoryPositionRow[];
  const cogsCents = transactions
    .filter((transaction) => ["issue", "transfer_out"].includes(transaction.transaction_type))
    .reduce((sum, transaction) => sum + Number(transaction.quantity) * Number(transaction.unit_cost_cents ?? 0), 0);
  const averageInventoryValueCents =
    positions.length > 0
      ? positions.reduce((sum, position) => sum + Number(position.on_hand_qty) * Number(position.unit_cost_cents), 0) / positions.length
      : 0;

  return {
    cogs_cents: Math.round(cogsCents),
    average_inventory_value_cents: Math.round(averageInventoryValueCents),
    annualized_turns: Number((averageInventoryValueCents > 0 ? cogsCents / averageInventoryValueCents : 0).toFixed(2))
  };
}

export async function triggerInventoryPolicyCalculation(input: { tenantId: string; payload: unknown }) {
  return InventoryPolicyTriggerSchema.parse(input.payload);
}
