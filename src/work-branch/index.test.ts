import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  commentBodies,
  type GhCall,
  labelsFromEdit,
  recordingGhRunner,
} from "../github/test-fixtures";
import { type PrepareWorkBranchInput, prepareWorkBranch } from "./index";

const REPO = "example/app";
const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"];

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

function expectCheckout(gitCalls: string[][], branch: string) {
  expect(gitCalls.find((argv) => argv[0] === "checkout")).toEqual(["checkout", branch]);
}

async function expectFailedPrepare(
  harnessOptions: HarnessOptions,
  input: PrepareWorkBranchInput,
  comment: string,
) {
  const harness = createHarness(harnessOptions);
  const result = await prepareWorkBranch(input, harness.deps);
  expect(result).toEqual({ ok: false, exitCode: 1 });
  expect(harness.exitCodes).toEqual([1]);
  expect(harness.stderrLines).toEqual([comment]);
  const edit = harness.ghCalls.find((call) => call.argv[1] === "edit");
  const labels = labelsFromEdit(edit?.argv ?? []);
  expect(labels.removed).toEqual(STATE_LABELS);
  expect(labels.added).toEqual(["agent:failed"]);
  expect(commentBodies(harness.ghCalls)).toEqual([comment]);
  expect(harness.gitCalls.find((argv) => argv[0] === "checkout")).toBeUndefined();
}

describe("prepareWorkBranch checkout success", () => {
  test("AC-004 AC-017 checks out the matching remote branch", async () => {
    const { deps, gitCalls, ghCalls, exitCodes } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "main"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(result).toEqual({ ok: true, specName: "GH-3", branch: "gh-3-print-date" });
    expectCheckout(gitCalls, "gh-3-print-date");
    expect(ghCalls.length).toBe(0);
    expect(exitCodes.length).toBe(0);
  });

  test("AC-005 ignores gh-30-other when selecting gh-3-print-date", async () => {
    const { deps, gitCalls } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "gh-30-other"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expectCheckout(gitCalls, "gh-3-print-date");
  });

  test("AC-021 checks out in startup cwd", async () => {
    const { deps, gitCalls, cwd } = createHarness({
      cwd: "/repo",
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "main"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(cwd).toBe("/repo");
    expect(gitCalls[0]).toEqual(["ls-remote", "--heads", "origin"]);
    expectCheckout(gitCalls, "gh-3-print-date");
  });

  test("AC-023 counts only origin heads from ls-remote", async () => {
    const { deps, gitCalls } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "main"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expectCheckout(gitCalls, "gh-3-print-date");
  });

  test("AC-012 ignores slug in issue body", async () => {
    const { deps, gitCalls } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "feature-from-issue"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3, body: "feature-from-issue" }), deps);
    expectCheckout(gitCalls, "gh-3-print-date");
  });

  test("AC-013 checks out with empty title and body", async () => {
    const { deps, gitCalls } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "main"],
    });
    await prepareWorkBranch(defaultInput({ issueNumber: 3, title: "", body: "" }), deps);
    expectCheckout(gitCalls, "gh-3-print-date");
  });
});

describe("prepareWorkBranch success side effects", () => {
  test("AC-015 AC-030 success leaves GitHub unchanged", async () => {
    const { deps, ghCalls, exitCodes, stderrLines } = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date", "main"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(result.ok).toBe(true);
    expect(ghCalls.length).toBe(0);
    expect(exitCodes.length).toBe(0);
    expect(stderrLines.length).toBe(0);
  });
});

describe("prepareWorkBranch branch selection failures", () => {
  test.each([
    ["AC-006", ["main"]],
    ["AC-007", ["gh-3-a", "gh-3-b"]],
    ["AC-008", ["main"]],
  ])("%s does not checkout when matches are not exactly one", async (_ac, branches) => {
    const { deps, gitCalls } = createHarness({
      configText: configText("GH"),
      remoteBranches: branches,
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), deps);
    expect(result.ok).toBe(false);
    expect(gitCalls.find((argv) => argv[0] === "checkout")).toBeUndefined();
  });
});

