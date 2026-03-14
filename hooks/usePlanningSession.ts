"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  broadcastCellLock,
  broadcastCellUnlock,
  broadcastCellUpdate,
  broadcastPresence,
  createPlanningChannel
} from "@/lib/supabase/realtime";
import type {
  CellLockPayload,
  CellUnlockPayload,
  CellUpdatePayload,
  ImpactResult,
  PlanningCellKey,
  PlanningCellState,
  PlanningUserInfo,
  PresenceUser
} from "@/types/planning";

function buildCellKey(cell: { entityId: string; periodStart: string; fieldName: string }): PlanningCellKey {
  return `${cell.entityId}:${cell.periodStart}:${cell.fieldName}`;
}

type BroadcastEnvelope<T> = { payload: T };
type SubscriptionStatus = "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR" | "CLOSED";

export function usePlanningSession(
  sessionId: string,
  initialCells: PlanningCellState[],
  currentUser: PlanningUserInfo
) {
  const supabase = useMemo(() => createClient(), []);
  const [cells, setCells] = useState<Map<PlanningCellKey, PlanningCellState>>(
    () => new Map(initialCells.map((cell) => [buildCellKey({ entityId: cell.entityId, periodStart: cell.periodStart, fieldName: cell.fieldName }), cell]))
  );
  const [lockedCells, setLockedCells] = useState<Map<string, PlanningUserInfo>>(new Map());
  const [participants, setParticipants] = useState<PresenceUser[]>([]);
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [conflict, setConflict] = useState<{ cellId: string; mine: unknown; theirs: unknown; currentVersion: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof createPlanningChannel> | null>(null);

  useEffect(() => {
    const channel = createPlanningChannel(supabase, sessionId);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "cell_update" }, ({ payload }: BroadcastEnvelope<CellUpdatePayload>) => {
        setCells((current) => {
          const next = new Map(current);
          const cell = Array.from(next.values()).find((entry) => entry.id === payload.cellId);
          if (!cell) {
            return current;
          }
          next.set(buildCellKey({ entityId: cell.entityId, periodStart: cell.periodStart, fieldName: cell.fieldName }), {
            ...cell,
            currentValue: payload.value,
            version: payload.version,
            lastModifiedBy: payload.userId,
            lastModifiedAt: new Date().toISOString()
          });
          return next;
        });
      })
      .on("broadcast", { event: "cell_lock" }, ({ payload }: BroadcastEnvelope<CellLockPayload>) => {
        setLockedCells((current) => new Map(current).set(payload.cellId, { userId: payload.userId, userName: payload.userName }));
      })
      .on("broadcast", { event: "cell_unlock" }, ({ payload }: BroadcastEnvelope<CellUnlockPayload>) => {
        setLockedCells((current) => {
          const next = new Map(current);
          next.delete(payload.cellId);
          return next;
        });
      })
      .on("broadcast", { event: "impact_result" }, ({ payload }: BroadcastEnvelope<ImpactResult>) => {
        setImpactResult(payload);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const next = Object.values(state).flatMap((entries) => entries as PresenceUser[]);
        setParticipants(next);
      })
      .subscribe(async (status: SubscriptionStatus) => {
        if (status === "SUBSCRIBED") {
          await broadcastPresence(channel, {
            userId: currentUser.userId,
            userName: currentUser.userName,
            avatarUrl: currentUser.avatarUrl ?? null,
            currentCell: null
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.avatarUrl, currentUser.userId, currentUser.userName, sessionId, supabase]);

  async function lockCell(cellId: string) {
    await fetch(`/api/v1/planning/sessions/${sessionId}/cells/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock", cell_id: cellId })
    });
    if (channelRef.current) {
      await broadcastCellLock(channelRef.current, { cellId, userId: currentUser.userId, userName: currentUser.userName });
    }
  }

  async function unlockCell(cellId: string) {
    await fetch(`/api/v1/planning/sessions/${sessionId}/cells/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", cell_id: cellId })
    });
    if (channelRef.current) {
      await broadcastCellUnlock(channelRef.current, { cellId, userId: currentUser.userId });
    }
  }

  async function updateCell(cellId: string, value: unknown, reason: string) {
    const snapshot = Array.from(cells.values()).find((cell) => cell.id === cellId);
    if (!snapshot) {
      return;
    }

    const key = buildCellKey({ entityId: snapshot.entityId, periodStart: snapshot.periodStart, fieldName: snapshot.fieldName });
    setCells((current) => new Map(current).set(key, { ...snapshot, currentValue: value }));

    const response = await fetch(`/api/v1/planning/sessions/${sessionId}/cells/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cell_id: snapshot.id,
        entity_type: snapshot.entityType,
        entity_id: snapshot.entityId,
        period_start: snapshot.periodStart,
        field_name: snapshot.fieldName,
        value,
        original_value: snapshot.originalValue,
        version: snapshot.version,
        reason
      })
    });

    if (response.status === 409) {
      const body = (await response.json()) as { current_version: number; current_value: unknown };
      setConflict({ cellId, mine: value, theirs: body.current_value, currentVersion: body.current_version });
      setCells((current) => new Map(current).set(key, snapshot));
      return;
    }

    if (!response.ok) {
      setCells((current) => new Map(current).set(key, snapshot));
      return;
    }

    const nextCell = (await response.json()) as PlanningCellState;
    setCells((current) => new Map(current).set(key, nextCell));
    if (channelRef.current) {
      await broadcastCellUpdate(channelRef.current, {
        cellId: nextCell.id,
        value: nextCell.currentValue,
        userId: currentUser.userId,
        userName: currentUser.userName,
        version: nextCell.version
      });
      await broadcastCellLock(channelRef.current, { cellId: nextCell.id, userId: currentUser.userId, userName: currentUser.userName });
      window.setTimeout(() => {
        void unlockCell(nextCell.id);
      }, 5000);
    }
  }

  return {
    cells,
    lockedCells,
    participants,
    impactResult,
    conflict,
    setConflict,
    updateCell,
    lockCell,
    unlockCell
  };
}
