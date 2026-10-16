import { CursorAgentError } from "@cursor/sdk";
import { type GhRunner, listQueuedIssues } from "../github/index";

export { CursorAgentError };

const IMPL_PROMPT = "/sdd-impl";
const FINISH_PROMPT = "/sdd-finish";
const JUDGMENT_JSON_UNREADABLE = "判断の JSON を読めませんでした";
const UNEXPECTED_FAILURE_MESSAGE = "予期せぬ失敗が発生しました";
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
  createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>,
): Promise<Judgment | { failed: true; message: string }> {
  try {
    const judge = await createAgent(agentOptions(cwd));
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
  const line = message.length === 0 ? UNEXPECTED_FAILURE_MESSAGE : message;
  deps.writeStderr(line);
  deps.exit(1);
  return { ok: false, exitCode: 1 };
}

async function sendQuestionAnswers(
  session: LocalAgentSession,
  pairs: { question: string; answer: string }[],
): Promise<void> {
  let lastRun: AgentRun | undefined;
  for (const pair of pairs) {
    const answer = recommendedAnswer(pair.question, pair.answer);
    assertForbiddenPrompt(answer);
    lastRun = await session.send(answer);
  }
  if (lastRun !== undefined) {
    await lastRun.wait();
  }
}

async function handleJudgment(
  cwd: string,
  session: LocalAgentSession,
  executionResult: string,
  deps: PollOnceDeps,
): Promise<{ ok: true } | { ok: false; exitCode: 1 }> {
  const judgment = await requestJudgment(cwd, executionResult, deps.createAgent);
  if ("failed" in judgment) {
    return failWithMessage(deps, judgment.message);
  }
  if (judgment.kind === "question") {
    await sendQuestionAnswers(session, judgment.pairs);
  }
  return { ok: true };
}

async function handleJudgmentCycle(
  cwd: string,
  session: LocalAgentSession,
  executionResult: string,
  createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const judgment = await requestJudgment(cwd, executionResult, createAgent);
  if ("failed" in judgment) {
    return { ok: false, message: judgment.message };
  }
  if (judgment.kind === "question") {
    await sendQuestionAnswers(session, judgment.pairs);
  }
  return { ok: true };
}

export async function runSddCycle(
  cwd: string,
  deps: { createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession> },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const session = await deps.createAgent(agentOptions(cwd));
    const implResult = await sendAndWait(session, IMPL_PROMPT);
    if (implResult.status === "error") {
      return { ok: false, message: implResult.error?.message ?? "" };
    }

    const judged = await handleJudgmentCycle(
      cwd,
      session,
      implResult.result ?? "",
      deps.createAgent,
    );
    if (!judged.ok) {
      return judged;
    }

    const finishRun = await session.send(FINISH_PROMPT);
    const finishResult = await finishRun.wait();
    if (finishResult.status === "error") {
      return { ok: false, message: finishResult.error?.message ?? "" };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof CursorAgentError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
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
