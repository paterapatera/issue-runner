import type { GhRunner } from "../github/index";
import type { AgentRunResult, CreateAgentOptions, LocalAgentSession } from "./index";

export const CHECKOUT = "/home/dev/widgets";
export const REPO = "example/app";
export const ASSIGNEE = "octocat";

type RecordedRun = {
  send: string;
  waitCalls: number;
  waitResult: AgentRunResult;
};

export type RecordedAgent = {
  options: CreateAgentOptions;
  runs: RecordedRun[];
};

export function ghWithIssues(numbers: number[]): GhRunner {
  const issues = numbers.map((number) => ({
    number,
    title: number === 3 ? "GH-3" : `issue-${number}`,
    body: number === 3 ? "" : "body",
    labels: [{ name: "agent:queued" }],
    assignee: { login: ASSIGNEE },
  }));
  return async () => ({ ok: true, stdout: JSON.stringify(issues) });
}

export function emptyGh(): GhRunner {
  return async () => ({ ok: true, stdout: "[]" });
}

export type AgentScript = {
  onSend: (prompt: string, agentIndex: number, runIndex: number) => AgentRunResult;
  onWait?: (prompt: string, agentIndex: number, runIndex: number) => void;
};

export function recordingCreateAgent(
  script: AgentScript,
  agents: RecordedAgent[],
): (options: CreateAgentOptions) => Promise<LocalAgentSession> {
  return async (options: CreateAgentOptions): Promise<LocalAgentSession> => {
    const agent: RecordedAgent = { options, runs: [] };
    agents.push(agent);
    const agentIndex = agents.length - 1;

    return {
      send: async (prompt: string) => {
        const runIndex = agent.runs.length;
        const waitResult = script.onSend(prompt, agentIndex, runIndex);
        const recorded: RecordedRun = {
          send: prompt,
          waitCalls: 0,
          waitResult,
        };
        agent.runs.push(recorded);
        return {
          wait: async () => {
            script.onWait?.(prompt, agentIndex, runIndex);
            recorded.waitCalls += 1;
            return waitResult;
          },
        };
      },
    };
  };
}

export function buildDeps(script: AgentScript, gh: GhRunner = ghWithIssues([3])) {
  const agents: RecordedAgent[] = [];
  const stderr: string[] = [];
  const exitCodes: number[] = [];
  const running = { current: false };

  const createAgent = recordingCreateAgent(script, agents);

  const deps = {
    gh,
    running,
    createAgent,
    writeStderr: (line: string) => stderr.push(line),
    exit: (code: number) => exitCodes.push(code),
  };

  return { deps, agents, stderr, exitCodes, running };
}

export function doneJudgment(): AgentRunResult {
  return { status: "finished", result: '{"kind":"done"}' };
}

function questionJudgment(pairs: { question: string; answer: string }[]): AgentRunResult {
  return {
    status: "finished",
    result: JSON.stringify({ kind: "question", pairs }),
  };
}

export function buildCycleDeps(script: AgentScript) {
  const agents: RecordedAgent[] = [];
  return { deps: { createAgent: recordingCreateAgent(script, agents) }, agents };
}

export function implThenFinishScript(
  implResult = "impl done",
  finishResult = "finish done",
): AgentScript {
  return {
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "finished", result: implResult };
      }
      if (agentIndex === 0 && prompt === "/sdd-finish") {
        return { status: "finished", result: finishResult };
      }
      return doneJudgment();
    },
  };
}

export function implThenDoneScript(implResult = "x"): AgentScript {
  return {
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "finished", result: implResult };
      }
      return doneJudgment();
    },
  };
}

export function implStoppedQuestionScript(
  pairs: { question: string; answer: string }[],
  implResult = "stopped",
): AgentScript {
  return {
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "finished", result: implResult };
      }
      if (agentIndex === 1) {
        return questionJudgment(pairs);
      }
      return doneJudgment();
    },
  };
}
