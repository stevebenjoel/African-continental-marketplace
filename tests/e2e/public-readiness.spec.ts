import { expect, test } from "@playwright/test";

test("liveness endpoint is healthy", async ({ request }) => {
  const response = await request.get("/api/health/live");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "pac-sm" });
});

test("marketplace homepage renders primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PAC-SM/i);
  await expect(page.getByRole("link", { name: /PAC-SM Products/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /FAQ/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Documentation/i }).first()).toBeVisible();
});
