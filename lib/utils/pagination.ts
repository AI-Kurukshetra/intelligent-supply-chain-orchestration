import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export interface CursorPage<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

type QueryWithLimit<T> = {
  lt(column: string, value: string): QueryWithLimit<T>;
  limit(value: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
};

export function encodeCursor(id: string, created_at: string): string {
  return Buffer.from(JSON.stringify({ id, created_at }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { id: string; created_at: string } {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
    id: string;
    created_at: string;
  };
}

export async function applyPagination<T extends { id: string; created_at: string }>(
  query: QueryWithLimit<T>,
  cursor?: string,
  limit = DEFAULT_PAGE_SIZE
): Promise<CursorPage<T>> {
  const boundedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const pagedQuery = cursor ? query.lt("created_at", decodeCursor(cursor).created_at) : query;
  const result = await pagedQuery.limit(boundedLimit + 1);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = result.data ?? [];
  const hasMore = rows.length > boundedLimit;
  const data = hasMore ? rows.slice(0, boundedLimit) : rows;
  const lastRow = data.at(-1);

  return {
    data,
    has_more: hasMore,
    next_cursor: hasMore && lastRow ? encodeCursor(lastRow.id, lastRow.created_at) : null
  };
}