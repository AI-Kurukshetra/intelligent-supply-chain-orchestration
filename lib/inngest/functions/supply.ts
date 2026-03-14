import { inngest } from "@/lib/inngest/client";
import { MrpEngine } from "@/lib/mrp/engine";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyMrpCompletion, persistMrpResult, setMrpRunStatus, updatePlanningCycleStatus } from "@/lib/supply/service";

type SupplyRunEvent = { data: { run_id: string; tenant_id: string; planning_cycle_id: string } };
type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };

type ProductIdRow = { id: string };

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

export const runMrpJob = inngest.createFunction(
  { id: "run-mrp-job" },
  { event: "supply/mrp.run" },
  async ({ event, step }: { event: SupplyRunEvent; step: Step }) => {
    const engine = new MrpEngine();
    const supabase = await createSupabaseServiceClient();

    await step.run("mark-running", async () => {
      await setMrpRunStatus(event.data.run_id, { status: "running", started_at: new Date().toISOString() });
      await supabase.from("planning_cycles").update({ status: "running" }).eq("id", event.data.planning_cycle_id);
    });

    const productIds = await step.run("load-products", async () => {
      const { data, error } = await supabase.from("products").select("id").eq("tenant_id", event.data.tenant_id).eq("status", "active").is("deleted_at", null);
      if (error) {
        throw new Error(error.message);
      }
      return ((data ?? []) as ProductIdRow[]).map((row: ProductIdRow) => row.id);
    });

    const batches = chunk(productIds, 200);
    const aggregate = { plannedOrders: 0, messages: 0, productsPlanned: 0 };

    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      const result = await step.run(`run-batch-${index + 1}`, async () => engine.run({ tenantId: event.data.tenant_id, planningCycleId: event.data.planning_cycle_id, productIds: batch }));
      await step.run(`persist-batch-${index + 1}`, async () => {
        await persistMrpResult({
          tenantId: event.data.tenant_id,
          planningCycleId: event.data.planning_cycle_id,
          mrpRunId: event.data.run_id,
          plannedOrders: result.plannedOrders,
          messages: result.messages
        });
      });
      aggregate.plannedOrders += result.plannedOrders.length;
      aggregate.messages += result.messages.length;
      aggregate.productsPlanned += result.totals.productsPlanned;
    }

    await step.run("trigger-exception-detection", async () => {
      await inngest.send({ name: "supply/exceptions.detect", data: { run_id: event.data.run_id, tenant_id: event.data.tenant_id, planning_cycle_id: event.data.planning_cycle_id } });
    });

    await step.run("mark-review", async () => {
      await updatePlanningCycleStatus(event.data.tenant_id, event.data.planning_cycle_id, { status: "review" });
      await setMrpRunStatus(event.data.run_id, {
        status: aggregate.messages > 0 ? "completed_with_errors" : "completed",
        processed_products: aggregate.productsPlanned,
        total_products: productIds.length,
        failed_products: 0,
        completed_at: new Date().toISOString(),
        summary: { orders_created: aggregate.plannedOrders, messages_created: aggregate.messages, batch_count: batches.length }
      });
    });

    await step.run("notify-planners", async () => {
      await notifyMrpCompletion(event.data.run_id);
    });

    return { run_id: event.data.run_id, totals: { productsPlanned: aggregate.productsPlanned, ordersCreated: aggregate.plannedOrders, messagesCreated: aggregate.messages } };
  }
);

export const supplyFunctions = [runMrpJob];
