export { detectSupplyShortage } from "@/lib/exceptions/detectors/EX001_supplyShortage";
export { detectDemandSpike } from "@/lib/exceptions/detectors/EX002_demandSpike";
export { detectCapacityOverload } from "@/lib/exceptions/detectors/EX003_capacityOverload";
export { detectLatePurchaseOrder } from "@/lib/exceptions/detectors/EX004_latePurchaseOrder";
export { detectBelowSafetyStock } from "@/lib/exceptions/detectors/EX005_belowSafetyStock";
export { detectExcessInventory } from "@/lib/exceptions/detectors/EX006_excessInventory";
export { detectSupplierOtifBreach } from "@/lib/exceptions/detectors/EX007_supplierOtifBreach";
export { detectForecastAccuracyDegradation } from "@/lib/exceptions/detectors/EX008_forecastAccuracyDegradation";
export { detectBomComponentShortage } from "@/lib/exceptions/detectors/EX009_bomComponentShortage";
export { detectPlanningCycleOverdue } from "@/lib/exceptions/detectors/EX010_planningCycleOverdue";
export type { Detector, ExceptionCandidate, ExceptionSeverity } from "@/lib/exceptions/detectors/shared";

import { detectSupplyShortage } from "@/lib/exceptions/detectors/EX001_supplyShortage";
import { detectDemandSpike } from "@/lib/exceptions/detectors/EX002_demandSpike";
import { detectCapacityOverload } from "@/lib/exceptions/detectors/EX003_capacityOverload";
import { detectLatePurchaseOrder } from "@/lib/exceptions/detectors/EX004_latePurchaseOrder";
import { detectBelowSafetyStock } from "@/lib/exceptions/detectors/EX005_belowSafetyStock";
import { detectExcessInventory } from "@/lib/exceptions/detectors/EX006_excessInventory";
import { detectSupplierOtifBreach } from "@/lib/exceptions/detectors/EX007_supplierOtifBreach";
import { detectForecastAccuracyDegradation } from "@/lib/exceptions/detectors/EX008_forecastAccuracyDegradation";
import { detectBomComponentShortage } from "@/lib/exceptions/detectors/EX009_bomComponentShortage";
import { detectPlanningCycleOverdue } from "@/lib/exceptions/detectors/EX010_planningCycleOverdue";

export const allDetectors = [
  detectSupplyShortage,
  detectDemandSpike,
  detectCapacityOverload,
  detectLatePurchaseOrder,
  detectBelowSafetyStock,
  detectExcessInventory,
  detectSupplierOtifBreach,
  detectForecastAccuracyDegradation,
  detectBomComponentShortage,
  detectPlanningCycleOverdue
];
