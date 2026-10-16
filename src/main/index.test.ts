import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "@cursor/sdk";
import { createTestRenderer } from "@opentui/core/testing";
import * as agent from "../agent/index.ts";
import { SDK_AUTH_REQUIRED } from "../config/index.ts";
import * as github from "../github/index.ts";
import {
  API_KEY,
  CONFIG_NAME,
  cleanupTempDirs,
  createTempDir,
  ghAs,
  validFile,
  writeConfigJson,
} from "../test-support/fixtures.ts";
import { expectValidMainHeader } from "../test-support/main-layout.ts";
import type { CreateRenderer } from "../tui/index.ts";
import {
  createProductionPollingDeps,
  type RunDeps,
  resolveProductionApiKey,
  run,
  SETTINGS_SAVE_FAILED,
} from "./index.ts";

const MAIN_ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url));

type RendererSetup = Awaited<ReturnType<typeof createTestRenderer>>;

type TuiHarness = {
  createRenderer: CreateRenderer;
  tuiStarted: () => boolean;
  waitForSetup: () => Promise<RendererSetup>;
};

afterEach(async () => {
  await cleanupTempDirs();
});

async function createMainTempDir(): Promise<string> {
  return createTempDir("issue-runner-main-");
}

async function configExists(dir: string): Promise<boolean> {
  try {
    await access(join(dir, CONFIG_NAME));
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fixedHarness(width = 80, height = 24): TuiHarness {
  let setup: RendererSetup | undefined;
  let started = false;
  const createRenderer: CreateRenderer = async () => {
    started = true;
    setup = await createTestRenderer({ width, height, exitOnCtrlC: false });
    return setup.renderer;
  };
  return {
    createRenderer,
    tuiStarted: () => started,
    waitForSetup: async () => {
      for (let attempt = 0; attempt < 50; attempt++) {
        if (setup) {
          return setup;
        }
        await sleep(1);
      }
      throw new Error("renderer setup timed out");
    },
  };
}

function baseDeps(cwd: string, harness: TuiHarness, overrides: Partial<RunDeps> = {}): RunDeps {
  return {
    cwd,
    env: { CURSOR_API_KEY: API_KEY },
    ghLogin: ghAs("octocat"),
    resolveSdkAuthReady: async () => false,
    createRenderer: harness.createRenderer,
    ...overrides,
  };
}

function isSettingsFrame(frame: string): boolean {
  return frame.includes("repository") && frame.includes("assignee");
}

function isMainFrame(frame: string): boolean {
  return frame.includes("待機中") && frame.includes("q");
}

function assertNoSecrets(frame: string, secret: string): void {
  expect(frame.includes(secret)).toBe(false);
}

function expectAuthRequiredProcessExit(
  harness: TuiHarness,
  captured: { code: number; stderr: string },
): void {
  expect(captured.code).toBe(1);
  expect(harness.tuiStarted()).toBe(false);
  expect(captured.stderr.trim()).toBe(SDK_AUTH_REQUIRED);
}

async function captureAuthRequiredStartup(
  harness: TuiHarness,
  env: RunDeps["env"] = {},
): Promise<{ code: number; stderr: string }> {
  const dir = await createMainTempDir();
  await writeConfigJson(dir, validFile);
  return captureRunStderr(() =>
    run({
      deps: baseDeps(dir, harness, {
        env,
        resolveSdkAuthReady: async () => false,
      }),
    }),
  );
}

async function runMainWithSdkAuthAndQuit(env: RunDeps["env"], sdkReady: boolean): Promise<string> {
  const dir = await createMainTempDir();
  await writeConfigJson(dir, validFile);
  const harness = fixedHarness();
  const runPromise = run({
    deps: baseDeps(dir, harness, {
      env,
      resolveSdkAuthReady: async () => sdkReady,
    }),
  });
  const { setup, frame } = await waitForFrame(harness, isMainFrame);
  setup.mockInput.pressKey("q");
  expect(await runPromise).toBe(0);
  return frame;
}

async function captureRunStderr(
  runFn: () => Promise<number>,
): Promise<{ code: number; stderr: string }> {
  const chunks: string[] = [];
  const spy = spyOn(process.stderr, "write").mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    const code = await runFn();
    return { code, stderr: chunks.join("") };
  } finally {
    spy.mockRestore();
  }
}

async function waitForFrame(
  harness: TuiHarness,
  predicate: (frame: string) => boolean,
): Promise<{ setup: RendererSetup; frame: string }> {
  for (let attempt = 0; attempt < 80; attempt++) {
    const setup = await harness.waitForSetup();
    await setup.flush();
    const frame = setup.captureCharFrame();
    if (predicate(frame)) {
      return { setup, frame };
    }
    await sleep(2);
  }
  throw new Error("expected frame not found");
}

async function flushInput(setup: RendererSetup): Promise<void> {
  await setup.flush();
}

async function focusAssigneeField(setup: RendererSetup): Promise<void> {
  await setup.mockMouse.click(50, 6);
  await flushInput(setup);
}

async function startValidMainRun(): Promise<{
  harness: TuiHarness;
  runPromise: Promise<number>;
  setup: RendererSetup;
  frame: string;
}> {
  const dir = await createMainTempDir();
  await writeConfigJson(dir, validFile);
  const harness = fixedHarness();
  const runPromise = run({ deps: baseDeps(dir, harness) });
  const { setup, frame } = await waitForFrame(harness, isMainFrame);
  return { harness, runPromise, setup, frame };
}

async function runValidMainAndQuit(quit: (setup: RendererSetup) => void): Promise<void> {
  const { runPromise, setup } = await startValidMainRun();
  quit(setup);
  expect(await runPromise).toBe(0);
}

async function expectSettingsOnlyForConfig(overrides: Record<string, unknown>): Promise<void> {
  const dir = await createMainTempDir();
  await writeConfigJson(dir, { ...validFile, ...overrides });
  const harness = fixedHarness();
  const runPromise = run({ deps: baseDeps(dir, harness) });
  const { frame, setup } = await waitForFrame(harness, isSettingsFrame);
  expect(isMainFrame(frame)).toBe(false);
  setup.mockInput.pressCtrlC();
  expect(await runPromise).toBe(0);
}

function settingsSubmitAfterRepository(harness: TuiHarness): RunDeps["onSettingsReady"] {
  return ({ submit }) => {
    void (async () => {
      const { setup } = await waitForFrame(harness, isSettingsFrame);
      await setup.mockInput.typeText("acme/widgets");
      await flushInput(setup);
      await submit();
    })();
  };
}

async function spawnMainProcess(
  cwd: string,
  env: Record<string, string | undefined>,
): Promise<number> {
  const childEnv: Record<string, string> = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete childEnv[key];
    } else {
      childEnv[key] = value;
    }
  }
  const proc = Bun.spawn({
    cmd: ["bun", MAIN_ENTRY],
    cwd,
    env: childEnv,
    stdout: "ignore",
    stderr: "pipe",
  });
  return proc.exited;
}

