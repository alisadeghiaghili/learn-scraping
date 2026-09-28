import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
