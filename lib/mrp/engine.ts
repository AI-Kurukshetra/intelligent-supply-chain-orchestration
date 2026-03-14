import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import { applyLotSizing } from "@/lib/mrp/lot-sizing";
import { ProblemDetail } from "@/lib/utils/errors";

type MrpParams = {
  tenantId: string;
  planningCycleId: string;
  productIds?: string[];
};

type MrpMessage = {
  severity: "critical" | "high" | "medium" | "low";
  message_type: string;
  title: string;
  detail: string;
  product_id?: string | null;
  facility_id?: string | null;
  payload?: Record<string, Json>;
};

type PlannedOrderDraft = {
  tenant_id: string;
  planning_cycle_id: string;
  product_id: string;
  facility_id: string;
  order_type: "production" | "purchase" | "transfer";
  status: "planned";
  quantity: number;
  uom: string;
  planned_start_date: string;
  planned_end_date: string;
  due_date: string;
  supplier_id: string | null;
  firm_planned: boolean;
  pegging: Json;
};

type MrpResult = {
  plannedOrders: PlannedOrderDraft[];
  messages: MrpMessage[];
  totals: { productsPlanned: number; ordersCreated: number; messagesCreated: number };
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  uom: string;
  lead_time_days: number;
  min_order_qty: number;
  attributes: Record<string, unknown> | null;
};

type PolicyRow = {
  product_id: string;
  facility_id: string;
  is_override: boolean;
  calculated_rop: number | null;
  calculated_safety_stock: number | null;
  ordering_policy?: string | null;
} & Record<string, unknown>;

type CycleRow = {
  id: string;
  tenant_id: string;
  horizon_start: string;
  horizon_end: string;
};

type ForecastRow = {
  product_id: string;
  facility_id: string;
  period_start: string;
  period_end: string;
  forecast_qty: number;
};

type OverrideRow = {
  product_id: string;
  facility_id: string;
  period_start: string;
  proposed_qty: number;
};

type SupplierRow = {
  id: string;
  lead_time_days: number;
  status: string;
};

type InventoryRow = {
  product_id: string;
  facility_id: string;
  on_hand_qty: number;
  reserved_qty: number;
};

type BomLineRow = {
  parent_product_id: string;
  component_product_id: string;
  quantity: number;
  uom: string;
};

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function computeBomDepths(lines: Array<{ parent_product_id: string; component_product_id: string }>, products: ProductRow[]) {
  const childrenByParent = new Map<string, string[]>();
  lines.forEach((line) => {
    const current = childrenByParent.get(line.parent_product_id) ?? [];
    current.push(line.component_product_id);
    childrenByParent.set(line.parent_product_id, current);
  });

  const memo = new Map<string, number>();
  const depthOf = (productId: string): number => {
    if (memo.has(productId)) {
      return memo.get(productId) ?? 0;
    }
    const children = childrenByParent.get(productId) ?? [];
    const depth = children.length === 0 ? 0 : 1 + Math.max(...children.map(depthOf));
    memo.set(productId, depth);
    return depth;
  };

  return products
    .map((product) => ({ product, depth: depthOf(product.id) }))
    .sort((left, right) => left.depth - right.depth)
    .map((entry) => entry.product);
}

