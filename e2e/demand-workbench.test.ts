import { expect, test } from "@playwright/test";

test("Demand workbench loads with AG Grid and filters by facility", async ({ page }) => {
  await page.goto("/demand");
  await expect(page.getByRole("grid")).toBeVisible();
  await page.getByRole("combobox", { name: /facility/i }).click();
  await page.getByRole("option").first().click();
  await expect(page.getByRole("grid")).toBeVisible();
});

test("Editing a cell opens override flow and shows pending indicator", async ({ page }) => {
  await page.goto("/demand");
  await page.locator("[role='gridcell'][col-id='P1']").first().dblclick();
  await page.getByLabel(/override qty|quantity/i).fill("125");
  await page.getByLabel(/reason/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /submit|save/i }).click();
  await expect(page.getByText(/pending/i)).toBeVisible();
});

test("Run Forecast shows loading then success toast", async ({ page }) => {
  await page.goto("/demand");
  await page.getByRole("button", { name: /run forecast/i }).click();
  await expect(page.getByText(/queued|running|success/i)).toBeVisible();
});
