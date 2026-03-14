import { expect, test } from "@playwright/test";

test("Dashboard shows 15 KPI tiles with values", async ({ page }) => {
  await page.goto("/dashboard");
  const tiles = page.locator("[data-testid='kpi-tile']");
  await expect(tiles).toHaveCount(15);
  await expect(tiles.first()).not.toContainText(/loading/i, { timeout: 3000 });
});

test("Clicking a KPI tile navigates to analytics", async ({ page }) => {
  await page.goto("/dashboard");
  await page.locator("[data-testid='kpi-tile']").first().click();
  await page.waitForURL("**/analytics*");
  await expect(page).toHaveURL(/analytics/);
});
