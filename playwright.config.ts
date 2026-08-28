import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000, // la BD remota (Supabase) añade latencia
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Sin PLAYWRIGHT_BASE_URL, Playwright construye y sirve la app de producción
  // (rápida y realista; también lo que necesita Lighthouse).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // Habilita /api/sync/inspect para el recorrido 3 (§23.1) sin panel.
        env: { GLASS_E2E: "1" },
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
