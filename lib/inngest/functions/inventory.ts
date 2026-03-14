import { inngest } from "@/lib/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  calculatePoliciesForTenant,
  detectExcessObsoleteForTenant
} from "@/lib/inventory/service";

type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };

type PolicyEvent = { data: { tenant_id: string; service_level_pct?: number } };

export const calculateInventoryPolicies = inngest.createFunction(
  { id: "calculate-inventory-policies" },
  { cron: "0 3 * * *" },
  async ({ step }: { step: Step }) => {
    const supabase = await createSupabaseServiceClient();
    const tenants = await step.run("load-tenants", async () => {
      const { data, error } = await supabase.from("organizations").select("id").order("created_at", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Array<{ id: string }>;
    });

    const results = [] as Array<{ tenant_id: string; calculated: number; positions_updated: number }>;
    for (const tenant of tenants) {
      const result = await step.run(`calculate-${tenant.id}`, async () => calculatePoliciesForTenant(tenant.id));
      results.push({ tenant_id: tenant.id, ...result });
    }

    return { tenants_processed: results.length, results };
  }
);

export const calculateInventoryPoliciesOnDemand = inngest.createFunction(
  { id: "calculate-inventory-policies-on-demand" },
  { event: "inventory/policies.calculate" },
  async ({ event, step }: { event: PolicyEvent; step: Step }) => {
    return step.run("calculate-single-tenant", async () => ({
      tenant_id: event.data.tenant_id,
      ...(await calculatePoliciesForTenant(event.data.tenant_id, event.data.service_level_pct))
    }));
  }
);

export const detectExcessObsolete = inngest.createFunction(
  { id: "detect-excess-obsolete" },
  { cron: "0 4 * * 1" },
  async ({ step }: { step: Step }) => {
    const supabase = await createSupabaseServiceClient();
    const tenants = await step.run("load-tenants", async () => {
      const { data, error } = await supabase.from("organizations").select("id").order("created_at", { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Array<{ id: string }>;
    });

    const results = [] as Array<{ tenant_id: string; flagged: number }>;
    for (const tenant of tenants) {
      const result = await step.run(`detect-${tenant.id}`, async () => detectExcessObsoleteForTenant(tenant.id));
      results.push({ tenant_id: tenant.id, ...result });
    }

    return { tenants_processed: results.length, results };
  }
);

export const inventoryFunctions = [
  calculateInventoryPolicies,
  calculateInventoryPoliciesOnDemand,
  detectExcessObsolete
];
