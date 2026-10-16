import { type CreateAgentOptions, type LocalAgentSession, runSddCycle } from "../agent/index";
import {
  applyOutcome,
  beginRunning,
  type GhRunner,
  type IssueRow,
  listQueuedIssues,
  listRunningIssues,
} from "../github/index";
import { type GitRunner, prepareWorkBranch, type ReadTextResult } from "../work-branch/index";

const UNEXPECTED_FAILURE_MESSAGE = "予期せぬ失敗が発生しました";
const PRIORITY_JSON_UNREADABLE = "判断の JSON を読めませんでした";
const LABEL_UPDATE_FAILURE = "ラベルを更新できませんでした";

export type StartPollingInput = {
  repository: string;
  assignee: string;
  cwd: string;
  intervalMinutes: number;
};

export type StartPollingDeps = {
  gh: GhRunner;
  git: GitRunner;
  readText: (path: string) => Promise<ReadTextResult>;
  createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>;
  newRunId: () => string;
  writeStderr: (line: string) => void;
  exit: (code: number) => void;
  setStatus: (status: "待機中" | "実行中") => void;
  schedule: (delayMs: number, run: () => void) => void;
};

function agentOptions(cwd: string): CreateAgentOptions {
  return {
    cwd,
    settingSources: ["project"],
    modelId: "composer-2.5",
    fast: false,
  };
}

async function failRunningIssues(input: StartPollingInput, deps: StartPollingDeps): Promise<void> {
  const listed = await listRunningIssues(input.repository, input.assignee, {
    run: deps.gh,
    writeStderr: deps.writeStderr,
  });
  if (!listed.ok) {
    return;
  }

  let missingRunId = false;
  for (const issue of listed.issues) {
    const outcome = await applyOutcome(
      input.repository,
      issue.number,
      { type: "failed", reason: "" },
      { run: deps.gh },
    );
    if (!outcome.ok) {
      deps.writeStderr(LABEL_UPDATE_FAILURE);
      deps.exit(1);
      return;
    }
    if (!issue.hasRunId) {
      missingRunId = true;
    }
  }

  if (missingRunId) {
    deps.writeStderr(UNEXPECTED_FAILURE_MESSAGE);
    deps.exit(1);
  }
}

type PriorityDecision =
  | { ok: true; number: number }
  | { ok: false; reason: "message"; message: string }
  | { ok: false; reason: "invalidJson" };

function parsePriorityJson(text: string, candidates: IssueRow[]): PriorityDecision | undefined {
  const trimmed = text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: "invalidJson" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "invalidJson" };
  }
  const numbers = new Set(candidates.map((row) => row.number));
  const choice = (parsed as { choice?: unknown }).choice;
  if (typeof choice === "number" && numbers.has(choice)) {
    return { ok: true, number: choice };
  }
  const tie = (parsed as { tie?: unknown }).tie;
  if (Array.isArray(tie) && tie.every((value) => typeof value === "number")) {
    const tied = (tie as number[]).filter((value) => numbers.has(value));
    if (tied.length > 0) {
      return { ok: true, number: Math.min(...tied) };
    }
  }
  return { ok: false, reason: "invalidJson" };
}

async function pickIssue(
  cwd: string,
  candidates: IssueRow[],
  createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>,
): Promise<PriorityDecision> {
  if (candidates.length === 1) {
    return { ok: true, number: candidates[0].number };
  }

  const judge = await createAgent(agentOptions(cwd));
  const lines = candidates.map((row) => `#${row.number} title: ${row.title}\nbody: ${row.body}`);
  const prompt = `次の issue のうち、最も優先して処理すべき1件を選び、JSON だけを返してください。1件に決まるときは {"choice":番号}、同じ優先度のときは {"tie":[番号,...]} です。\n\n${lines.join("\n\n")}`;
  const run = await judge.send(prompt);
  const result = await run.wait();
  if (result.status === "error") {
    return { ok: false, reason: "message", message: result.error?.message ?? "" };
  }
  const decision = parsePriorityJson(result.result ?? "", candidates);
  if (decision === undefined) {
    return { ok: false, reason: "invalidJson" };
  }
  return decision;
}

async function exitAfterFailedOutcome(
  input: StartPollingInput,
  issueNumber: number,
  reason: string,
  deps: StartPollingDeps,
): Promise<void> {
  deps.writeStderr(reason);
  const outcome = await applyOutcome(
    input.repository,
    issueNumber,
    { type: "failed", reason },
    { run: deps.gh },
  );
  if (!outcome.ok) {
    deps.writeStderr(LABEL_UPDATE_FAILURE);
  }
  deps.exit(1);
}

async function processIssue(
  input: StartPollingInput,
  issue: IssueRow,
  deps: StartPollingDeps,
): Promise<void> {
  deps.setStatus("実行中");
  const begun = await beginRunning(input.repository, issue.number, {
    run: deps.gh,
    newRunId: deps.newRunId,
  });
  if (!begun.ok) {
    deps.setStatus("待機中");
    return;
  }

  const prepared = await prepareWorkBranch(
    {
      repository: input.repository,
      issueNumber: issue.number,
      title: issue.title,
      body: issue.body,
    },
    {
      gh: deps.gh,
      git: deps.git,
      readText: deps.readText,
      cwd: input.cwd,
      writeStderr: deps.writeStderr,
      exit: deps.exit,
    },
  );
  if (!prepared.ok) {
    return;
  }

  const cycle = await runSddCycle(input.cwd, { createAgent: deps.createAgent });
  if (!cycle.ok) {
    await exitAfterFailedOutcome(input, issue.number, cycle.message, deps);
    return;
  }

  const done = await applyOutcome(
    input.repository,
    issue.number,
    { type: "done" },
    { run: deps.gh },
  );
  if (!done.ok) {
    deps.writeStderr(LABEL_UPDATE_FAILURE);
    deps.exit(1);
    return;
  }
  deps.setStatus("待機中");
}

async function runTick(
  input: StartPollingInput,
  deps: StartPollingDeps,
  busy: { current: boolean },
) {
  if (busy.current) {
    return;
  }

  const running = await listRunningIssues(input.repository, input.assignee, {
    run: deps.gh,
    writeStderr: deps.writeStderr,
  });
  if (!running.ok) {
    return;
  }
  if (running.issues.length > 0) {
    return;
  }

  const queued = await listQueuedIssues(input.repository, input.assignee, {
    run: deps.gh,
    writeStderr: deps.writeStderr,
  });
  if (!queued.ok || queued.issues.length === 0) {
    return;
  }

  const picked = await pickIssue(input.cwd, queued.issues, deps.createAgent);
  if (!picked.ok) {
    if (picked.reason === "invalidJson") {
      deps.writeStderr(PRIORITY_JSON_UNREADABLE);
    } else {
      deps.writeStderr(picked.message);
    }
    deps.exit(1);
    return;
  }

  const issue = queued.issues.find((row) => row.number === picked.number);
  if (issue === undefined) {
    return;
  }

  busy.current = true;
  try {
    await processIssue(input, issue, deps);
  } finally {
    busy.current = false;
  }
}

export async function startPolling(
  input: StartPollingInput,
  deps: StartPollingDeps,
): Promise<void> {
  await failRunningIssues(input, deps);

  const busy = { current: false };
  const delayMs = input.intervalMinutes * 60 * 1000;
  deps.schedule(delayMs, () => {
    void runTick(input, deps, busy);
  });
}
