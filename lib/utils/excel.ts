import ExcelJS from "exceljs";

export async function createWorkbookBuffer(
  sheetName: string,
  rows: Array<Record<string, string | number | null>>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    worksheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key,
      key
    }));
    rows.forEach((row) => worksheet.addRow(row));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}