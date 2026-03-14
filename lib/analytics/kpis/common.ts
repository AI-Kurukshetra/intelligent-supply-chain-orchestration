import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type AnalyticsClient = SupabaseClient<Database>;

export type PeriodInput = {
  from: string;
  to: string;
  granularity?: "daily" | "weekly" | "monthly";
};

export type KpiValue = {
  kpi_code: string;
  kpi_name: string;
  value: number;
  uom: string;
  dimension?: Record<string, unknown>;
  target_value?: number | null;
};

export function daysBetween(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
}

export function safeDivide(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

export async function selectRows<T>(query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as T[];
}
