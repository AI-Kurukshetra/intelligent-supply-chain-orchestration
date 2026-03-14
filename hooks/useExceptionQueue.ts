import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

export type ExceptionQueueItem = {
  id: string;
  exception_type: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  entity_id: string | null;
  entity_name: string | null;
  priority_score: number;
  ai_recommendation: string | null;
  created_at: string;
  context_json: Record<string, unknown>;
};

export function useExceptionQueue(tenantId: string, initialItems: ExceptionQueueItem[]) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ExceptionQueueItem[]>(initialItems);

  useEffect(() => {
    const channel = supabase
      .channel(`exceptions-queue:${tenantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "exceptions", filter: `tenant_id=eq.${tenantId}` }, (payload: { new: ExceptionQueueItem }) => {
        if (payload.new.status === "resolved") {
          return;
        }
        setItems((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "exceptions", filter: `tenant_id=eq.${tenantId}` }, (payload: { new: ExceptionQueueItem }) => {
        setItems((current) => current.map((item) => (item.id === payload.new.id ? payload.new : item)).filter((item) => item.status !== "resolved"));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, tenantId]);

  return { items, setItems };
}
