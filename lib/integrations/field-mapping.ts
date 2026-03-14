export type FieldMapping = {
  id?: string;
  source_field: string;
  target_field: string;
  transform_type: "direct" | "lookup" | "formula" | "constant" | "conditional";
  transform_config?: Record<string, unknown>;
};

export type RowError = {
  row: number;
  field: string;
  message: string;
};

function evaluateFormula(formula: string, context: Record<string, unknown>) {
  const keys = Object.keys(context);
  const values = Object.values(context);
  const fn = new Function(...keys, `"use strict"; return (${formula});`);
  return fn(...values);
}

export function applyMappings(raw: Record<string, unknown>, mappings: FieldMapping[]) {
  return mappings.reduce<Record<string, unknown>>((accumulator, mapping) => {
    const config = mapping.transform_config ?? {};
    if (mapping.transform_type === "direct") {
      accumulator[mapping.target_field] = raw[mapping.source_field];
      return accumulator;
    }
    if (mapping.transform_type === "constant") {
      accumulator[mapping.target_field] = config.value;
      return accumulator;
    }
    if (mapping.transform_type === "lookup") {
      const lookup = (config.lookup as Record<string, unknown> | undefined) ?? {};
      accumulator[mapping.target_field] = lookup[String(raw[mapping.source_field] ?? "")] ?? null;
      return accumulator;
    }
    if (mapping.transform_type === "conditional") {
      const when = config.when as { field?: string; equals?: unknown } | undefined;
      accumulator[mapping.target_field] = when && raw[when.field ?? ""] === when.equals ? config.true_value : config.false_value;
      return accumulator;
    }
    if (mapping.transform_type === "formula") {
      accumulator[mapping.target_field] = evaluateFormula(String(config.formula ?? "null"), raw);
      return accumulator;
    }
    return accumulator;
  }, {});
}
