import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { analyticsFunctions } from "@/lib/inngest/functions/analytics";
import { collaborationFunctions } from "@/lib/inngest/functions/collaboration";
import { demandFunctions } from "@/lib/inngest/functions/demand";
import { exceptionFunctions } from "@/lib/inngest/functions/exceptions";
import { integrationFunctions } from "@/lib/inngest/functions/integration";
import { inventoryFunctions } from "@/lib/inngest/functions/inventory";
import { masterDataFunctions } from "@/lib/inngest/functions/master-data";
import { planningFunctions } from "@/lib/inngest/functions/planning";
import { supplyFunctions } from "@/lib/inngest/functions/supply";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    ...masterDataFunctions,
    ...demandFunctions,
    ...supplyFunctions,
    ...inventoryFunctions,
    ...planningFunctions,
    ...exceptionFunctions,
    ...collaborationFunctions,
    ...analyticsFunctions,
    ...integrationFunctions
  ]
});
