import { expect, test } from "@playwright/test";

test.describe("authentication entry points", () => {
  test("email and Google sign-in are available", async ({ page }) => {
    await page.goto("/login?returnTo=%2Fcart");
    await expect(page.getByRole("heading", { name: "Sign in to PAC-SM." })).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveAttribute("autocomplete", "email");
    await expect(page.getByLabel("Password")).toHaveAttribute("autocomplete", "current-password");
    await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveAttribute("href", "/api/auth/oauth/google?returnTo=%2Fcart");
  });

  test("registration exposes strong-password and Google options", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Start your journey." })).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute("minlength", "12");
    await expect(page.getByText(/including uppercase, lowercase and a number/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Register with Google" })).toHaveAttribute("href", "/api/auth/oauth/google?returnTo=%2Faccount");
  });

  test("verification requires an email token", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByRole("heading", { name: "Confirm your email." })).toBeVisible();
    await expect(page.getByText(/open this page from the verification link/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /verify email/i })).toHaveCount(0);
  });
});
