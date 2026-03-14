import { expect, test } from "@playwright/test";

test("Login with valid credentials redirects to dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? "planner@acme-electronics.test");
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD ?? "Planner#12345");
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page).toHaveURL(/dashboard/);
});

test("Login with invalid credentials shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("wrong@example.com");
  await page.getByLabel(/password/i).fill("WrongPassword123!");
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
});

test("Accessing dashboard without auth redirects to login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/login/);
  await context.close();
});
