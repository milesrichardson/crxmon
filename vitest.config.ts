import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
    coverage: {
      exclude: [...(configDefaults.coverage.exclude ?? []), "vitest-setup.ts"],
    },
  },
});
