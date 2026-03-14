import { PlanningWorkbench } from "@/components/planning/planning-workbench";
import { getUserContext } from "@/lib/auth/server";
import { listPlanningCells, listPlanningSessions } from "@/lib/planning/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PlanningWorkbenchPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Please sign in to view concurrent planning.</section>;
  }

  const context = await getUserContext(user.id);
  const sessions = await listPlanningSessions(context.tenantId, null);
  const params = (await searchParams) ?? {};
  const sessionId = typeof params.session_id === "string" ? params.session_id : sessions[0]?.id ?? null;
  if (!sessionId) {
    return <section className="rounded-3xl bg-white p-8 shadow-sm">Create a planning session to start collaborating.</section>;
  }

  const session = sessions.find((entry) => entry.id === sessionId) ?? sessions[0];
  const cells = await listPlanningCells(context.tenantId, session.id);
  const shapedCells = cells.map((cell) => ({
    id: cell.id,
    sessionId: cell.session_id,
    entityType: cell.entity_type,
    entityId: cell.entity_id,
    fieldName: cell.field_name,
    periodStart: cell.period_start,
    currentValue: cell.current_value,
    originalValue: cell.original_value,
    version: cell.version,
    lockedBy: cell.locked_by,
    lockedAt: cell.locked_at,
    lastModifiedBy: cell.last_modified_by,
    lastModifiedAt: cell.last_modified_at
  }));

  return <PlanningWorkbench session={session} cells={shapedCells} user={{ userId: user.id, userName: context.profile.first_name ?? context.profile.email, avatarUrl: null }} />;
}
