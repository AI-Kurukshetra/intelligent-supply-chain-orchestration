import type { Json } from "@/lib/supabase/types";

export type ExceptionSeverity = "critical" | "high" | "medium" | "low";

export type ExceptionCandidate = {
  exception_type: string;
  severity: ExceptionSeverity;
  title: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  facility_id: string | null;
  context_json: Record<string, Json>;
};

type QueryResult<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;
type QuerySingleResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type QueryBuilder<T> = {
  select(columns: string): QueryBuilder<T>;
  eq(column: string, value: string): QueryBuilder<T>;
  in(column: string, values: string[]): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(value: number): QueryBuilder<T>;
  gte(column: string, value: string): QueryBuilder<T>;
  lte(column: string, value: string): QueryBuilder<T>;
  single(): QuerySingleResult<T>;
  maybeSingle(): QuerySingleResult<T>;
  then<TResult1 = { data: T[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
};

export type DetectorSupabase = {
  from<T = never>(table: string): QueryBuilder<T>;
};

export type Detector = (supabase: DetectorSupabase, tenantId: string) => Promise<ExceptionCandidate[]>;