describe("prepareWorkBranch failure comments", () => {
  test.each([
    ["AC-009", ["main"], "該当する作業ブランチがありません"],
    ["AC-010", ["gh-3-a", "gh-3-b"], "該当する作業ブランチが複数あります"],
    ["AC-011", ["main"], "該当する作業ブランチがありません"],
    ["AC-024", ["main"], "該当する作業ブランチがありません"],
    ["AC-028", ["main"], "該当する作業ブランチがありません"],
    ["AC-029", ["gh-3-a", "gh-3-b"], "該当する作業ブランチが複数あります"],
  ])("%s sets agent:failed and failure comment", async (_ac, branches, comment) => {
    await expectFailedPrepare(
      { configText: configText("GH"), remoteBranches: branches },
      defaultInput({ issueNumber: 3 }),
      comment,
    );
  });
});

describe("prepareWorkBranch missing config file", () => {
  test("AC-025 AC-026 AC-027 AC-035 AC-036 AC-037 missing docs/sdd/config.ts", async () => {
    await expectFailedPrepare(
      { configMissing: true, remoteBranches: ["111-hogehoge"] },
      defaultInput({ issueNumber: 111 }),
      "docs/sdd/config.ts がありません",
    );
  });
});

const PREPARE_FAILED = "作業ブランチを用意できませんでした";

function assertPrepareFailureOutput(
  harness: ReturnType<typeof createHarness>,
  options?: { checkoutBranch?: string },
) {
  expect(harness.stderrLines).toEqual([PREPARE_FAILED]);
  expect(harness.stderrLines.join("\n")).not.toContain("secret-token");
  if (options?.checkoutBranch !== undefined) {
    expectCheckout(harness.gitCalls, options.checkoutBranch);
  } else {
    expect(harness.gitCalls.find((argv) => argv[0] === "checkout")).toBeUndefined();
  }
  expect(commentBodies(harness.ghCalls)).toEqual([PREPARE_FAILED]);
}

async function expectPrepareGitFailure(harnessOptions: HarnessOptions) {
  const harness = createHarness({
    configText: configText("GH"),
    remoteBranches: ["gh-3-print-date"],
    ...harnessOptions,
  });
  const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), harness.deps);
  expect(result).toEqual({ ok: false, exitCode: 1 });
  expect(harness.exitCodes).toEqual([1]);
  assertPrepareFailureOutput(harness);
}

describe("prepareWorkBranch git failures", () => {
  test("AC-038 AC-041 ls-remote failure does not leak git stderr", async () => {
    await expectPrepareGitFailure({
      lsRemoteFails: true,
      gitStderr: "fatal: secret-token leaked",
    });
  });

  test("AC-039 checkout failure reports prepare failure", async () => {
    const harness = createHarness({
      configText: configText("GH"),
      remoteBranches: ["gh-3-print-date"],
      checkoutFails: true,
      gitStderr: "error: secret-token checkout",
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), harness.deps);
    expect(result).toEqual({ ok: false, exitCode: 1 });
    assertPrepareFailureOutput(harness, { checkoutBranch: "gh-3-print-date" });
  });

  test("AC-040 config read error uses prepare failure message", async () => {
    const harness = createHarness({
      configReadError: true,
      remoteBranches: ["gh-3-print-date"],
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), harness.deps);
    expect(result).toEqual({ ok: false, exitCode: 1 });
    assertPrepareFailureOutput(harness);
  });
});

describe("prepareWorkBranch GitHub write failures", () => {
  test.each([
    ["AC-031 AC-032", "edit", "ラベルを更新できませんでした"],
    ["AC-033 AC-034", "comment", "コメントを付けられませんでした"],
  ])("%s gh failure stderr", async (_ac, ghStep, message) => {
    const harness = createHarness({
      configText: configText("GH"),
      remoteBranches: ["main"],
      ghHandler: (call) => (call.argv[1] === ghStep ? { ok: false } : { ok: true }),
    });
    const result = await prepareWorkBranch(defaultInput({ issueNumber: 3 }), harness.deps);
    expect(result).toEqual({ ok: false, exitCode: 1 });
    expect(harness.stderrLines).toEqual([message]);
    expect(harness.stderrLines.join("\n")).not.toContain("secret-token");
  });
});
