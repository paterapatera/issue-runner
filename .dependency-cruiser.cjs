/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "config-isolated",
      severity: "error",
      from: { path: "^src/config/" },
      to: { path: "^src/(main|tui)/" },
    },
    {
      name: "tui-no-config",
      severity: "error",
      from: { path: "^src/tui/" },
      to: { path: "^src/config/" },
    },
    {
      name: "opentui-only-in-tui",
      severity: "error",
      from: { pathNot: "^src/tui/index\\.ts$" },
      to: { path: "^@opentui/core" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
