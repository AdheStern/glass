import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Dominio + tema: funciones puras (ms). Integración: repos y trigger de
    // variant_stock, que se auto-omiten salvo contra el Postgres efímero de
    // compose.test.yml (ver ON_EPHEMERAL en los tests de integración).
    include: [
      "src/domain/**/*.test.ts",
      "src/theme/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
