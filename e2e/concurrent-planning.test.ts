import { expect, test } from "@playwright/test";

test("Concurrent planning broadcast updates the second browser context", async ({ browser }) => {
  const contextA = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
  const contextB = await browser.newContext({ storageState: "./playwright/.auth/user.json" });
  const page = await contextA.newPage();
  const page2 = await contextB.newPage();

  await page.goto("/planning");
  await page2.goto("/planning");

  await page.locator("[role='gridcell'][col-id='P1']").first().dblclick();
  await page.getByLabel(/value/i).fill("140");
  await page.getByRole("button", { name: /save|apply/i }).click();

  await expect(page2.locator("[role='gridcell'][col-id='P1']").first()).toContainText("140", { timeout: 2000 });
  await expect(page.getByText(/2 active users|2 participants/i)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
