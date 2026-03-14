import { inngest } from "@/lib/inngest/client";
import { calculateSupplierScorecardsForTenant } from "@/lib/collaboration/service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };

export const calculateSupplierScorecard = inngest.createFunction(
  { id: "calculate-supplier-scorecard" },
  { cron: "0 0 1 * *" },
  async ({ step }: { step: Step }) => {
    const supabase = await createSupabaseServiceClient();
    const tenants = await step.run("load-tenants", async () => {
      const { data, error } = await supabase.from("organizations").select("id").eq("status", "active");
      if (error) throw new Error(error.message);
      return (data ?? []) as Array<{ id: string }>;
    });
    for (const tenant of tenants) {
      await step.run(`score-${tenant.id}`, async () => calculateSupplierScorecardsForTenant(tenant.id));
    }
    return { tenants_processed: tenants.length };
  }
);

export const collaborationFunctions = [calculateSupplierScorecard];
