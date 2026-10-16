import { expect, test } from "bun:test";
import { CursorAgentError } from "@cursor/sdk";
import type { CreateAgentOptions } from "./index";
import { pollOnce } from "./index";
import {
  ASSIGNEE,
  buildDeps,
  CHECKOUT,
  doneJudgment,
  ghWithIssues,
  REPO,
  type RecordedAgent,
} from "./test-fixtures";

async function pollOnceWhenImplErrors(
  error: { message?: string },
  issueNumbers: number[],
): Promise<{
  result: Awaited<ReturnType<typeof pollOnce>>;
  stderr: string[];
  exitCodes: number[];
  agents: ReturnType<typeof buildDeps>["agents"];
}> {
  const { deps, stderr, exitCodes, agents } = buildDeps(
    {
      onSend: (prompt, agentIndex) => {
        if (agentIndex === 0 && prompt === "/sdd-impl") {
          return { status: "error", error };
        }
        return doneJudgment();
      },
    },
    ghWithIssues(issueNumbers),
  );
  const result = await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  return { result, stderr, exitCodes, agents };
}

test("AC-034 AC-033 AC-015 startup CursorAgentError exits 1 without wait", async () => {
  const stderr: string[] = [];
  const exitCodes: number[] = [];
  const running = { current: false };
  const createAgent = async () => {
    throw new CursorAgentError("missing CURSOR_API_KEY");
  };

  const result = await pollOnce(
    { repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT },
    {
      gh: ghWithIssues([3, 4]),
      running,
      createAgent,
      writeStderr: (line) => stderr.push(line),
      exit: (code) => exitCodes.push(code),
    },
  );

  expect(result).toEqual({ ok: false, exitCode: 1 });
  expect(stderr).toEqual(["missing CURSOR_API_KEY"]);
  expect(exitCodes).toEqual([1]);
  expect(running.current).toBe(false);
});

test("AC-008 empty run error message exits 1 with unexpected failure line", async () => {
  const { result, stderr, exitCodes } = await pollOnceWhenImplErrors({}, [3]);
  expect(result).toEqual({ ok: false, exitCode: 1 });
  expect(stderr).toEqual(["予期せぬ失敗が発生しました"]);
  expect(exitCodes).toEqual([1]);
});

test("AC-032 AC-016 AC-029 run error waits once and does not start issue 4", async () => {
  const { result, stderr, exitCodes, agents } = await pollOnceWhenImplErrors(
    { message: "tool failed" },
    [3, 4],
  );
  expect(result).toEqual({ ok: false, exitCode: 1 });
  expect(stderr).toEqual(["tool failed"]);
  expect(exitCodes).toEqual([1]);
  expect(agents[0]?.runs[0]?.waitCalls).toBe(1);
  expect(agents.length).toBe(1);
});

test("AC-030 startup failure does not send finish prompts", async () => {
  const agents: RecordedAgent[] = [];
  const createAgent = async (options: CreateAgentOptions) => {
    agents.push({ options, runs: [] });
    throw new CursorAgentError("missing CURSOR_API_KEY");
  };
  await pollOnce(
    { repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT },
    {
      gh: ghWithIssues([3]),
      running: { current: false },
      createAgent,
      writeStderr: () => {},
      exit: () => {},
    },
  );
  expect(agents.flatMap((a) => a.runs.map((r) => r.send))).toEqual([]);
});

test("AC-015 AC-016 failure messages differ between startup and run error", async () => {
  const startup = buildDeps(
    {
      onSend: () => ({ status: "finished", result: "x" }),
    },
    ghWithIssues([3]),
  );
  startup.deps.createAgent = async () => {
    throw new CursorAgentError("missing CURSOR_API_KEY");
  };
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, startup.deps);

  const runtime = buildDeps({
    onSend: (_prompt, agentIndex) => {
      if (agentIndex === 0) {
        return { status: "error", error: { message: "tool failed" } };
      }
      return doneJudgment();
    },
  });
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, runtime.deps);

  expect(startup.stderr[0]).not.toBe(runtime.stderr[0]);
});
