import { spawn } from "node:child_process";

export type IssueRow = { number: number; title: string; body: string };

export type GhRunResult = { ok: true; stdout: string } | { ok: false };

export type GhRunner = (argv: string[], options?: { stdin?: string }) => Promise<GhRunResult>;

const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"] as const;

const LIST_FAILURE_MESSAGE = "issue の列挙に失敗しました\n";

const LOWER_UUID_BODY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type GhIssue = {
  number: number;
  title: string;
  body: string | null;
  pull_request?: unknown;
  assignee?: { login: string } | null;
  labels?: { name: string }[];
};

export function defaultGhRunner(
  argv: string[],
  options?: { stdin?: string },
): Promise<GhRunResult> {
  return new Promise((resolve) => {
    const child = spawn("gh", argv, {
      stdio: [options?.stdin === undefined ? "ignore" : "pipe", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    if (options?.stdin !== undefined) {
      child.stdin?.write(options.stdin);
      child.stdin?.end();
    }
    child.on("error", () => resolve({ ok: false }));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ ok: false });
        return;
      }
      resolve({ ok: true, stdout });
    });
  });
}

function parseGhJsonArray(stdout: string): GhIssue[] {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as GhIssue[];
    }
  } catch {
    // fall through
  }
  const issues: GhIssue[] = [];
  for (const line of trimmed.split("\n")) {
    const chunk = line.trim();
    if (chunk.length === 0) {
      continue;
    }
    const parsed = JSON.parse(chunk) as unknown;
    if (Array.isArray(parsed)) {
      issues.push(...(parsed as GhIssue[]));
    } else {
      issues.push(parsed as GhIssue);
    }
  }
  return issues;
}

function hasQueuedLabel(issue: GhIssue): boolean {
  return issue.labels?.some((label) => label.name === "agent:queued") ?? false;
}

function hasRunningLabel(issue: GhIssue): boolean {
  return issue.labels?.some((label) => label.name === "agent:running") ?? false;
}

function issueToRow(issue: GhIssue): IssueRow {
  return {
    number: issue.number,
    title: issue.title ?? "",
    body: issue.body ?? "",
  };
}

export async function listQueuedIssues(
  repository: string,
  assignee: string,
  deps: { run: GhRunner; writeStderr: (line: string) => void },
): Promise<{ ok: true; issues: IssueRow[] } | { ok: false }> {
  const result = await deps.run([
    "api",
    "--paginate",
    "--method",
    "GET",
    `repos/${repository}/issues`,
    "-f",
    "state=open",
    "-f",
    "labels=agent:queued",
    "-f",
    `assignee=${assignee}`,
  ]);

  if (!result.ok) {
    deps.writeStderr(LIST_FAILURE_MESSAGE);
    return { ok: false };
  }

  const raw = parseGhJsonArray(result.stdout);
  const issues = raw
    .filter((issue) => issue.pull_request === undefined)
    .filter((issue) => issue.assignee?.login === assignee)
    .filter((issue) => hasQueuedLabel(issue))
    .map(issueToRow)
    .sort((a, b) => a.number - b.number);

  return { ok: true, issues };
}

async function issueHasRunIdComment(
  repository: string,
  issueNumber: number,
  run: GhRunner,
): Promise<boolean> {
  const comments = await listIssueComments(repository, issueNumber, run);
  if (comments === undefined) {
    return false;
  }
  return countRunIdComments(comments) > 0;
}

export async function listRunningIssues(
  repository: string,
  assignee: string,
  deps: { run: GhRunner; writeStderr: (line: string) => void },
): Promise<{ ok: true; issues: { number: number; hasRunId: boolean }[] } | { ok: false }> {
  const result = await deps.run([
    "api",
    "--paginate",
    "--method",
    "GET",
    `repos/${repository}/issues`,
    "-f",
    "state=open",
    "-f",
    "labels=agent:running",
    "-f",
    `assignee=${assignee}`,
  ]);

  if (!result.ok) {
    deps.writeStderr(LIST_FAILURE_MESSAGE);
    return { ok: false };
  }

  const raw = parseGhJsonArray(result.stdout);
  const running = raw
    .filter((issue) => issue.pull_request === undefined)
    .filter((issue) => issue.assignee?.login === assignee)
    .filter((issue) => hasRunningLabel(issue))
    .sort((a, b) => a.number - b.number);

  const issues: { number: number; hasRunId: boolean }[] = [];
  for (const issue of running) {
    const hasRunId = await issueHasRunIdComment(repository, issue.number, deps.run);
    issues.push({ number: issue.number, hasRunId });
  }

  return { ok: true, issues };
}