describe("run sdk auth startup main", () => {
  test("AC-002 main screen without api key on screen when env key is set", async () => {
    const secret = "sk-example";
    const frame = await runMainWithSdkAuthAndQuit({ CURSOR_API_KEY: secret }, false);
    assertNoSecrets(frame, secret);
  });

  test("AC-005 AC-010 main screen when sdk auth is ready and env key is unset", async () => {
    const frame = await runMainWithSdkAuthAndQuit({}, true);
    assertNoSecrets(frame, API_KEY);
    assertNoSecrets(frame, "sk-");
  });
});

describe("run sdk auth startup exit", () => {
  test("AC-007 exits without TUI and prints auth message when sdk auth is missing", async () => {
    const harness = fixedHarness();
    const captured = await captureAuthRequiredStartup(harness);
    expectAuthRequiredProcessExit(harness, captured);
    assertNoSecrets(captured.stderr, API_KEY);
  });

  test("AC-013 prints full auth message on stderr when terminal is narrow", async () => {
    const harness = fixedHarness(1, 24);
    const { stderr } = await captureAuthRequiredStartup(harness);
    expect(stderr.trim()).toBe(SDK_AUTH_REQUIRED);
  });
});

function assertNoGitHubTokenField(frame: string): void {
  expect(frame.toLowerCase()).not.toContain("token");
  expect(frame).not.toContain("トークン");
}

