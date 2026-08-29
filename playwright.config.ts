import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

// El proceso de tests necesita OWNER_EMAIL/OWNER_PASSWORD para loguear en el
// panel; los lee de .env (Next ya lo carga para el servidor, Playwright no).
function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* sin .env: los tests del panel se saltan solos */
  }
}
loadEnv();

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
        env: {
          // Habilita /api/sync/inspect para el recorrido 3 (§23.1) sin panel.
          GLASS_E2E: "1",
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
          OWNER_EMAIL: process.env.OWNER_EMAIL ?? "",
        },
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