export class MrpEngine {
  async run(params: MrpParams): Promise<MrpResult> {
    const supabase = await createSupabaseServiceClient();
    const { data: cycle, error: cycleError } = await supabase
      .from("planning_cycles")
      .select("id, tenant_id, horizon_start, horizon_end")
      .eq("tenant_id", params.tenantId)
      .eq("id", params.planningCycleId)
      .single();

    if (cycleError || !cycle) {
      throw new ProblemDetail(404, "Not Found", cycleError?.message ?? "Planning cycle not found.");
    }

    const planningCycle = cycle as CycleRow;
    let productsQuery = supabase.from("products").select("id, sku, name, uom, lead_time_days, min_order_qty, attributes").eq("tenant_id", params.tenantId).eq("status", "active").is("deleted_at", null);
    let forecastsQuery = supabase.from("statistical_forecasts").select("*").eq("tenant_id", params.tenantId).gte("period_start", planningCycle.horizon_start).lte("period_end", planningCycle.horizon_end);
    let overridesQuery = supabase.from("forecast_overrides").select("*").eq("tenant_id", params.tenantId).eq("status", "approved").gte("period_start", planningCycle.horizon_start).lte("period_end", planningCycle.horizon_end);

    if (params.productIds && params.productIds.length > 0) {
      productsQuery = productsQuery.in("id", params.productIds);
      forecastsQuery = forecastsQuery.in("product_id", params.productIds);
      overridesQuery = overridesQuery.in("product_id", params.productIds);
    }

    const [productsResult, policiesResult, linesResult, forecastsResult, overridesResult, suppliersResult, inventoryResult] = await Promise.all([
      productsQuery,
      supabase.from("inventory_policies").select("*").eq("tenant_id", params.tenantId),
      supabase.from("bom_lines").select("parent_product_id, component_product_id, quantity, uom").eq("tenant_id", params.tenantId),
      forecastsQuery,
      overridesQuery,
      supabase.from("suppliers").select("id, lead_time_days, status").eq("tenant_id", params.tenantId).eq("status", "active"),
      supabase.from("inventory_positions").select("product_id, facility_id, on_hand_qty, reserved_qty").eq("tenant_id", params.tenantId)
    ]);

    if (productsResult.error || policiesResult.error || linesResult.error || forecastsResult.error || overridesResult.error || suppliersResult.error || inventoryResult.error) {
      throw new ProblemDetail(
        500,
        "MRP Load Failed",
        productsResult.error?.message ?? policiesResult.error?.message ?? linesResult.error?.message ?? forecastsResult.error?.message ?? overridesResult.error?.message ?? suppliersResult.error?.message ?? inventoryResult.error?.message ?? "Unable to load MRP inputs."
      );
    }

    const forecasts = (forecastsResult.data ?? []) as ForecastRow[];
    const overrides = (overridesResult.data ?? []) as OverrideRow[];
    const bomLines = (linesResult.data ?? []) as BomLineRow[];
    const products = computeBomDepths(bomLines, (productsResult.data ?? []) as ProductRow[]);
    const policyMap = new Map(((policiesResult.data ?? []) as PolicyRow[]).map((policy) => [`${policy.product_id}:${policy.facility_id}`, policy]));
    const supplierIds = new Set(((suppliersResult.data ?? []) as SupplierRow[]).map((supplier: SupplierRow) => supplier.id));
    const inventoryRows = (inventoryResult.data ?? []) as InventoryRow[];
    const grossRequirements = new Map<string, number>();
    const messages: MrpMessage[] = [];
    const plannedOrders: PlannedOrderDraft[] = [];

    forecasts.forEach((forecast) => {
      const override = overrides.find((candidate) => candidate.product_id === forecast.product_id && candidate.facility_id === forecast.facility_id && candidate.period_start === forecast.period_start);
      grossRequirements.set(`${forecast.product_id}:${forecast.facility_id}:${forecast.period_start}:${forecast.period_end}`, Number(override?.proposed_qty ?? forecast.forecast_qty));
    });

    for (const product of products) {
      const productForecasts = forecasts.filter((forecast) => forecast.product_id === product.id);
      for (const period of productForecasts) {
        const requirementKey = `${product.id}:${period.facility_id}:${period.period_start}:${period.period_end}`;
        const grossRequirement = Number(grossRequirements.get(requirementKey) ?? 0);
        if (grossRequirement <= 0) {
          continue;
        }

        const { data: netRequirementValue, error: netRequirementError } = await supabase.rpc("calculate_net_requirements", {
          p_tenant_id: params.tenantId,
          p_product_id: product.id,
          p_facility_id: period.facility_id,
          p_period_start: period.period_start,
          p_period_end: period.period_end
        });
        if (netRequirementError) {
          throw new ProblemDetail(500, "Net Requirement Failed", netRequirementError.message);
        }

        const policy = policyMap.get(`${product.id}:${period.facility_id}`) ?? null;
        const sizedQuantity = applyLotSizing(Number(netRequirementValue ?? grossRequirement), product, policy);
        if (sizedQuantity <= 0) {
          continue;
        }

        const supplierId = typeof product.attributes?.preferred_supplier_id === "string" ? String(product.attributes.preferred_supplier_id) : null;
        const orderType: PlannedOrderDraft["order_type"] = supplierId && supplierIds.has(supplierId) ? "purchase" : "production";
        const plannedEndDate = period.period_start;
        const plannedStartDate = addDays(plannedEndDate, -product.lead_time_days);
        const inventory = inventoryRows.find((row) => row.product_id === product.id && row.facility_id === period.facility_id);

        plannedOrders.push({
          tenant_id: params.tenantId,
          planning_cycle_id: params.planningCycleId,
          product_id: product.id,
          facility_id: period.facility_id,
          order_type: orderType,
          status: "planned",
          quantity: Number(sizedQuantity.toFixed(4)),
          uom: product.uom,
          planned_start_date: plannedStartDate,
          planned_end_date: plannedEndDate,
          due_date: period.period_end,
          supplier_id: supplierId,
          firm_planned: false,
          pegging: [{ source: "forecast", period_start: period.period_start, period_end: period.period_end, gross_requirement: grossRequirement }]
        });

        if (!supplierId) {
          messages.push({ severity: "medium", message_type: "missing_supplier", title: "No preferred supplier configured", detail: `${product.sku} has no active preferred supplier, so the order will be planned as internal production.`, product_id: product.id, facility_id: period.facility_id, payload: { due_date: period.period_end } });
        }
        if ((Number(inventory?.on_hand_qty ?? 0) - Number(inventory?.reserved_qty ?? 0)) <= 0) {
          messages.push({ severity: "high", message_type: "zero_stock", title: "Zero available stock", detail: `${product.sku} has no available stock while gross demand exists in the cycle horizon.`, product_id: product.id, facility_id: period.facility_id, payload: { period_start: period.period_start } });
        }
        if (product.lead_time_days > 21) {
          messages.push({ severity: "medium", message_type: "capacity_violation", title: "Long lead-time exposure", detail: `${product.sku} carries a lead time of ${product.lead_time_days} days and may strain the cycle response window.`, product_id: product.id, facility_id: period.facility_id, payload: { lead_time_days: product.lead_time_days } });
        }

        const { data: explodedComponents } = await supabase.rpc("explode_bom", { p_tenant_id: params.tenantId, p_product_id: product.id, p_quantity: sizedQuantity });
        ((explodedComponents ?? []) as Array<{ component_product_id: string; required_qty: number }>).forEach((component) => {
          const key = `${component.component_product_id}:${period.facility_id}:${period.period_start}:${period.period_end}`;
          grossRequirements.set(key, Number(grossRequirements.get(key) ?? 0) + Number(component.required_qty ?? 0));
        });
      }
    }

    return {
      plannedOrders,
      messages,
      totals: {
        productsPlanned: new Set(plannedOrders.map((order) => order.product_id)).size,
        ordersCreated: plannedOrders.length,
        messagesCreated: messages.length
      }
    };
  }
}

export type { MrpParams, MrpResult, MrpMessage, PlannedOrderDraft };
