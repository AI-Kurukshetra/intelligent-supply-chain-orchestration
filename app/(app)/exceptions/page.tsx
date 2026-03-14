import { ExceptionsQueuePage } from "@/components/exceptions/exceptions-queue-page";
import { getUserContext } from "@/lib/auth/server";
import { listExceptions } from "@/lib/exceptions/orchestrator";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ExceptionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view exceptions.</section>;
  }
  const context = await getUserContext(user.id);
  const items = await listExceptions({ tenantId: context.tenantId });
  return <ExceptionsQueuePage tenantId={context.tenantId} initialItems={items as never} />;
}

