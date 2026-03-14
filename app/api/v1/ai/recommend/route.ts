import { getUserContext } from "@/lib/auth/server";
import { getRecommendationStream } from "@/lib/integrations/service";
import { AiRecommendSchema } from "@/lib/validation/integrations";
import { requireAuth, withErrorHandler } from "@/lib/utils/errors";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (request) => {
  const user = await requireAuth(request);
  const userContext = await getUserContext(user.id);
  const payload = AiRecommendSchema.parse(await request.json());
  const result = await getRecommendationStream(userContext.tenantId, payload.exception_id);
  return result.toTextStreamResponse();
});
