import { expect, test } from "@playwright/test";

test("registration shows a verification state and supports a controlled resend", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ user: null }) }));
  await page.route("**/api/auth/register", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ user: { id: "synthetic", email: "browser@example.test" }, verificationRequired: true }) }));
  await page.route("**/api/auth/resend-confirmation", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, message: "If confirmation is pending, another email will be sent." }) }));
  await page.goto("/account/register");
  await page.getByLabel("Name Optional").fill("Browser Person");
  await page.getByLabel("Email").fill("browser@example.test");
  await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple");
  await page.getByLabel("Confirm password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText("If confirmation is pending");
});

test("login displays callback errors safely and exposes account recovery", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ user: null }) }));
  await page.goto("/account/login?error=provider-secret-detail");
  await expect(page.locator(".form-error")).toHaveText("Sign-in could not be completed. Please try again.");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await page.getByLabel("Password").fill("correct horse battery staple");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "text");
  await expect(page.getByRole("link", { name: /Forgot your password/ })).toHaveAttribute("href", "/account/forgot-password");
});

test("password recovery uses an enumeration-resistant confirmation", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ user: null }) }));
  await page.route("**/api/auth/password-reset/request", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true }) }));
  await page.goto("/account/forgot-password");
  await page.getByLabel("Email").fill("unknown@example.test");
  await page.getByRole("button", { name: "Request reset" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
});
