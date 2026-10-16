import { type GhRunner, listQueuedIssues } from "../github/index";

export { CursorAgentError } from "@cursor/sdk";

const IMPL_PROMPT = "/sdd-impl";

export type CreateAgentOptions = {
  cwd: string;
  settingSources: ["project"];
  modelId: "composer-2.5";
  fast: false;
};

export type AgentRunResult = {
  status: string;
  result?: string;
  error?: { message: string };
};

export type AgentRun = {
  wait(): Promise<AgentRunResult>;
};

export type LocalAgentSession = {
  send(message: string): Promise<AgentRun>;
};

export type PollOnceDeps = {
  gh: GhRunner;
  running: { current: boolean };
  createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>;
  writeStderr: (line: string) => void;
  exit: (code: number) => void;
};

function agentOptions(cwd: string): CreateAgentOptions {
  return {
    cwd,
    settingSources: ["project"],
    modelId: "composer-2.5",
    fast: false,
  };
}

function parseJudgmentDone(text: string): boolean {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return false;
    }
    return (parsed as { kind?: unknown }).kind === "done";
  } catch {
    return false;
  }
}

async function requestJudgmentDone(
  cwd: string,
  executionResult: string,
  deps: PollOnceDeps,
): Promise<boolean> {
  const judge = await deps.createAgent(agentOptions(cwd));
  const prompt = `次の local agent の実行結果を読み、JSON だけを返してください。完了なら {"kind":"done"}、人の確認が必要なら {"kind":"question","pairs":[{"question":"...","answer":"..."}]} の形にしてください。\n\n${executionResult}`;
  const run = await judge.send(prompt);
  const result = await run.wait();
  const body = result.result ?? "";
  return parseJudgmentDone(body);
}

export async function pollOnce(
  input: { repository: string; assignee: string; cwd: string },
  deps: PollOnceDeps,
): Promise<{ ok: true } | { ok: false; exitCode: 1 }> {
  if (deps.running.current) {
    return { ok: true };
  }

  const listed = await listQueuedIssues(input.repository, input.assignee, {
    run: deps.gh,
    writeStderr: deps.writeStderr,
  });
  if (!listed.ok) {
    return { ok: true };
  }
  if (listed.issues.length === 0) {
    return { ok: true };
  }

  deps.running.current = true;
  try {
    const session = await deps.createAgent(agentOptions(input.cwd));
    const run = await session.send(IMPL_PROMPT);
    const result = await run.wait();

    const executionText = result.result ?? "";
    const isDone = await requestJudgmentDone(input.cwd, executionText, deps);
    if (isDone) {
      return { ok: true };
    }

    return { ok: true };
  } finally {
    deps.running.current = false;
  }
}
