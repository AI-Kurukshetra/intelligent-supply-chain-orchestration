import { DemandOverridesTable } from "@/components/demand/demand-overrides-table";
import { getUserContext } from "@/lib/auth/server";
import { listActiveProducts, listOverrides } from "@/lib/demand/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DemandOverridesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view overrides.</section>;
  }

  const context = await getUserContext(user.id);
  const params = (await searchParams) ?? {};
  const overrides = await listOverrides({
    tenantId: context.tenantId,
    status: typeof params.status === "string" ? params.status : null,
    productId: typeof params.product_id === "string" ? params.product_id : null,
    periodFrom: typeof params.period_from === "string" ? params.period_from : null,
    periodTo: typeof params.period_to === "string" ? params.period_to : null
  });
  const products = await listActiveProducts(context.tenantId);

  return <DemandOverridesTable initialOverrides={overrides} products={products} />;
}
