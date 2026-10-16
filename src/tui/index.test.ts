import { describe, expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { expectValidMainHeader } from "../test-support/main-layout.ts";
import {
  type CreateRenderer,
  type MainView,
  runMain,
  runSettings,
  type SettingsDraft,
} from "./index.ts";

const API_KEY = "sk-test-123";

type RendererSetup = Awaited<ReturnType<typeof createTestRenderer>>;

function repeatChar(char: string, count: number): string {
  return char.repeat(count);
}

function defaultMainView(overrides: Partial<MainView> = {}): MainView {
  return {
    repository: "acme/widgets",
    intervalLabel: "2分",
    model: "composer-2.5",
    assignee: "octocat",
    status: "待機中",
    quitKey: "q",
    ...overrides,
  };
}

function defaultSettingsDraft(overrides: Partial<SettingsDraft> = {}): SettingsDraft {
  return {
    repository: "acme/widgets",
    interval: "2",
    model: "composer-2.5",
    assignee: "octocat",
    ...overrides,
  };
}

async function waitForSetup(locate: () => RendererSetup | undefined): Promise<RendererSetup> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const setup = locate();
    if (setup) {
      return setup;
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error("renderer setup timed out");
}

function frameLines(frame: string): string[] {
  return frame.split("\n").map((line) => line.trimEnd());
}

function trimmedLines(frame: string): string[] {
  return frameLines(frame)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function assertNoSecrets(frame: string): void {
  expect(frame.includes(API_KEY)).toBe(false);
  expect(frame.includes("トークン")).toBe(false);
}

function expectFullyVisible(frame: string, text: string): void {
  const compactFrame = frame.replace(/\s/g, "");
  const compactText = text.replace(/\s/g, "");
  expect(compactFrame.includes(compactText)).toBe(true);
}

async function captureTuiFrame(
  width: number,
  height: number,
  start: (createRenderer: CreateRenderer) => Promise<unknown>,
  finish: (setup: RendererSetup) => void,
): Promise<string> {
  let setup: RendererSetup | undefined;
  const createRenderer: CreateRenderer = async () => {
    setup = await createTestRenderer({ width, height, exitOnCtrlC: false });
    return setup.renderer;
  };
  const runPromise = start(createRenderer);
  const ready = await waitForSetup(() => setup);
  await ready.flush();
  const frame = ready.captureCharFrame();
  finish(ready);
  await runPromise;
  return frame;
}

async function captureMainFrame(width: number, height: number, view: MainView): Promise<string> {
  return captureTuiFrame(
    width,
    height,
    (createRenderer) => runMain(view, { createRenderer }),
    (ready) => {
      ready.mockInput.pressKey("q");
    },
  );
}

function createSettingsTestHarness(): {
  createRenderer: CreateRenderer;
  waitForReady: () => Promise<RendererSetup>;
} {
  let setup: RendererSetup | undefined;
  const createRenderer: CreateRenderer = async () => {
    setup = await createTestRenderer({ width: 80, height: 24, exitOnCtrlC: false });
    return setup.renderer;
  };
  return {
    createRenderer,
    waitForReady: () => waitForSetup(() => setup),
  };
}

async function captureSettingsFrame(
  width: number,
  height: number,
  draft: SettingsDraft,
): Promise<string> {
  return captureTuiFrame(
    width,
    height,
    (createRenderer) =>
      runSettings(draft, async () => ({ ok: false, message: "" }), { createRenderer }),
    (ready) => {
      ready.mockInput.pressCtrlC();
    },
  );
}

describe("runMain long text wrapping", () => {
  test("AC-076 long repository at width 80", async () => {
    const repository = `${repeatChar("a", 39)}/${repeatChar("b", 100)}`;
    const frame = await captureMainFrame(80, 30, defaultMainView({ repository }));
    expectFullyVisible(frame, repository);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });

  test("AC-082 long assignee at width 20", async () => {
    const assignee = repeatChar("a", 39);
    const frame = await captureMainFrame(20, 60, defaultMainView({ assignee }));
    expectFullyVisible(frame, assignee);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });

  test("AC-088 long model at width 20", async () => {
    const model = repeatChar("m", 40);
    const frame = await captureMainFrame(20, 60, defaultMainView({ model }));
    expectFullyVisible(frame, model);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });
});

describe("runMain narrow widths", () => {
  test("AC-094 status 待機中 at width 2", async () => {
    const frame = await captureMainFrame(2, 40, defaultMainView());
    for (const char of ["待", "機", "中"]) {
      expect(frame.includes(char)).toBe(true);
    }
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });

  test("AC-097 quitKey q at width 1", async () => {
    const frame = await captureMainFrame(1, 120, defaultMainView());
    expect(frame.includes("q")).toBe(true);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });
});

describe("runMain embedded newlines", () => {
  test("AC-096 status splits on embedded newline", async () => {
    const frame = await captureMainFrame(
      80,
      12,
      defaultMainView({
        status: "待\n機中",
        repository: "r",
        intervalLabel: "1分",
        model: "m",
        assignee: "a",
      }),
    );
    const lines = trimmedLines(frame);
    const waitIndex = lines.indexOf("待");
    expect(waitIndex).toBeGreaterThanOrEqual(0);
    expect(lines[waitIndex + 1]).toBe("機中");
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });

  test("AC-099 quitKey splits on embedded newline", async () => {
    const frame = await captureMainFrame(
      80,
      12,
      defaultMainView({
        quitKey: "q\nq",
        repository: "r",
        intervalLabel: "1分",
        model: "m",
        assignee: "a",
      }),
    );
    const qLines = trimmedLines(frame).filter((line) => line === "q");
    expect(qLines).toEqual(["q", "q"]);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });
});

describe("runMain default layout", () => {
  test("AC-001 default main layout at width 80", async () => {
    const frame = await captureMainFrame(80, 24, defaultMainView());
    expectValidMainHeader(frame);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });
});

describe("runMain status updates", () => {
  test("AC-020 AC-021 shows 待機中 then 実行中 with settings and quit key", async () => {
    let setup: RendererSetup | undefined;
    let setStatus: ((status: string) => void) | undefined;
    const createRenderer: CreateRenderer = async () => {
      setup = await createTestRenderer({ width: 80, height: 24, exitOnCtrlC: false });
      return setup.renderer;
    };
    const runPromise = runMain(defaultMainView(), {
      createRenderer,
      onReady: ({ setStatus: update }) => {
        setStatus = update;
      },
    });
    const ready = await waitForSetup(() => setup);
    await ready.flush();
    const initialFrame = ready.captureCharFrame();
    expectFullyVisible(initialFrame, "待機中");
    expectValidMainHeader(initialFrame);

    setStatus?.("実行中");
    await ready.flush();
    const runningFrame = ready.captureCharFrame();
    expectFullyVisible(runningFrame, "実行中");
    expect(runningFrame.includes("q")).toBe(true);
    expect(runningFrame.includes("acme/widgets")).toBe(true);
    expect(runningFrame.includes("octocat")).toBe(true);

    ready.mockInput.pressKey("q");
    await ready.flush();
    await runPromise;
  });
});

describe("runSettings rendering", () => {
  test("Ctrl+C cancels the form", async () => {
    const harness = createSettingsTestHarness();
    const runPromise = runSettings(defaultSettingsDraft(), async () => ({ ok: true }), {
      createRenderer: harness.createRenderer,
    });
    const ready = await harness.waitForReady();
    await ready.flush();
    ready.mockInput.pressCtrlC();
    await ready.flush();
    expect(await runPromise).toBe("cancel");
  });

  test("Enter submits the form", async () => {
    let submitted: SettingsDraft | undefined;
    const harness = createSettingsTestHarness();
    const runPromise = runSettings(
      defaultSettingsDraft(),
      async (draft) => {
        submitted = draft;
        return { ok: true };
      },
      { createRenderer: harness.createRenderer },
    );
    const ready = await harness.waitForReady();
    await ready.flush();
    ready.mockInput.pressEnter();
    await ready.flush();
    expect(await runPromise).toBe("saved");
    expect(submitted).toEqual(defaultSettingsDraft());
  });

  test("settings form at width 80", async () => {
    const frame = await captureSettingsFrame(80, 24, defaultSettingsDraft());
    expect(frame.includes("repository")).toBe(true);
    expect(frame.includes("acme/widgets")).toBe(true);
    expect(frame.includes("interval")).toBe(true);
    expect(frame.includes("model")).toBe(true);
    expect(frame.includes("assignee")).toBe(true);
    expect(frame).toMatchSnapshot();
    assertNoSecrets(frame);
  });
});
