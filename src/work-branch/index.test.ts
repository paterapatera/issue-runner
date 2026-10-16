import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { type GhCall, recordingGhRunner } from "../github/test-fixtures";
import { type PrepareWorkBranchInput, prepareWorkBranch } from "./index";

const REPO = "example/app";

function configText(issueIdPrefix?: string): string {
  if (issueIdPrefix === undefined) {
    return 'export default defineConfig({ tracker: "manual" });';
  }
  return `export default defineConfig({ issueIdPrefix: "${issueIdPrefix}" });`;
}

function lsRemoteStdout(branches: string[]): string {
  return branches.map((branch) => `deadbeef\trefs/heads/${branch}`).join("\n");
}

type HarnessOptions = {
  cwd?: string;
  configText?: string;
  configMissing?: boolean;
  configReadError?: boolean;
  remoteBranches?: string[];
  checkoutFails?: boolean;
  lsRemoteFails?: boolean;
  gitStderr?: string;
  ghHandler?: (call: GhCall) => { ok: boolean };
};

function runMockGit(argv: string[], options: HarnessOptions) {
  const command = argv[0];
  if (command === "ls-remote") {
    if (options.lsRemoteFails) {
      return { ok: false as const, stderr: options.gitStderr ?? "secret-token ls-remote failed" };
    }
    return { ok: true as const, stdout: lsRemoteStdout(options.remoteBranches ?? []) };
  }
  if (command === "checkout") {
    if (options.checkoutFails) {
      return { ok: false as const, stderr: options.gitStderr ?? "secret-token checkout failed" };
    }
    return { ok: true as const, stdout: "" };
  }
  return { ok: false as const, stderr: "unknown git command" };
}

function defaultInput(overrides: Partial<PrepareWorkBranchInput> = {}): PrepareWorkBranchInput {
  return {
    repository: REPO,
    issueNumber: 3,
    title: "",
    body: "",
    ...overrides,
  };
}

function createHarness(options: HarnessOptions = {}) {
  const cwd = options.cwd ?? "/repo";
  const gitCalls: string[][] = [];
  const stderrLines: string[] = [];
  const exitCodes: number[] = [];
  const readPaths: string[] = [];
  const { run: gh, calls: ghCalls } = recordingGhRunner(options.ghHandler);

  const git = async (argv: string[]) => {
    gitCalls.push(argv);
    return runMockGit(argv, options);
  };

  const readText = async (path: string) => {
    readPaths.push(path);
    if (options.configMissing) {
      return { ok: false, missing: true };
    }
    if (options.configReadError) {
      return { ok: false, missing: false };
    }
    return { ok: true, text: options.configText ?? configText("GH") };
  };

  const deps = {
    gh,
    git,
    readText,
    cwd,
    writeStderr: (line: string) => {
      stderrLines.push(line);
    },
    exit: (code: number) => {
      exitCodes.push(code);
    },
  };

  return { deps, gitCalls, ghCalls, stderrLines, exitCodes, readPaths, cwd };
}

async function expectSuccessfulCheckout(
  harnessOptions: HarnessOptions,
  input: PrepareWorkBranchInput,
  expected: { specName: string; branch: string },
) {
  const { deps } = createHarness(harnessOptions);
  const result = await prepareWorkBranch(input, deps);
  expect(result).toEqual({ ok: true, ...expected });
}

describe("prepareWorkBranch spec name with prefix", () => {
  test("AC-001 spec name is GH-3 when issueIdPrefix is GH", async () => {
    await expectSuccessfulCheckout(
      { configText: configText("GH"), remoteBranches: ["gh-3-print-date", "main"] },
      defaultInput({ issueNumber: 3 }),
      { specName: "GH-3", branch: "gh-3-print-date" },
    );
  });

  test("AC-014 uses prefix from cwd before checkout", async () => {
    const { deps, readPaths } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.specName).toBe("GH-3");
    }
    expect(readPaths).toEqual([join("/repo", "docs/sdd/config.ts")]);
  });

  test("AC-020 trims spaces around issueIdPrefix", async () => {
    await expectSuccessfulCheckout(
      { configText: configText("  GH  "), remoteBranches: ["gh-3-print-date"] },
      defaultInput({ issueNumber: 3 }),
      { specName: "GH-3", branch: "gh-3-print-date" },
    );
  });

  test("AC-022 reads only startup directory config", async () => {
    const { deps, readPaths } = createHarness({
      cwd: "/repo",
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(readPaths).toEqual(["/repo/docs/sdd/config.ts"]);
    expect(readPaths.some((path) => path.includes("/other/"))).toBe(false);
  });
});

describe("prepareWorkBranch spec name without prefix", () => {
  test("AC-002 spec name is issue number when prefix is absent", async () => {
    const { deps } = createHarness({
      configText: configText(),
      remoteBranches: ["111-hogehoge"],
    });
    const result = await prepareWorkBranch(
      defaultInput({ issueNumber: 111, title: "t", body: "b" }),
      deps,
    );
    expect(result).toEqual({ ok: true, specName: "111", branch: "111-hogehoge" });
  });

  test("AC-016 spec name is 3 without prefix definition", async () => {
    const { deps } = createHarness({
      configText: configText(),
      remoteBranches: ["3-work"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(result).toEqual({ ok: true, specName: "3", branch: "3-work" });
  });

  test.each([
    ["AC-018", ""],
    ["AC-019", "   "],
  ])("%s issueIdPrefix uses issue number only", async (_ac, prefixValue) => {
    await expectSuccessfulCheckout(
      { configText: configText(prefixValue), remoteBranches: ["111-hogehoge"] },
      defaultInput({ issueNumber: 111 }),
      { specName: "111", branch: "111-hogehoge" },
    );
  });

  test("AC-003 checks out 111-hogehoge without launching agent", async () => {
    const { deps, gitCalls, ghCalls } = createHarness({
      configText: configText(),
      remoteBranches: ["111-hogehoge", "main"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 111 }), deps);
    expect(result).toEqual({ ok: true, specName: "111", branch: "111-hogehoge" });
    expect(gitCalls.find((argv) => argv[0] === "checkout")).toEqual(["checkout", "111-hogehoge"]);
    expect(ghCalls.length).toBe(0);
  });
});
