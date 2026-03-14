"use client";

import { create } from "zustand";

type PlanningCell = {
  cellId: string;
  value: unknown;
  version: number;
};

type PlanningStore = {
  cells: Record<string, PlanningCell>;
  setCell: (cell: PlanningCell) => void;
  removeCell: (cellId: string) => void;
  reset: () => void;
};

export const usePlanningStore = create<PlanningStore>((set: (updater: (state: PlanningStore) => Partial<PlanningStore>) => void) => ({
  cells: {},
  setCell: (cell: PlanningCell) =>
    set((state: PlanningStore) => ({
      cells: {
        ...state.cells,
        [cell.cellId]: cell
      }
    })),
  removeCell: (cellId: string) =>
    set((state: PlanningStore) => {
      const next = { ...state.cells };
      delete next[cellId];
      return { cells: next };
    }),
  reset: () => set(() => ({ cells: {} }))
}));
