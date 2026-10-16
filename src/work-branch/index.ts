import { join } from "node:path";
import { applyOutcome, type GhRunner } from "../github/index";

const CONFIG_RELATIVE = "docs/sdd/config.ts";
const MISSING_CONFIG_MESSAGE = "docs/sdd/config.ts がありません";
const PREPARE_FAILED_MESSAGE = "作業ブランチを用意できませんでした";
const NO_BRANCH_MESSAGE = "該当する作業ブランチがありません";
const MULTIPLE_BRANCHES_MESSAGE = "該当する作業ブランチが複数あります";
const LABEL_STDERR = "ラベルを更新できませんでした";
const COMMENT_STDERR = "コメントを付けられませんでした";

export type GitRunner = (
  argv: string[],
) => Promise<{ ok: true; stdout: string } | { ok: false; stderr: string }>;

export type ReadTextResult = { ok: true; text: string } | { ok: false; missing: boolean };

export type PrepareWorkBranchInput = {
  repository: string;
  issueNumber: number;
  title: string;
  body: string;
};

export type PrepareWorkBranchDeps = {
  gh: GhRunner;
  git: GitRunner;
  readText: (path: string) => Promise<ReadTextResult>;
  cwd: string;
  writeStderr: (line: string) => void;
  exit: (code: number) => void;
};

const ISSUE_ID_PREFIX_PATTERN = /issueIdPrefix:\s*("([^"]*)"|'([^']*)')/;

function parseIssueIdPrefixLiteral(configText: string): string | undefined {
  const match = ISSUE_ID_PREFIX_PATTERN.exec(configText);
  if (!match) {
    return undefined;
  }
  const value = match[2] ?? match[3] ?? "";
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

function specNameFromConfig(configText: string, issueNumber: number): string {
  const prefix = parseIssueIdPrefixLiteral(configText);
  if (prefix === undefined) {
    return String(issueNumber);
  }
  return `${prefix}-${issueNumber}`;
}

function originBranchNames(lsRemoteOutput: string): string[] {
  const names: string[] = [];
  for (const line of lsRemoteOutput.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const tabIndex = trimmed.indexOf("\t");
    const ref = tabIndex >= 0 ? trimmed.slice(tabIndex + 1) : trimmed;
    if (ref.startsWith("refs/heads/")) {
      names.push(ref.slice("refs/heads/".length));
    }
  }
  return names;
}

function matchingWorkBranches(specName: string, remoteBranches: string[]): string[] {
  const prefix = `${specName.toLowerCase()}-`;
  return remoteBranches.filter((name) => name.startsWith(prefix));
}

async function finishWithFailure(
  input: PrepareWorkBranchInput,
  deps: PrepareWorkBranchDeps,
  reason: string,
): Promise<{ ok: false; exitCode: 1 }> {
  const outcome = await applyOutcome(
    input.repository,
    input.issueNumber,
    { type: "failed", reason },
    { run: deps.gh },
  );
  if (!outcome.ok) {
    deps.writeStderr(outcome.step === "label" ? LABEL_STDERR : COMMENT_STDERR);
    deps.exit(1);
    return { ok: false, exitCode: 1 };
  }
  deps.writeStderr(reason);
  deps.exit(1);
  return { ok: false, exitCode: 1 };
}

export async function prepareWorkBranch(
  input: PrepareWorkBranchInput,
  deps: PrepareWorkBranchDeps,
): Promise<{ ok: true; specName: string; branch: string } | { ok: false; exitCode: 1 }> {
  const configPath = join(deps.cwd, CONFIG_RELATIVE);
  const configRead = await deps.readText(configPath);
  if (!configRead.ok) {
    if (configRead.missing) {
      return finishWithFailure(input, deps, MISSING_CONFIG_MESSAGE);
    }
    return finishWithFailure(input, deps, PREPARE_FAILED_MESSAGE);
  }

  const specName = specNameFromConfig(configRead.text, input.issueNumber);

  const remoteResult = await deps.git(["ls-remote", "--heads", "origin"]);
  if (!remoteResult.ok) {
    return finishWithFailure(input, deps, PREPARE_FAILED_MESSAGE);
  }

  const matches = matchingWorkBranches(specName, originBranchNames(remoteResult.stdout));
  if (matches.length === 0) {
    return finishWithFailure(input, deps, NO_BRANCH_MESSAGE);
  }
  if (matches.length > 1) {
    return finishWithFailure(input, deps, MULTIPLE_BRANCHES_MESSAGE);
  }

  const branch = matches[0];
  const checkout = await deps.git(["checkout", branch]);
  if (!checkout.ok) {
    return finishWithFailure(input, deps, PREPARE_FAILED_MESSAGE);
  }

  return { ok: true, specName, branch };
}
