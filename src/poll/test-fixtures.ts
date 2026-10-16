import { expect } from "bun:test";
import {
  type AgentScript,
  implThenFinishScript,
  type RecordedAgent,
  recordingCreateAgent,
} from "../agent/test-fixtures";
import { commentBodies, type GhCall, type GhIssue, labelsFromEdit } from "../github/test-fixtures";
import type { StartPollingDeps, StartPollingInput } from "./index";

const POLL_REPO = "example/app";
const POLL_ASSIGNEE = "octocat";
export const POLL_CWD = "/repo";
export const POLL_RUN_ID = "11111111-2222-3333-4444-555555555555";
export const POLL_RESTART_RUN_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const POLL_INTERVAL_MS = 2 * 60 * 1000;

type IssueComments = Record<number, { body: string }[]>;

export type GhState = {
  queued: GhIssue[];
  running: GhIssue[];
  comments: IssueComments;
};

export function queuedIssue(partial: GhIssue): GhIssue {
  const { number, title, body, ...rest } = partial;
  return {
    number,
    labels: [{ name: "agent:queued" }],
    assignee: { login: POLL_ASSIGNEE },
    title: title ?? `title-${number}`,
    body: body ?? "",
    ...rest,
  };
}

export function runningIssue(partial: GhIssue): GhIssue {
  const { title, body, ...rest } = partial;
  return {
    labels: [{ name: "agent:running" }],
    assignee: { login: POLL_ASSIGNEE },
    title: title ?? "",
    body: body ?? "",
    ...rest,
  };
}

function issueListLabel(argv: string[]): "queued" | "running" | undefined {
  if (argv.includes("labels=agent:queued")) {
    return "queued";
  }
  if (argv.includes("labels=agent:running")) {
    return "running";
  }
  return undefined;
}

function issueCommentsPath(argv: string[]): string | undefined {
  return argv.find((arg) => /\/issues\/\d+\/comments$/.test(arg));
}

function issueListPath(argv: string[]): string | undefined {
  return argv.find((arg) => /^repos\/[^/]+\/[^/]+\/issues$/.test(arg));
}

function commentsJson(argv: string[], comments: IssueComments): string | undefined {
  const path = issueCommentsPath(argv);
  if (path === undefined) {
    return undefined;
  }
  const match = path.match(/\/issues\/(\d+)\/comments$/);
  const issueNumber = match ? Number(match[1]) : NaN;
  return JSON.stringify(comments[issueNumber] ?? []);
}

function apiListResponse(
  argv: string[],
  state: GhState,
  failList: boolean,
): { ok: true; stdout: string } | { ok: false } | undefined {
  const path = issueListPath(argv);
  if (path === undefined) {
    return undefined;
  }
  if (failList) {
    return { ok: false };
  }
  const kind = issueListLabel(argv);
  if (kind === "queued") {
    return { ok: true, stdout: JSON.stringify(state.queued) };
  }
  if (kind === "running") {
    return { ok: true, stdout: JSON.stringify(state.running) };
  }
  return { ok: false };
}

function createGhRunner(state: GhState, failList = false) {
  const calls: GhCall[] = [];
  const run = async (argv: string[], options?: { stdin?: string }) => {
    calls.push({ argv, stdin: options?.stdin });
    if (argv[0] === "api") {
      const comments = commentsJson(argv, state.comments);
      if (comments !== undefined) {
        return { ok: true as const, stdout: comments };
      }
      const listed = apiListResponse(argv, state, failList);
      return listed ?? { ok: false as const };
    }
    return { ok: true as const, stdout: "" };
  };
  return { run, calls };
}

function configText(): string {
  return 'export default defineConfig({ issueIdPrefix: "GH" });';
}

export function successGit() {
  const calls: string[][] = [];
  const git = async (argv: string[]) => {
    calls.push(argv);
    if (argv[0] === "ls-remote") {
      return { ok: true as const, stdout: "deadbeef\trefs/heads/gh-7-work\n" };
    }
    if (argv[0] === "checkout") {
      return { ok: true as const, stdout: "" };
    }
    return { ok: false as const, stderr: "unknown" };
  };
  return { git, calls };
}

