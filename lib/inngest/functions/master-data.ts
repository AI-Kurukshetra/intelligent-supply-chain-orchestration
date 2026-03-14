import { createElement } from "react";

import { resend } from "@/lib/email/client";
import { inngest } from "@/lib/inngest/client";
import { parseProductWorkbook, upsertProductsInChunks } from "@/lib/master-data/service";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type ImportEvent = {
  data: {
    job_id: string;
    file_url: string;
    tenant_id: string;
    user_id: string;
  };
};

type InngestStep = {
  run<T>(id: string, handler: () => Promise<T> | T): Promise<T>;
};

export const bulkImportProducts = inngest.createFunction(
  { id: "bulk-import-products" },
  { event: "master/products.import" },
  async ({ event, step }: { event: ImportEvent; step: InngestStep }) => {
    const serviceClient = await createSupabaseServiceClient();

    await step.run("mark-job-running", async () => {
      await serviceClient.from("job_results").update({ status: "running" }).eq("id", event.data.job_id);
    });

    const fileBuffer = await step.run("download-file", async () => {
      const download = await serviceClient.storage.from("master-data-imports").download(event.data.file_url);
      if (download.error) {
        throw new Error(download.error.message);
      }
      return await download.data.arrayBuffer();
    });

    const parsed = await step.run("parse-workbook", async () => parseProductWorkbook(fileBuffer));
    const imported = await step.run("upsert-products", async () => upsertProductsInChunks(event.data.tenant_id, parsed.validRows));

    await step.run("save-result", async () => {
      await serviceClient
        .from("job_results")
        .update({
          status: parsed.errors.length > 0 ? "completed_with_errors" : "completed",
          result: {
            imported,
            errors: parsed.errors,
            row_count: parsed.rowCount,
            completed_at: new Date().toISOString()
          }
        })
        .eq("id", event.data.job_id);
    });

    await step.run("send-email", async () => {
      const { data: profile } = await serviceClient.from("profiles").select("email, first_name").eq("id", event.data.user_id).single();
      if (!profile?.email) {
        return;
      }

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "ISCOP <no-reply@iscop.ai>",
        to: profile.email,
        subject: "Product import completed",
        react: createElement("div", null, [
          createElement("h1", { key: "title" }, "Product import complete"),
          createElement("p", { key: "summary" }, `${profile.first_name ?? "Team"}, ${imported} products were imported. ${parsed.errors.length} row errors were captured.`),
          createElement("p", { key: "job" }, `Job ID: ${event.data.job_id}`)
        ])
      });
    });

    return { job_id: event.data.job_id, imported, errors: parsed.errors };
  }
);

export const masterDataFunctions = [bulkImportProducts];