async function setStateLabel(
  repository: string,
  issueNumber: number,
  label: string,
  run: GhRunner,
): Promise<boolean> {
  const result = await run([
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repository,
    ...STATE_LABELS.flatMap((stateLabel) => ["--remove-label", stateLabel]),
    "--add-label",
    label,
  ]);
  return result.ok;
}

async function addIssueComment(
  repository: string,
  issueNumber: number,
  body: string,
  run: GhRunner,
): Promise<boolean> {
  const result = await run(
    ["issue", "comment", String(issueNumber), "--repo", repository, "--body-file", "-"],
    { stdin: body },
  );
  return result.ok;
}

export async function beginRunning(
  repository: string,
  issueNumber: number,
  deps: { run: GhRunner; newRunId: () => string },
): Promise<{ ok: true; runId: string } | { ok: false }> {
  const runId = deps.newRunId();
  const commented = await addIssueComment(repository, issueNumber, runId, deps.run);
  if (!commented) {
    return { ok: false };
  }
  const labeled = await setStateLabel(repository, issueNumber, "agent:running", deps.run);
  if (!labeled) {
    return { ok: false };
  }
  return { ok: true, runId };
}

const UNEXPECTED_FAILURE_MESSAGE = "予期せぬ失敗が発生しました";

function failureCommentBody(reason: string): string {
  return reason.length > 0 ? reason : UNEXPECTED_FAILURE_MESSAGE;
}

export type ApplyOutcomeFailureStep = "label" | "comment" | "list";

async function applyFailedWithComment(
  repository: string,
  issueNumber: number,
  reason: string,
  run: GhRunner,
): Promise<{ ok: true } | { ok: false; step: ApplyOutcomeFailureStep }> {
  const labeled = await setStateLabel(repository, issueNumber, "agent:failed", run);
  if (!labeled) {
    return { ok: false, step: "label" };
  }
  const commented = await addIssueComment(repository, issueNumber, failureCommentBody(reason), run);
  return commented ? { ok: true } : { ok: false, step: "comment" };
}

export type ApplyOutcome =
  | { type: "done" }
  | { type: "failed"; reason: string }
  | { type: "retryable"; reason: string };

export async function applyOutcome(
  repository: string,
  issueNumber: number,
  outcome: ApplyOutcome,
  deps: { run: GhRunner },
): Promise<{ ok: true } | { ok: false; step: ApplyOutcomeFailureStep }> {
  if (outcome.type === "done") {
    const labeled = await setStateLabel(repository, issueNumber, "agent:done", deps.run);
    return labeled ? { ok: true } : { ok: false, step: "label" };
  }

  if (outcome.type === "failed") {
    return applyFailedWithComment(repository, issueNumber, outcome.reason, deps.run);
  }

  return applyRetryableOutcome(repository, issueNumber, outcome.reason, deps.run);
}

async function applyRetryableOutcome(
  repository: string,
  issueNumber: number,
  reason: string,
  run: GhRunner,
): Promise<{ ok: true } | { ok: false; step: ApplyOutcomeFailureStep }> {
  const comments = await listIssueComments(repository, issueNumber, run);
  if (comments === undefined) {
    return { ok: false, step: "list" };
  }
  const requeueCount = Math.max(0, countRunIdComments(comments) - 1);
  if (requeueCount < 3) {
    const labeled = await setStateLabel(repository, issueNumber, "agent:queued", run);
    return labeled ? { ok: true } : { ok: false, step: "label" };
  }
  return applyFailedWithComment(repository, issueNumber, reason, run);
}

type GhComment = {
  body: string;
};

async function listIssueComments(
  repository: string,
  issueNumber: number,
  run: GhRunner,
): Promise<GhComment[] | undefined> {
  const result = await run([
    "api",
    "--paginate",
    `repos/${repository}/issues/${issueNumber}/comments`,
  ]);
  if (!result.ok) {
    return undefined;
  }
  return parseGhJsonArray(result.stdout) as GhComment[];
}

function countRunIdComments(comments: GhComment[]): number {
  return comments.filter((comment) => LOWER_UUID_BODY.test(comment.body)).length;
}