export function noBranchGit() {
  return async (argv: string[]) => {
    if (argv[0] === "ls-remote") {
      return { ok: true as const, stdout: "deadbeef\trefs/heads/main\n" };
    }
    return { ok: false as const, stderr: "x" };
  };
}

export type PollHarness = {
  input: StartPollingInput;
  deps: StartPollingDeps;
  agents: RecordedAgent[];
  stderr: string[];
  exitCodes: number[];
  schedules: Array<{ delayMs: number; run: () => void }>;
  ghCalls: GhCall[];
  ghState: GhState;
  setRunningAtTick: (issues: GhIssue[], comments?: IssueComments) => void;
};

export function createPollHarness(options: {
  ghState: GhState;
  script?: AgentScript;
  git?: ReturnType<typeof successGit>["git"];
  failList?: boolean;
}): PollHarness {
  const agents: RecordedAgent[] = [];
  const stderr: string[] = [];
  const exitCodes: number[] = [];
  const schedules: Array<{ delayMs: number; run: () => void }> = [];
  const { run, calls } = createGhRunner(options.ghState, options.failList);
  const script = options.script ?? implThenFinishScript();

  const deps: StartPollingDeps = {
    gh: run,
    git: options.git ?? successGit().git,
    readText: async () => ({ ok: true, text: configText() }),
    createAgent: recordingCreateAgent(script, agents),
    newRunId: () => POLL_RUN_ID,
    writeStderr: (line) => stderr.push(line),
    exit: (code) => exitCodes.push(code),
    setStatus: () => {},
    schedule: (delayMs, tick) => {
      schedules.push({ delayMs, run: tick });
    },
  };

  return {
    input: {
      repository: POLL_REPO,
      assignee: POLL_ASSIGNEE,
      cwd: POLL_CWD,
      intervalMinutes: 2,
    },
    deps,
    agents,
    stderr,
    exitCodes,
    schedules,
    ghCalls: calls,
    ghState: options.ghState,
    setRunningAtTick: (issues, comments) => {
      options.ghState.running = issues;
      if (comments !== undefined) {
        options.ghState.comments = comments;
      }
    },
  };
}

export async function runScheduledTick(harness: PollHarness, index = 0): Promise<void> {
  const entry = harness.schedules[index];
  expect(entry).toBeDefined();
  expect(entry?.delayMs).toBe(POLL_INTERVAL_MS);
  entry?.run();
  await Bun.sleep(0);
}

export function sddPrompts(agents: RecordedAgent[]): string[] {
  return agents
    .flatMap((agent) => agent.runs.map((run) => run.send))
    .filter((prompt) => prompt === "/sdd-impl" || prompt === "/sdd-finish");
}

export function lastAddedLabel(calls: GhCall[], issueNumber: number): string | undefined {
  const edits = calls.filter(
    (call) =>
      call.argv[0] === "issue" && call.argv[1] === "edit" && call.argv[2] === String(issueNumber),
  );
  const last = edits.at(-1);
  return last === undefined ? undefined : labelsFromEdit(last.argv).added[0];
}

export function dualPriorityQueuedState(): GhState {
  return {
    queued: [
      queuedIssue({ number: 7, title: "issue-7", body: "優先度は低い" }),
      queuedIssue({ number: 9, title: "issue-9", body: "優先度は高い" }),
    ],
    running: [],
    comments: {},
  };
}

export function judgmentScript(json: string): AgentScript {
  const cycle = implThenFinishScript();
  return {
    onSend: (prompt, agentIndex, runIndex) => {
      if (agentIndex === 0 && prompt.includes("JSON")) {
        return { status: "finished", result: json };
      }
      return cycle.onSend(prompt, agentIndex, runIndex);
    },
  };
}

export function toolFailedOnImplScript(): AgentScript {
  return {
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "error", error: { message: "tool failed" } };
      }
      return { status: "finished", result: "x" };
    },
  };
}

export function failGhWhenMarkingFailed(harness: PollHarness): void {
  const originalGh = harness.deps.gh;
  harness.deps.gh = async (argv, options) => {
    if (argv[0] === "issue" && argv[1] === "edit") {
      const labels = labelsFromEdit(argv);
      if (labels.added[0] === "agent:failed") {
        return { ok: false };
      }
    }
    return originalGh(argv, options);
  };
}

export { commentBodies, labelsFromEdit };
