import { describe, expect, test } from "bun:test";
import { type AgentScript, implThenFinishScript } from "../agent/test-fixtures";
import { startPolling } from "./index";
import {
  commentBodies,
  createPollHarness,
  dualPriorityQueuedState,
  failGhWhenMarkingFailed,
  judgmentScript,
  labelsFromEdit,
  lastAddedLabel,
  noBranchGit,
  POLL_CWD,
  POLL_RESTART_RUN_ID,
  POLL_RUN_ID,
  queuedIssue,
  runningIssue,
  runScheduledTick,
  sddPrompts,
  successGit,
  toolFailedOnImplScript,
} from "./test-fixtures";

describe("startPolling queue and assignee", () => {
  test("AC-001 only octocat issue 7 starts when issue 9 is another assignee", async () => {
    const harness = createPollHarness({
      ghState: {
        queued: [
          queuedIssue({ number: 7, title: "GH-7", body: "" }),
          queuedIssue({ number: 9, assignee: { login: "hubot" } }),
        ],
        running: [],
        comments: {},
      },
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(sddPrompts(harness.agents)).toEqual(["/sdd-impl", "/sdd-finish"]);
    expect(lastAddedLabel(harness.ghCalls, 7)).toBe("agent:done");
    expect(lastAddedLabel(harness.ghCalls, 9)).toBeUndefined();
  });

  test("AC-002 does nothing when queued is empty", async () => {
    const harness = createPollHarness({
      ghState: { queued: [], running: [], comments: {} },
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(harness.agents).toHaveLength(0);
  });
});

describe("startPolling success path", () => {
  test("AC-003 observes beginRunning, work branch, sdd cycle, and done order", async () => {
    const events: string[] = [];
    const { git, calls: gitCalls } = successGit();
    const harness = createPollHarness({
      ghState: {
        queued: [queuedIssue({ number: 7, title: "GH-7", body: "" })],
        running: [],
        comments: {},
      },
      git: async (argv) => {
        if (argv[0] === "ls-remote") {
          events.push("spec-resolve");
        }
        if (argv[0] === "checkout") {
          events.push("checkout");
        }
        return git(argv);
      },
    });
    const originalGh = harness.deps.gh;
    harness.deps.gh = async (argv, options) => {
      const result = await originalGh(argv, options);
      if (argv[0] === "issue" && argv[1] === "comment") {
        events.push("run-id-comment");
      }
      if (argv[0] === "issue" && argv[1] === "edit") {
        events.push(`label:${lastAddedLabel([{ argv, stdin: options?.stdin }], Number(argv[2]))}`);
      }
      return result;
    };
    harness.deps.readText = async (_path) => {
      events.push("read-config");
      return { ok: true, text: 'export default defineConfig({ issueIdPrefix: "GH" });' };
    };
    const harnessWithEvents = createPollHarness({
      ghState: {
        queued: [queuedIssue({ number: 7, title: "GH-7", body: "" })],
        running: [],
        comments: {},
      },
      git: harness.deps.git,
      script: (() => {
        const cycle = implThenFinishScript();
        return {
          onSend: (prompt, agentIndex, runIndex) => {
            if (prompt === "/sdd-impl") {
              events.push("/sdd-impl");
            }
            if (prompt === "/sdd-finish") {
              events.push("/sdd-finish");
            }
            return cycle.onSend(prompt, agentIndex, runIndex);
          },
        };
      })(),
    });
    harness.deps.createAgent = harnessWithEvents.deps.createAgent;
    harness.agents = harnessWithEvents.agents;

    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);

    expect(events).toEqual([
      "run-id-comment",
      "label:agent:running",
      "read-config",
      "spec-resolve",
      "checkout",
      "/sdd-impl",
      "/sdd-finish",
      "label:agent:done",
    ]);
    expect(gitCalls.some((argv) => argv[0] === "checkout" && argv[1] === "gh-7-work")).toBe(true);
  });
});

describe("startPolling work branch failure", () => {
  test("AC-005 AC-012 prepareWorkBranch failure skips sdd and exits 1", async () => {
    const harness = createPollHarness({
      ghState: {
        queued: [queuedIssue({ number: 7, title: "GH-7" })],
        running: [],
        comments: {},
      },
      git: noBranchGit(),
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(sddPrompts(harness.agents)).toEqual([]);
    expect(harness.stderr).toEqual(["該当する作業ブランチがありません"]);
    expect(harness.exitCodes).toEqual([1]);
    expect(lastAddedLabel(harness.ghCalls, 7)).toBe("agent:failed");
  });
});

describe("startPolling running guard", () => {
  test.each([
    ["AC-006", [queuedIssue({ number: 7 })]],
    ["AC-007", [] as ReturnType<typeof queuedIssue>[]],
  ])("%s skips tick when issue 8 is running", async (_ac, queued) => {
    const harness = createPollHarness({
      ghState: { queued, running: [], comments: {} },
    });
    await startPolling(harness.input, harness.deps);
    harness.setRunningAtTick([runningIssue({ number: 8 })]);
    await runScheduledTick(harness);
    expect(harness.agents).toHaveLength(0);
  });
});

describe("startPolling restart cleanup", () => {
  test("AC-008 AC-009 restart marks running with run id failed without sdd", async () => {
    const harness = createPollHarness({
      ghState: {
        queued: [],
        running: [runningIssue({ number: 8 })],
        comments: { 8: [{ body: POLL_RESTART_RUN_ID }] },
      },
    });
    await startPolling(harness.input, harness.deps);
    expect(sddPrompts(harness.agents)).toEqual([]);
    expect(lastAddedLabel(harness.ghCalls, 8)).toBe("agent:failed");
    expect(
      harness.ghCalls.some((call) => labelsFromEdit(call.argv).added.includes("agent:done")),
    ).toBe(false);
  });

  test("AC-009 prior running issues stay failed on restart", async () => {
    const harness = createPollHarness({
      ghState: {
        queued: [],
        running: [runningIssue({ number: 8 }), runningIssue({ number: 10 })],
        comments: {
          8: [{ body: POLL_RESTART_RUN_ID }],
          10: [{ body: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff" }],
        },
      },
    });
    await startPolling(harness.input, harness.deps);
    expect(lastAddedLabel(harness.ghCalls, 8)).toBe("agent:failed");
    expect(lastAddedLabel(harness.ghCalls, 10)).toBe("agent:failed");
  });

  test("AC-018 running without run id exits 1 with unexpected failure message", async () => {
    const harness = createPollHarness({
      ghState: { queued: [], running: [runningIssue({ number: 8 })], comments: {} },
    });
    await startPolling(harness.input, harness.deps);
    expect(harness.stderr).toEqual(["予期せぬ失敗が発生しました"]);
    expect(harness.exitCodes).toEqual([1]);
    expect(sddPrompts(harness.agents)).toEqual([]);
  });
});

describe("startPolling concurrency", () => {
  test("AC-010 does not start issue 9 on next tick while issue 7 is busy", async () => {
    let releaseImpl: (() => void) | undefined;
    const implGate = new Promise<void>((resolve) => {
      releaseImpl = resolve;
    });
    const cycle = implThenFinishScript();
    const script: AgentScript = {
      onSend: (prompt, agentIndex, runIndex) => {
        if (agentIndex === 0 && prompt.includes("JSON")) {
          return { status: "finished", result: '{"choice":7}' };
        }
        return cycle.onSend(prompt, agentIndex, runIndex);
      },
      onWait: async (prompt, agentIndex) => {
        if (agentIndex === 1 && prompt === "/sdd-impl") {
          await implGate;
        }
      },
    };
    const harness = createPollHarness({
      ghState: {
        queued: [queuedIssue({ number: 7 }), queuedIssue({ number: 9 })],
        running: [],
        comments: {},
      },
      script,
    });
    await startPolling(harness.input, harness.deps);
    const tick = harness.schedules[0]?.run;
    tick?.();
    await Bun.sleep(0);
    harness.ghState.queued = [queuedIssue({ number: 9 })];
    tick?.();
    await Bun.sleep(0);
    expect(
      harness.agents.filter((agent) => agent.runs.some((run) => run.send === "/sdd-impl")),
    ).toHaveLength(1);
    releaseImpl?.();
    await Bun.sleep(0);
  });
});

describe("startPolling priority pick", () => {
  test("AC-011 picks issue 9 when judgment chooses 9", async () => {
    const harness = createPollHarness({
      ghState: dualPriorityQueuedState(),
      script: judgmentScript('{"choice":9}'),
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(commentBodies(harness.ghCalls).filter((body) => body === POLL_RUN_ID)).toHaveLength(1);
    expect(harness.ghCalls.some((call) => call.argv[2] === "9" && call.argv[1] === "comment")).toBe(
      true,
    );
    expect(harness.agents[0]?.options).toEqual({
      cwd: POLL_CWD,
      settingSources: ["project"],
      modelId: "composer-2.5",
      fast: false,
    });
    harness.ghState.queued = [queuedIssue({ number: 7, body: "優先度は低い" })];
    await runScheduledTick(harness);
    expect(
      harness.ghCalls.filter((call) => call.argv[2] === "7" && call.argv[1] === "comment").length,
    ).toBeGreaterThan(0);
  });
});

describe("startPolling priority tie and errors", () => {
  test("AC-011 tie starts issue 7 first", async () => {
    const harness = createPollHarness({
      ghState: dualPriorityQueuedState(),
      script: judgmentScript('{"tie":[7,9]}'),
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(harness.ghCalls.some((call) => call.argv[2] === "7" && call.argv[1] === "comment")).toBe(
      true,
    );
    const nineCommentsBeforeSecondTick = harness.ghCalls.filter(
      (call) => call.argv[2] === "9" && call.argv[1] === "comment",
    ).length;
    harness.ghState.queued = [queuedIssue({ number: 9, body: "優先度は高い" })];
    await runScheduledTick(harness);
    expect(
      harness.ghCalls.filter((call) => call.argv[2] === "9" && call.argv[1] === "comment").length,
    ).toBeGreaterThan(nineCommentsBeforeSecondTick);
  });

  test("AC-017 judgment model unavailable exits 1 without starting issues", async () => {
    const harness = createPollHarness({
      ghState: dualPriorityQueuedState(),
      script: {
        onSend: (prompt, agentIndex) => {
          if (agentIndex === 0 && prompt.includes("JSON")) {
            return { status: "error", error: { message: "model unavailable" } };
          }
          return { status: "finished", result: "x" };
        },
      },
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(harness.stderr).toEqual(["model unavailable"]);
    expect(harness.exitCodes).toEqual([1]);
    expect(commentBodies(harness.ghCalls)).toHaveLength(0);
  });
});

describe("startPolling run errors", () => {
  test("AC-013 tool failed marks failed exits 1 without finish", async () => {
    const harness = createPollHarness({
      ghState: { queued: [queuedIssue({ number: 7 })], running: [], comments: {} },
      script: toolFailedOnImplScript(),
    });
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(sddPrompts(harness.agents)).toEqual(["/sdd-impl"]);
    expect(harness.stderr).toEqual(["tool failed"]);
    expect(harness.exitCodes).toEqual([1]);
    expect(lastAddedLabel(harness.ghCalls, 7)).toBe("agent:failed");
  });

  test("AC-016 label update failure on failed outcome exits 1", async () => {
    const harness = createPollHarness({
      ghState: { queued: [queuedIssue({ number: 7 })], running: [], comments: {} },
      script: toolFailedOnImplScript(),
    });
    failGhWhenMarkingFailed(harness);
    await startPolling(harness.input, harness.deps);
    await runScheduledTick(harness);
    expect(harness.stderr).toEqual(["tool failed", "ラベルを更新できませんでした"]);
    expect(harness.exitCodes).toEqual([1]);
  });
});