async function runGhLoggedOutScreen(
  withValidConfig: boolean,
  predicate: (frame: string) => boolean,
  quit: (setup: RendererSetup) => void,
): Promise<void> {
  const dir = await createMainTempDir();
  if (withValidConfig) {
    await writeConfigJson(dir, validFile);
  }
  const harness = fixedHarness();
  const runPromise = run({
    deps: baseDeps(dir, harness, {
      env: {},
      ghLogin: ghAs(undefined),
      resolveSdkAuthReady: async () => true,
    }),
  });
  const { setup, frame } = await waitForFrame(harness, predicate);
  assertNoGitHubTokenField(frame);
  quit(setup);
  expect(await runPromise).toBe(0);
}

describe("run sdk auth github", () => {
  test("AC-009 settings omit GitHub token field when gh is not logged in", async () => {
    await runGhLoggedOutScreen(false, isSettingsFrame, (setup) => setup.mockInput.pressCtrlC());
  });

  test("AC-009 main screen omit GitHub token field when gh is not logged in", async () => {
    await runGhLoggedOutScreen(true, isMainFrame, (setup) => setup.mockInput.pressKey("q"));
  });
});

describe("run exit without TUI", () => {
  test("AC-001 AC-004 missing API key exits 1 with auth message and no TUI", async () => {
    const harness = fixedHarness();
    const captured = await captureAuthRequiredStartup(harness);
    expectAuthRequiredProcessExit(harness, captured);
    expect(isSettingsFrame(captured.stderr)).toBe(false);
    expect(isMainFrame(captured.stderr)).toBe(false);
  });

  test("AC-002 whitespace-only API key exits 1 with auth message only", async () => {
    const harness = fixedHarness();
    const { code, stderr } = await captureAuthRequiredStartup(harness, { CURSOR_API_KEY: "   " });
    expect(code).toBe(1);
    expect(harness.tuiStarted()).toBe(false);
    expect(stderr.trim()).toBe(SDK_AUTH_REQUIRED);
    expect(stderr.trim()).not.toBe("   ");
  });

  test("AC-003 auth exit stderr does not leak secrets", async () => {
    const harness = fixedHarness();
    const { stderr } = await captureAuthRequiredStartup(harness);
    assertNoSecrets(stderr, "sk-live-secret");
    assertNoSecrets(stderr, API_KEY);
  });

  test("AC-004 empty API key exits 1 without starting TUI", async () => {
    const harness = fixedHarness();
    const { code } = await captureAuthRequiredStartup(harness, { CURSOR_API_KEY: "" });
    expect(code).toBe(1);
    expect(harness.tuiStarted()).toBe(false);
  });
});

describe("run exit spawned process", () => {
  test("spawned process exits 1 when API key is missing", async () => {
    const dir = await createMainTempDir();
    const home = await createTempDir("issue-runner-home-");
    await writeConfigJson(dir, validFile);
    const code = await spawnMainProcess(dir, { CURSOR_API_KEY: undefined, HOME: home });
    expect(code).toBe(1);
  });
});

