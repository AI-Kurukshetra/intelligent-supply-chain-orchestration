export type PlanningCellState = {
  id: string;
  sessionId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  periodStart: string;
  currentValue: unknown;
  originalValue: unknown;
  version: number;
  lockedBy: string | null;
  lockedAt: string | null;
  lastModifiedBy: string | null;
  lastModifiedAt: string | null;
};

export type PlanningCellKey = `${string}:${string}:${string}`;

export type PlanningUserInfo = {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
};

export type PresenceUser = {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  currentCell: string | null;
};

export type CellUpdatePayload = {
  cellId: string;
  value: unknown;
  userId: string;
  userName: string;
  version: number;
};

export type CellLockPayload = {
  cellId: string;
  userId: string;
  userName: string;
};

export type CellUnlockPayload = {
  cellId: string;
  userId: string;
};

export type CursorMovePayload = {
  userId: string;
  entityId: string;
  periodStart: string;
};

export type SupplyGap = {
  product: string;
  period: string;
  gap_qty: number;
};

export type ImpactResult = {
  changeId: string;
  summary: string;
  affectedProducts: string[];
  supplyGaps: SupplyGap[];
  inventoryRisks: string[];
  actionsRecommended: string[];
};

export type ImpactBroadcastPayload = {
  changeId: string;
  summary: string;
  affectedProducts: string[];
  supplyGaps: SupplyGap[];
  inventoryRisks: string[];
  actionsRecommended: string[];
};
