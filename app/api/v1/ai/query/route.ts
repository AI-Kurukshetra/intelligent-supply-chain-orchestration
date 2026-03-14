import { getUserContext } from "@/lib/auth/server";
import { answerNaturalLanguageQuery } from "@/lib/integrations/service";
import { AiQuerySchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = AiQuerySchema.parse(await request.json());
  return Response.json(await answerNaturalLanguageQuery(userContext.tenantId, payload.question));
});
