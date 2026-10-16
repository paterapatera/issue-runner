import { expect, test } from "bun:test";
import { CursorAgentError } from "@cursor/sdk";
import { runSddCycle } from "./index";
import { buildCycleDeps, CHECKOUT, doneJudgment, implThenFinishScript } from "./test-fixtures";

test("AC-004 sends /sdd-finish only after /sdd-impl wait completes", async () => {
  let resolveImplWait: (() => void) | undefined;
  const implWaitGate = new Promise<void>((resolve) => {
    resolveImplWait = resolve;
  });
  const sendOrder: string[] = [];

  const script = implThenFinishScript();
  script.onSend = (prompt, agentIndex, runIndex) => {
    sendOrder.push(prompt);
    return implThenFinishScript().onSend(prompt, agentIndex, runIndex);
  };
  script.onWait = (prompt, agentIndex) => {
    if (agentIndex === 0 && prompt === "/sdd-impl") {
      resolveImplWait?.();
    }
  };

  const { deps, agents } = buildCycleDeps(script);
  const cyclePromise = runSddCycle(CHECKOUT, deps);
  await implWaitGate;
  expect(sendOrder).toEqual(["/sdd-impl"]);
  expect(agents[0]?.runs.some((run) => run.send === "/sdd-finish")).toBe(false);

  const result = await cyclePromise;
  expect(result).toEqual({ ok: true });
  expect(agents[0]?.runs.map((run) => run.send)).toEqual(["/sdd-impl", "/sdd-finish"]);
  expect(agents[0]?.runs[1]?.waitCalls).toBe(1);
});

test("AC-004 sends /sdd-finish once after successful impl", async () => {
  const { deps, agents } = buildCycleDeps(implThenFinishScript());
  const result = await runSddCycle(CHECKOUT, deps);
  expect(result).toEqual({ ok: true });
  const mainRuns = agents[0]?.runs ?? [];
  expect(mainRuns.filter((run) => run.send === "/sdd-finish")).toHaveLength(1);
});

test("run error does not send /sdd-finish and returns message without exit", async () => {
  const { deps, agents } = buildCycleDeps({
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "error", error: { message: "tool failed" } };
      }
      return doneJudgment();
    },
  });

  const result = await runSddCycle(CHECKOUT, deps);
  expect(result).toEqual({ ok: false, message: "tool failed" });
  expect(agents[0]?.runs.some((run) => run.send === "/sdd-finish")).toBe(false);
});

test("startup CursorAgentError returns message without exit", async () => {
  const result = await runSddCycle(CHECKOUT, {
    createAgent: async () => {
      throw new CursorAgentError("missing CURSOR_API_KEY");
    },
  });
  expect(result).toEqual({ ok: false, message: "missing CURSOR_API_KEY" });
});
