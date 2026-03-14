import { expect, test } from "@playwright/test";

test("Exception queue shows priority order and AI recommendation in detail", async ({ page }) => {
  await page.goto("/exceptions");
  const cards = page.locator("[data-testid='exception-card']");
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  await expect(page.getByText(/AI recommendation/i)).toBeVisible();
});

test("Resolve exception updates the queue", async ({ page }) => {
  await page.goto("/exceptions");
  await page.locator("[data-testid='exception-card']").first().click();
  await page.getByRole("button", { name: /resolve/i }).click();
  await expect(page.getByText(/resolved|status updated/i)).toBeVisible();
});

test("Bulk select three exceptions and resolve them", async ({ page }) => {
  await page.goto("/exceptions");
  const checkboxes = page.locator("input[type='checkbox']");
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();
  await page.getByRole("button", { name: /resolve selected|bulk resolve/i }).click();
  await expect(page.getByText(/resolved/i)).toBeVisible();
});