describe("run API key boundaries with TUI part 1", () => {
  test("AC-069 single-character key still starts TUI", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness, { env: { CURSOR_API_KEY: "x" } }) });
    const { setup } = await waitForFrame(harness, isMainFrame);
    expect(harness.tuiStarted()).toBe(true);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });

  test("AC-070 long key is not shown on main screen", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const secret = "x".repeat(1000);
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness, { env: { CURSOR_API_KEY: secret } }) });
    const { setup, frame } = await waitForFrame(harness, isMainFrame);
    assertNoSecrets(frame, secret);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });

  test("AC-071 trimmed key starts TUI", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const runPromise = run({
      deps: baseDeps(dir, harness, { env: { CURSOR_API_KEY: `  ${API_KEY}  ` } }),
    });
    const { setup } = await waitForFrame(harness, isMainFrame);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });

  test.each([
    ["AC-072", `${API_KEY}\n`],
    ["AC-074", "sk\n123"],
  ])("%s key with newline still starts TUI", async (_ac, cursorApiKey) => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const runPromise = run({
      deps: baseDeps(dir, harness, { env: { CURSOR_API_KEY: cursorApiKey } }),
    });
    const { setup } = await waitForFrame(harness, isMainFrame);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });
});

describe("run API key boundaries with TUI part 2", () => {
  test("AC-073 non-ascii key is not shown on main screen", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness, { env: { CURSOR_API_KEY: "あ" } }) });
    const { setup, frame } = await waitForFrame(harness, isMainFrame);
    assertNoSecrets(frame, "あ");
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });
});

describe("run settings flow open and save", () => {
  test("AC-008 missing config shows settings screen", async () => {
    const dir = await createMainTempDir();
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness) });
    const { frame, setup } = await waitForFrame(harness, isSettingsFrame);
    expect(frame.includes("interval")).toBe(true);
    setup.mockInput.pressCtrlC();
    expect(await runPromise).toBe(0);
  });

  test("AC-011 Enter after valid settings shows main screen", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, {
      repository: "",
      interval: 2,
      model: "composer-2.5",
      assignee: "octocat",
    });
    const harness = fixedHarness();
    const runPromise = run({
      deps: {
        ...baseDeps(dir, harness),
        onSettingsReady: settingsSubmitAfterRepository(harness),
      },
    });
    const { frame: mainFrame, setup: mainSetup } = await waitForFrame(harness, isMainFrame);
    expect(mainFrame.includes("acme/widgets")).toBe(true);
    expect(mainFrame.includes("2分")).toBe(true);
    expect(mainFrame.includes("composer-2.5")).toBe(true);
    expect(mainFrame.includes("octocat")).toBe(true);
    mainSetup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
    const saved = JSON.parse(await readFile(join(dir, CONFIG_NAME), "utf8")) as Record<
      string,
      unknown
    >;
    expect(saved).toEqual(validFile);
  });
});

async function captureRunWithMockSettingsResult(
  settingsResult: "saved" | "cancel",
): Promise<{ code: number; stderr: string }> {
  const dir = await createMainTempDir();
  const harness = fixedHarness();
  return captureRunStderr(() =>
    run({
      deps: baseDeps(dir, harness, {
        runSettings: async () => settingsResult,
      }),
    }),
  );
}

describe("run settings save failure exit", () => {
  test("AC-009 saved without config exits 1 with save failed message", async () => {
    const { code, stderr } = await captureRunWithMockSettingsResult("saved");
    expect(code).toBe(1);
    expect(stderr.trim()).toBe(SETTINGS_SAVE_FAILED);
  });

  test("INV-003 cancel exits 0 without save failed message", async () => {
    const { code, stderr } = await captureRunWithMockSettingsResult("cancel");
    expect(code).toBe(0);
    expect(stderr).toBe("");
  });

  test("INV-002 invalid repository stays on settings without exit 1", async () => {
    const dir = await createMainTempDir();
    const harness = fixedHarness();
    const { code, stderr } = await captureRunStderr(() =>
      run({
        deps: {
          ...baseDeps(dir, harness),
          onSettingsReady: ({ submit }) => {
            void (async () => {
              const { setup } = await waitForFrame(harness, isSettingsFrame);
              await submit();
              await flushInput(setup);
              setup.mockInput.pressCtrlC();
            })();
          },
        },
      }),
    );
    expect(code).toBe(0);
    expect(stderr.includes(SETTINGS_SAVE_FAILED)).toBe(false);
  });
});

