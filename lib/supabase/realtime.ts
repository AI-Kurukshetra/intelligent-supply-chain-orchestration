import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type {
  CellLockPayload,
  CellUnlockPayload,
  CellUpdatePayload,
  CursorMovePayload,
  ImpactBroadcastPayload,
  PresenceUser
} from "@/types/planning";
import type { Database } from "@/lib/supabase/types";

export function createPlanningChannel(
  supabase: SupabaseClient<Database> = createClient(),
  sessionId: string
): RealtimeChannel {
  return supabase.channel(`planning:session:${sessionId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: sessionId }
    }
  });
}

export const createNotificationChannel = (userId: string): RealtimeChannel => {
  return createClient().channel(`notifications:${userId}`, {
    config: {
      broadcast: { self: true }
    }
  });
};

export async function broadcastCellUpdate(channel: RealtimeChannel, payload: CellUpdatePayload) {
  await channel.send({ type: "broadcast", event: "cell_update", payload });
}

export async function broadcastCellLock(channel: RealtimeChannel, payload: CellLockPayload) {
  await channel.send({ type: "broadcast", event: "cell_lock", payload });
}

export async function broadcastCellUnlock(channel: RealtimeChannel, payload: CellUnlockPayload) {
  await channel.send({ type: "broadcast", event: "cell_unlock", payload });
}

export async function broadcastImpactResult(channel: RealtimeChannel, payload: ImpactBroadcastPayload) {
  await channel.send({ type: "broadcast", event: "impact_result", payload });
}

export async function broadcastCursorMove(channel: RealtimeChannel, payload: CursorMovePayload) {
  await channel.send({ type: "broadcast", event: "cursor_move", payload });
}

export async function broadcastPresence(channel: RealtimeChannel, user: PresenceUser) {
  await channel.track(user);
}
