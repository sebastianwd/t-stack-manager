import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { bin: "src/bin.ts" },
  outDir: "dist/cli",
  format: "esm",
  target: "node20",
  platform: "node",
  clean: true,
  dts: false,
});