describe("run settings flow input and cancel", () => {
  test("AC-013 q on settings assignee field is typed, not quit", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, {
      repository: "acme/widgets",
      interval: 2,
      model: "a\nb",
      assignee: "octoca",
    });
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness) });
    const { setup } = await waitForFrame(harness, isSettingsFrame);
    await focusAssigneeField(setup);
    setup.mockInput.pressKey("q");
    await flushInput(setup);
    const frame = setup.captureCharFrame();
    expect(frame.includes("octocaq")).toBe(true);
    expect(isSettingsFrame(frame)).toBe(true);
    setup.mockInput.pressCtrlC();
    expect(await runPromise).toBe(0);
  });

  test("AC-014 settings Ctrl+C exits 0 without writing config", async () => {
    const dir = await createMainTempDir();
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness) });
    const { setup } = await waitForFrame(harness, isSettingsFrame);
    setup.mockInput.pressCtrlC();
    expect(await runPromise).toBe(0);
    expect(await configExists(dir)).toBe(false);
  });
});

describe("run main screen exit", () => {
  test.each([
    ["AC-012", (setup: RendererSetup) => setup.mockInput.pressKey("q")],
    ["AC-015", (setup: RendererSetup) => setup.mockInput.pressCtrlC()],
  ])("%s exits 0 from main screen", async (_ac, quit) => {
    await runValidMainAndQuit(quit);
  });
});

describe("run invalid config opens settings not main", () => {
  test.each([
    ["AC-078", { repository: "acme\n/widgets" }],
    ["AC-084", { assignee: "octo\ncat" }],
    ["AC-090", { model: "a\nb" }],
  ])("%s shows settings only", async (_ac, overrides) => {
    await expectSettingsOnlyForConfig(overrides);
  });
});

describe("run without startPolling", () => {
  test("INV-001 shows 待機中 without listRunningIssues or runSddCycle", async () => {
    const listRunningIssues = spyOn(github, "listRunningIssues");
    const runSddCycle = spyOn(agent, "runSddCycle");
    const { frame, runPromise, setup } = await startValidMainRun();
    expect(frame.includes("待機中")).toBe(true);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
    expect(listRunningIssues).not.toHaveBeenCalled();
    expect(runSddCycle).not.toHaveBeenCalled();
    listRunningIssues.mockRestore();
    runSddCycle.mockRestore();
  });
});

async function expectAgentCreateApiKey(
  productionApiKey: string | undefined,
  expectedApiKey: string | undefined,
): Promise<void> {
  const mockAgent = {
    send: async () => ({
      wait: async () => ({ status: "completed" as const, result: "", error: undefined }),
    }),
  };
  const createSpy = spyOn(Agent, "create").mockResolvedValue(mockAgent as never);
  const build = createProductionPollingDeps("/cwd", productionApiKey);
  const polling = build(() => {});
  await polling.createAgent({
    modelId: "composer-2.5",
    cwd: "/cwd",
    settingSources: ["project"],
  });
  expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ apiKey: expectedApiKey }));
  createSpy.mockRestore();
}

describe("createProductionPollingDeps apiKey", () => {
  test("AC-003 passes trimmed apiKey to Agent.create", async () => {
    const apiKey = resolveProductionApiKey({ CURSOR_API_KEY: " sk-example " }, false);
    expect(apiKey).toBe("sk-example");
    await expectAgentCreateApiKey(apiKey, "sk-example");
  });

  test("AC-006 passes undefined apiKey when key is whitespace-only and sdk auth is ready", async () => {
    const apiKey = resolveProductionApiKey({ CURSOR_API_KEY: "   " }, true);
    expect(apiKey).toBeUndefined();
    await expectAgentCreateApiKey(apiKey, undefined);
  });
});

describe("run valid config main screen BNFR-001", () => {
  test("AC-005 AC-103 BNFR-001 layout and q exits 0", async () => {
    const { frame, runPromise, setup } = await startValidMainRun();
    expectValidMainHeader(frame);
    assertNoSecrets(frame, API_KEY);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });
});
