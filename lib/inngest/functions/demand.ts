import { inngest } from "@/lib/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { incrementForecastRunProgress, listFacilities, listActiveProducts, markForecastRunStatus, maybeNotifyRunCompletion, runForecastForProduct } from "@/lib/demand/service";

type DemandRunEvent = {
  data: {
    run_id: string;
    tenant_id: string;
    product_ids: string[];
    facility_id: string;
    horizon_weeks: number;
  };
};

type DemandSingleEvent = {
  data: {
    run_id: string;
    tenant_id: string;
    product_id: string;
    facility_id: string;
    horizon_weeks: number;
  };
};

type Step = { run<T>(id: string, handler: () => Promise<T> | T): Promise<T> };

export const runForecastJob = inngest.createFunction(
  { id: "run-forecast-job" },
  { event: "demand/forecast.run" },
  async ({ event, step }: { event: DemandRunEvent; step: Step }) => {
    await step.run("mark-running", async () => {
      await markForecastRunStatus(event.data.run_id, { status: "running", started_at: new Date().toISOString() });
    });

    await step.run("load-config", async () => ({
      runId: event.data.run_id,
      tenantId: event.data.tenant_id,
      facilityId: event.data.facility_id,
      horizonWeeks: event.data.horizon_weeks,
      productIds: event.data.product_ids
    }));

    await step.run("fan-out-products", async () => {
      await inngest.send(
        event.data.product_ids.map((productId) => ({
          name: "demand/forecast.single",
          data: {
            run_id: event.data.run_id,
            tenant_id: event.data.tenant_id,
            product_id: productId,
            facility_id: event.data.facility_id,
            horizon_weeks: event.data.horizon_weeks
          }
        }))
      );
    });

    await step.run("mark-dispatched", async () => {
      await markForecastRunStatus(event.data.run_id, { status: "dispatched" });
    });

    return { run_id: event.data.run_id, queued_products: event.data.product_ids.length };
  }
);

export const runSingleProductForecast = inngest.createFunction(
  { id: "run-single-product-forecast" },
  { event: "demand/forecast.single" },
  async ({ event, step }: { event: DemandSingleEvent; step: Step }) => {
    let failed = false;

    try {
      await step.run("forecast-product", async () => {
        await runForecastForProduct({
          tenantId: event.data.tenant_id,
          runId: event.data.run_id,
          productId: event.data.product_id,
          facilityId: event.data.facility_id,
          horizonWeeks: event.data.horizon_weeks
        });
      });
    } catch (error) {
      failed = true;
    }

    const run = await step.run("update-progress", async () => incrementForecastRunProgress({ runId: event.data.run_id, failed }));
    await step.run("notify-if-complete", async () => maybeNotifyRunCompletion(run));

    if (failed) {
      throw new Error(`Forecast failed for product ${event.data.product_id}.`);
    }

    return { run_id: event.data.run_id, product_id: event.data.product_id };
  }
);

export const nightlyForecastRefresh = inngest.createFunction(
  { id: "nightly-forecast-refresh" },
  { cron: "0 2 * * *" },
  async ({ step }: { step: Step }) => {
    const serviceClient = await createSupabaseServiceClient();
    const { data: tenants, error } = await serviceClient.from("organizations").select("id").eq("status", "active");
    if (error) {
      throw new Error(error.message);
    }

    await step.run("schedule-nightly-runs", async () => {
      for (const tenant of tenants ?? []) {
        const facilities = await listFacilities(tenant.id as string);
        const products = await listActiveProducts(tenant.id as string);
        if (facilities.length === 0 || products.length === 0) {
          continue;
        }

        const facilityId = facilities[0]?.id;
        const runId = crypto.randomUUID();
        await serviceClient.from("forecast_runs").insert({
          id: runId,
          tenant_id: tenant.id,
          facility_id: facilityId,
          horizon_weeks: 13,
          status: "queued",
          product_ids: products.map((product) => product.id),
          total_products: products.length,
          processed_products: 0,
          failed_products: 0,
          result_summary: { scheduled_by: "nightlyForecastRefresh" }
        });

        await inngest.send({
          name: "demand/forecast.run",
          data: {
            run_id: runId,
            tenant_id: tenant.id,
            product_ids: products.map((product) => product.id),
            facility_id: facilityId,
            horizon_weeks: 13
          }
        });
      }
    });

    return { scheduled_tenants: (tenants ?? []).length };
  }
);

export const demandFunctions = [runForecastJob, runSingleProductForecast, nightlyForecastRefresh];
