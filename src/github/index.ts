import { spawn } from "node:child_process";

export type IssueRow = { number: number; title: string; body: string };

export type GhRunResult = { ok: true; stdout: string } | { ok: false };

export type GhRunner = (argv: string[], options?: { stdin?: string }) => Promise<GhRunResult>;

const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"] as const;

const LIST_FAILURE_MESSAGE = "issue の列挙に失敗しました\n";

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
