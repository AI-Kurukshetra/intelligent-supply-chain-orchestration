"use client";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ClientSideRowModelModule, ModuleRegistry, type CellStyle, type ColDef } from "ag-grid-community";
import { Lock, Sparkles, Users } from "lucide-react";

import { usePlanningSession } from "@/hooks/usePlanningSession";
import type { PlanningCellState, PlanningUserInfo } from "@/types/planning";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

type Session = { id: string; description: string | null; status: string; created_at: string };

type GridRow = {
  id: string;
  entityId: string;
  fieldName: string;
  periodStart: string;
  currentValue: unknown;
  version: number;
};

type CellDoubleClickedEvent = { data?: GridRow };

export function PlanningWorkbench({ session, cells, user }: { session: Session; cells: PlanningCellState[]; user: PlanningUserInfo }) {
  const [selectedCell, setSelectedCell] = useState<PlanningCellState | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [reason, setReason] = useState("consensus_change");
  const { cells: cellMap, lockedCells, participants, impactResult, conflict, setConflict, updateCell } = usePlanningSession(session.id, cells, user);

  const rows = useMemo<GridRow[]>(
    () =>
      Array.from(cellMap.values()).map((cell) => ({
        id: cell.id,
        entityId: cell.entityId,
        fieldName: cell.fieldName,
        periodStart: cell.periodStart,
        currentValue: cell.currentValue,
        version: cell.version
      })),
    [cellMap]
  );

  const columnDefs = useMemo<ColDef<GridRow>[]>(
    () => [
      { field: "entityId", headerName: "Entity", minWidth: 180 },
      { field: "fieldName", headerName: "Field", minWidth: 160 },
      { field: "periodStart", headerName: "Period", minWidth: 140 },
      {
        field: "currentValue",
        headerName: "Value",
        minWidth: 140,
        cellStyle: (params: { data?: GridRow }): CellStyle | null => {
          const cellId = params.data?.id;
          if (!cellId) {
            return null;
          }
          const lock = lockedCells.get(cellId);
          if (!lock) {
            return null;
          }
          return lock.userId === user.userId ? { outline: "2px solid #0ea5e9", outlineOffset: -2 } : { outline: "2px solid #f59e0b", outlineOffset: -2 };
        }
      },
      { field: "version", headerName: "Version", maxWidth: 110 }
    ],
    [lockedCells, user.userId]
  );

  async function saveEdit() {
    if (!selectedCell) {
      return;
    }
    await updateCell(selectedCell.id, draftValue, reason);
    setSelectedCell(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-600">Concurrent Planning</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{session.description ?? "Planning Session"}</h1>
            <p className="mt-2 text-sm text-slate-500">Live collaborative edits backed by Supabase Realtime broadcast and presence.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <Users className="h-4 w-4" />
              {participants.length} active
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <Lock className="h-4 w-4" />
              {session.status}
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
              <Sparkles className="h-4 w-4 text-sky-300" />
              {impactResult ? impactResult.supplyGaps.length : 0} impact gaps
            </div>
          </div>
        </div>
        <div className="mt-4 flex -space-x-2">
          {participants.map((participant) => (
            <div key={participant.userId} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-xs font-semibold text-slate-700">
              {participant.userName.slice(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="ag-theme-quartz h-[620px] overflow-hidden rounded-3xl">
            <AgGridReact<GridRow>
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 1 }}
              onCellDoubleClicked={(event: CellDoubleClickedEvent) => {
                const cell = cells.find((entry) => entry.id === event.data?.id) ?? null;
                setSelectedCell(cell);
                setDraftValue(String(cell?.currentValue ?? ""));
              }}
            />
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <h2 className="text-xl font-semibold">Impact Panel</h2>
          {impactResult ? (
            <div className="mt-5 space-y-4 text-sm">
              <p className="text-slate-300">{impactResult.summary}</p>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Supply Gaps</p>
                <div className="mt-3 space-y-2">
                  {impactResult.supplyGaps.map((gap) => (
                    <div key={`${gap.product}:${gap.period}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="font-semibold">{gap.product}</p>
                      <p className="text-slate-300">{gap.period} · Gap {gap.gap_qty}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Recommended Actions</p>
                <ul className="mt-3 space-y-2 text-slate-300">
                  {impactResult.actionsRecommended.map((action) => <li key={action}>{action}</li>)}
                </ul>
              </div>
            </div>
          ) : <p className="mt-4 text-sm text-slate-300">No impact result has been broadcast yet.</p>}
        </aside>
      </section>

      {selectedCell ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Edit Cell</h3>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-slate-600">
                Value
                <input className="rounded-2xl border border-slate-200 px-4 py-3" value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm text-slate-600">
                Reason
                <select className="rounded-2xl border border-slate-200 px-4 py-3" value={reason} onChange={(event) => setReason(event.target.value)}>
                  <option value="consensus_change">Consensus change</option>
                  <option value="promotion">Promotion</option>
                  <option value="customer_signal">Customer signal</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedCell(null)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => void saveEdit()} className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      ) : null}

      {conflict ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-950">Conflict Detected</h3>
            <p className="mt-3 text-sm text-slate-500">Your value: {String(conflict.mine)} | Current value: {String(conflict.theirs)}. Which do you want?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConflict(null)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Accept theirs</button>
              <button type="button" onClick={() => { setDraftValue(String(conflict.mine)); setConflict(null); }} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Keep mine</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
