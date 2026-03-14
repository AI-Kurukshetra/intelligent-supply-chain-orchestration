import { ProductsPage } from "@/components/master-data/products-page";
import { getUserContext } from "@/lib/auth/server";
import { searchProducts } from "@/lib/master-data/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MasterProductsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view products.</section>;
  }

  const context = await getUserContext(user.id);
  const params = (await searchParams) ?? {};
  const search = typeof params.search === "string" ? params.search : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";

  const products = await searchProducts({
    tenantId: context.tenantId,
    search: search || null,
    status: status || null,
    category: category || null,
    limit: 25,
    cursor: null
  });

  return <ProductsPage initialRows={products.data} initialSearch={search} initialStatus={status} initialCategory={category} />;
}
