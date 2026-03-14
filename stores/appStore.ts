"use client";

import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  activeFacilityId: string | null;
  activePlanningCycleId: string | null;
  setSidebarCollapsed: (value: boolean) => void;
  setActiveFacility: (id: string | null) => void;
  setActivePlanningCycle: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set: (partial: Partial<AppState>) => void) => ({
  sidebarCollapsed: false,
  activeFacilityId: null,
  activePlanningCycleId: null,
  setSidebarCollapsed: (value: boolean) => set({ sidebarCollapsed: value }),
  setActiveFacility: (id: string | null) => set({ activeFacilityId: id }),
  setActivePlanningCycle: (id: string | null) => set({ activePlanningCycleId: id })
}));
