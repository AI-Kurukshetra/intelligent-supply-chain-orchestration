export function applyLotSizing(
  netReq: number,
  product: { min_order_qty: number; attributes?: Record<string, unknown> | null },
  policy?: { ordering_policy?: string | null } | null
): number {
  if (netReq <= 0) {
    return 0;
  }

  const orderingPolicy = String(policy?.ordering_policy ?? (product.attributes?.ordering_policy as string | undefined) ?? "lot_for_lot");
  const minOrderQty = Math.max(Number(product.min_order_qty ?? 1), 1);
  const fixedOrderQty = Math.max(Number(product.attributes?.foq ?? 0), 0);

  switch (orderingPolicy) {
    case "fixed_order_qty":
      if (fixedOrderQty <= 0) {
        return Math.max(netReq, minOrderQty);
      }
      return Math.ceil(netReq / fixedOrderQty) * fixedOrderQty;
    case "min_order_qty":
      return Math.max(netReq, minOrderQty);
    case "lot_for_lot":
    default:
      return Math.max(netReq, minOrderQty > netReq ? minOrderQty : netReq);
  }
}
