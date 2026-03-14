import { inngest } from "@/lib/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { broadcastImpactResult, createPlanningChannel } from "@/lib/supabase/realtime";

type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };
type ImpactEvent = { data: { session_id: string; change_id: string; tenant_id: string } };

export const calculateImpact = inngest.createFunction(
  { id: "calculate-planning-impact" },
  { event: "planning/impact.calculate" },
  async ({ event, step }: { event: ImpactEvent; step: Step }) => {
    const supabase = await createSupabaseServiceClient();

    const changedCell = await step.run("load-changed-cell", async () => {
      const { data, error } = await supabase.from("planning_cells").select("*").eq("tenant_id", event.data.tenant_id).eq("id", event.data.change_id).single();
      if (error || !data) {
        throw new Error(error?.message ?? "Planning cell not found.");
      }
      return data as { entity_id: string; period_start: string; current_value: unknown; entity_type: string };
    });

    const plannedOrders = await step.run("load-supply", async () => {
      const { data, error } = await supabase
        .from("planned_orders")
        .select("product_id, due_date, quantity")
        .eq("tenant_id", event.data.tenant_id)
        .eq("product_id", changedCell.entity_id);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Array<{ product_id: string; due_date: string; quantity: number }>;
    });

    const projectedDemand = Number(changedCell.current_value ?? 0);
    const coveredSupply = plannedOrders
      .filter((order) => order.due_date >= changedCell.period_start)
      .reduce((sum, order) => sum + Number(order.quantity), 0);
    const gap = Math.max(projectedDemand - coveredSupply, 0);

    const payload = {
      changeId: event.data.change_id,
      summary: gap > 0 ? "Supply risk detected from collaborative change." : "No immediate supply gap detected.",
      affectedProducts: [changedCell.entity_id],
      supplyGaps: gap > 0 ? [{ product: changedCell.entity_id, period: changedCell.period_start, gap_qty: Number(gap.toFixed(2)) }] : [],
      inventoryRisks: gap > 0 ? ["Projected demand exceeds planned supply coverage."] : [],
      actionsRecommended: gap > 0 ? ["Review planned orders", "Consider expediting open supply", "Escalate to procurement"] : ["Continue monitoring session impact"]
    };

    await step.run("broadcast-result", async () => {
      const channel = createPlanningChannel(supabase as never, event.data.session_id);
      await channel.subscribe();
      await broadcastImpactResult(channel, payload);
      await supabase.removeChannel(channel);
    });

    return payload;
  }
);

export const planningFunctions = [calculateImpact];
