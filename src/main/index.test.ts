import { afterEach, describe, expect, test } from "bun:test";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestRenderer } from "@opentui/core/testing";
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
import { type RunDeps, run } from "./index.ts";

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

async function runValidMainAndQuit(quit: (setup: RendererSetup) => void): Promise<void> {
  const dir = await createMainTempDir();
  await writeConfigJson(dir, validFile);
  const harness = fixedHarness();
  const runPromise = run({ deps: baseDeps(dir, harness) });
  const { setup } = await waitForFrame(harness, isMainFrame);
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

describe("run exit without TUI", () => {
  test.each([
    ["missing", {}],
    ["empty", { CURSOR_API_KEY: "" }],
    ["whitespace-only", { CURSOR_API_KEY: "   " }],
  ])("AC-004 %s API key exits 1 without starting TUI", async (_label, env) => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const code = await run({ deps: baseDeps(dir, harness, { env }) });
    expect(code).toBe(1);
    expect(harness.tuiStarted()).toBe(false);
  });

  test("spawned process exits 1 when API key is missing", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const code = await spawnMainProcess(dir, { CURSOR_API_KEY: undefined });
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

describe("run valid config main screen BNFR-001", () => {
  test("AC-005 AC-103 BNFR-001 layout and q exits 0", async () => {
    const dir = await createMainTempDir();
    await writeConfigJson(dir, validFile);
    const harness = fixedHarness();
    const runPromise = run({ deps: baseDeps(dir, harness) });
    const { frame, setup } = await waitForFrame(harness, isMainFrame);
    expectValidMainHeader(frame);
    assertNoSecrets(frame, API_KEY);
    setup.mockInput.pressKey("q");
    expect(await runPromise).toBe(0);
  });
});
