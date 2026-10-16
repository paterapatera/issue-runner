import { CursorAgentError } from "@cursor/sdk";
import { type GhRunner, listQueuedIssues } from "../github/index";

export { CursorAgentError };

const IMPL_PROMPT = "/sdd-impl";
const JUDGMENT_JSON_UNREADABLE = "判断の JSON を読めませんでした";
const FORBIDDEN_PROMPTS = ["受け入れテストは合格。PRを作成する。", "/sdd-finish"];

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

type JudgmentDone = { kind: "done" };
type JudgmentQuestion = {
  kind: "question";
  pairs: { question: string; answer: string }[];
};
type Judgment = JudgmentDone | JudgmentQuestion;

function agentOptions(cwd: string): CreateAgentOptions {
  return {
    cwd,
    settingSources: ["project"],
    modelId: "composer-2.5",
    fast: false,
  };
}

function assertForbiddenPrompt(message: string): void {
  for (const forbidden of FORBIDDEN_PROMPTS) {
    if (message === forbidden || message.includes(forbidden)) {
      throw new Error(`forbidden prompt: ${forbidden}`);
    }
  }
}

function parseQuestionPairs(pairs: unknown): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return undefined;
  }
  const normalized: { question: string; answer: string }[] = [];
  for (const pair of pairs) {
    if (typeof pair !== "object" || pair === null) {
      return undefined;
    }
    const question = (pair as { question?: unknown }).question;
    const answer = (pair as { answer?: unknown }).answer;
    if (typeof question !== "string" || typeof answer !== "string") {
      return undefined;
    }
    if (question.length === 0 || answer.length === 0) {
      return undefined;
    }
    normalized.push({ question, answer });
  }
  return normalized;
}

function parseJudgmentJson(text: string): Judgment | undefined {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }
    const kind = (parsed as { kind?: unknown }).kind;
    if (kind === "done") {
      return { kind: "done" };
    }
    if (kind === "question") {
      const pairs = parseQuestionPairs((parsed as { pairs?: unknown }).pairs);
      if (pairs === undefined) {
        return undefined;
      }
      return { kind: "question", pairs };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function recommendedAnswer(question: string, jsonAnswer: string): string {
  const segments = question.split(/[、,]/);
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.includes("（推奨）")) {
      return trimmed.replace(/（推奨）/g, "").trim();
    }
    if (trimmed.includes("(推奨)")) {
      return trimmed.replace(/\(推奨\)/g, "").trim();
    }
  }
  return jsonAnswer;
}

async function sendAndWait(session: LocalAgentSession, message: string): Promise<AgentRunResult> {
  assertForbiddenPrompt(message);
  const run = await session.send(message);
  return run.wait();
}

async function requestJudgment(
  cwd: string,
  executionResult: string,
  deps: PollOnceDeps,
): Promise<Judgment | { failed: true; message: string }> {
  try {
    const judge = await deps.createAgent(agentOptions(cwd));
    const prompt = `次の local agent の実行結果を読み、JSON だけを返してください。完了なら {"kind":"done"}、人の確認が必要なら {"kind":"question","pairs":[{"question":"...","answer":"..."}]} の形にしてください。\n\n${executionResult}`;
    const result = await sendAndWait(judge, prompt);
    if (result.status === "error") {
      const message = result.error?.message ?? "";
      return { failed: true, message };
    }
    const body = result.result ?? "";
    const judgment = parseJudgmentJson(body);
    if (judgment === undefined) {
      return { failed: true, message: JUDGMENT_JSON_UNREADABLE };
    }
    return judgment;
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return { failed: true, message: error.message };
    }
    throw error;
  }
}

function failWithMessage(deps: PollOnceDeps, message: string): { ok: false; exitCode: 1 } {
  deps.writeStderr(message);
  deps.exit(1);
  return { ok: false, exitCode: 1 };
}

async function handleJudgment(
  cwd: string,
  session: LocalAgentSession,
  executionResult: string,
  deps: PollOnceDeps,
): Promise<{ ok: true } | { ok: false; exitCode: 1 }> {
  const judgment = await requestJudgment(cwd, executionResult, deps);
  if ("failed" in judgment) {
    return failWithMessage(deps, judgment.message);
  }
  if (judgment.kind === "done") {
    return { ok: true };
  }

  let lastRun: AgentRun | undefined;
  for (const pair of judgment.pairs) {
    const answer = recommendedAnswer(pair.question, pair.answer);
    assertForbiddenPrompt(answer);
    lastRun = await session.send(answer);
  }
  if (lastRun !== undefined) {
    await lastRun.wait();
  }
  return { ok: true };
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

    if (result.status === "error") {
      return failWithMessage(deps, result.error?.message ?? "");
    }

    const executionText = result.result ?? "";
    return await handleJudgment(input.cwd, session, executionText, deps);
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return failWithMessage(deps, error.message);
    }
    throw error;
  } finally {
    deps.running.current = false;
  }
}
