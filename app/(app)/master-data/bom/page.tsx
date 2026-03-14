import { BomCatalog } from "@/components/master-data/bom-catalog";
import { getUserContext } from "@/lib/auth/server";
import { explodeBom, listBomHeaders } from "@/lib/master-data/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BomHeaderRow = {
  id: string;
  product_id: string;
  version: string;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
};

type ProductOption = {
  id: string;
  sku: string;
  name: string;
};

type ExplosionRow = {
  level: number;
  parent_product_id: string;
  component_product_id: string;
  component_sku: string;
  component_name: string;
  required_qty: number;
  uom: string;
};

export default async function MasterBomPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view BOMs.</section>;
  }

  const context = await getUserContext(user.id);
  const [headersResult, productsResult] = await Promise.all([
    listBomHeaders(context.tenantId),
    supabase.from("products").select("id, sku, name").eq("tenant_id", context.tenantId).is("deleted_at", null).order("sku", { ascending: true })
  ]);

  const headers = headersResult as BomHeaderRow[];
  const products = (productsResult.data ?? []) as ProductOption[];
  const uniqueProductIds = Array.from(new Set(headers.map((header: BomHeaderRow) => header.product_id)));
  const explosions = await Promise.all(uniqueProductIds.map(async (productId: string) => [productId, await explodeBom(context.tenantId, productId)] as const));
  const explosionsByProduct = Object.fromEntries(explosions) as Record<string, ExplosionRow[]>;

  return <BomCatalog products={products} headers={headers} explosionsByProduct={explosionsByProduct} />;
}
