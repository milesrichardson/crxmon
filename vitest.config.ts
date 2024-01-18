import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: "./vitest-setup.ts",
    exclude: [
      "dist/**",
      "extensions/**",
      "instrumented/**",
      "**/node_modules/**",
      "zips/**",
      "**/.nyc_output/**",
    ],
    coverage: {
      exclude: [...(configDefaults.coverage.exclude ?? []), "vitest-setup.ts"],
    },
  },
});
