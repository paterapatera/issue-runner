import { describe, expect, test } from "bun:test";
import type { GhRunner } from "../github/index";
import { type CreateAgentOptions, type LocalAgentSession, pollOnce } from "./index";
import {
  ASSIGNEE,
  buildDeps,
  CHECKOUT,
  doneJudgment,
  emptyGh,
  ghWithIssues,
  implThenDoneScript,
  REPO,
  type RecordedAgent,
} from "./test-fixtures";

test("AC-001 AC-003 AC-005 AC-009 uses checkout, project settings, composer-2.5, /sdd-impl", async () => {
  const { deps, agents } = buildDeps(implThenDoneScript("done run"));

  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);

  expect(agents[0]?.options).toEqual({
    cwd: CHECKOUT,
    settingSources: ["project"],
    modelId: "composer-2.5",
    fast: false,
  });
  expect(agents[0]?.runs[0]?.send).toBe("/sdd-impl");
  expect(agents[0]?.runs[0]?.waitCalls).toBe(1);
});

test("AC-002 cwd stays checkout when runner directory differs", async () => {
  const { deps, agents } = buildDeps(implThenDoneScript());
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(agents[0]?.options.cwd).toBe(CHECKOUT);
});

test("AC-006 model stays composer-2.5 regardless of issue-runner.json model", async () => {
  const { deps, agents } = buildDeps(implThenDoneScript());
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(agents.every((agent) => agent.options.modelId === "composer-2.5")).toBe(true);
  expect(agents.every((agent) => agent.options.fast === false)).toBe(true);
});

test("AC-007 AC-010 AC-036 prompt is /sdd-impl for GH-3 and empty spec name", async () => {
  for (const body of ["", "slug"]) {
    const issues = [
      {
        number: 3,
        title: "GH-3",
        body,
        labels: [{ name: "agent:queued" }],
        assignee: { login: ASSIGNEE },
      },
    ];
    const gh: GhRunner = async () => ({ ok: true, stdout: JSON.stringify(issues) });
    const { deps, agents } = buildDeps(implThenDoneScript(), gh);
    await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
    expect(agents[0]?.runs[0]?.send).toBe("/sdd-impl");
  }
});

test("AC-008 does not start issue 4 while issue 3 is running", async () => {
  let resolveWait: (() => void) | undefined;
  const waitGate = new Promise<void>((resolve) => {
    resolveWait = resolve;
  });

  const agents: RecordedAgent[] = [];
  const running = { current: false };
  let createCount = 0;

  const createAgent = async (options: CreateAgentOptions): Promise<LocalAgentSession> => {
    createCount += 1;
    const agent: RecordedAgent = { options, runs: [] };
    agents.push(agent);
    return {
      send: async (prompt: string) => {
        agent.runs.push({
          send: prompt,
          waitCalls: 0,
          waitResult: { status: "finished", result: "x" },
        });
        return {
          wait: async () => {
            if (createCount === 1 && prompt === "/sdd-impl") {
              await waitGate;
            }
            return { status: "finished", result: "x" };
          },
        };
      },
    };
  };

  const deps = {
    gh: ghWithIssues([3, 4]),
    running,
    createAgent,
    writeStderr: () => {},
    exit: () => {},
  };

  const first = pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  for (let i = 0; i < 50 && !running.current; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(running.current).toBe(true);

  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(createCount).toBe(1);

  resolveWait?.();
  await first;
});

test("AC-031 starts issue 4 after issue 3 completes", async () => {
  const { deps, agents } = buildDeps(implThenDoneScript(), ghWithIssues([3, 4]));

  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);

  expect(agents.filter((agent) => agent.runs.some((run) => run.send === "/sdd-impl")).length).toBe(
    2,
  );
});

test("AC-028 AC-038 no finish prompts after done judgment", async () => {
  const { deps, agents } = buildDeps(implThenDoneScript());
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  const prompts = agents.flatMap((agent) => agent.runs.map((run) => run.send));
  expect(prompts).not.toContain("受け入れテストは合格。PRを作成する。");
  expect(prompts).not.toContain("/sdd-finish");
});

describe("pollOnce empty queue", () => {
  test("starts from zero queued issues", async () => {
    const { deps, agents } = buildDeps(
      {
        onSend: () => doneJudgment(),
      },
      emptyGh(),
    );
    await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
    expect(agents.length).toBe(0);
  });
});
