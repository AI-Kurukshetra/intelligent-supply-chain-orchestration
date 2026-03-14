import { applyMappings, type FieldMapping, type RowError } from "@/lib/integrations/field-mapping";

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

export function parseAndMapCsv(fileBuffer: Buffer, mappings: FieldMapping[], objectType: string) {
  const text = fileBuffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 1, field: "file", message: `CSV for ${objectType} must include headers and at least one data row.` }] satisfies RowError[] };
  }
  const headers = parseCsvLine(lines[0]);
  const errors: RowError[] = [];
  const valid: Record<string, unknown>[] = [];

  lines.slice(1).forEach((line, rowIndex) => {
    const values = parseCsvLine(line);
    const raw = headers.reduce<Record<string, unknown>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? null;
      return accumulator;
    }, {});
    try {
      valid.push(applyMappings(raw, mappings));
    } catch (error) {
      errors.push({ row: rowIndex + 2, field: "mapping", message: error instanceof Error ? error.message : "Unable to transform row." });
    }
  });

  return { valid, errors };
}
