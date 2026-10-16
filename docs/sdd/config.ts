import { defineConfig } from "./schema/mod.ts";

export default defineConfig({
  schemaVersion: "0.11.0",
  tracker: "manual",
  branchPrefix: "",
  staleBranchDays: 30,
  issueIdPrefix: "GH",
  forge: { cli: "gh" },
  ui: false,
  commands: {
    format: "bunx biome check --write .",
    check:
      "bunx biome check . && bun --check && bunx depcruise src --config .dependency-cruiser.cjs && bunx knip && bunx jscpd src",
    test: "bun test",
  },
});
