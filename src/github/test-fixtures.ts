import type { GhRunner } from "./index";

export type GhIssue = {
  number: number;
  title: string;
  body: string | null;
  pull_request?: unknown;
  assignee?: { login: string } | null;
  labels?: { name: string }[];
};

export type GhCall = { argv: string[]; stdin?: string };

export function recordingGhRunner(handler?: (call: GhCall) => { ok: boolean }): {
  run: GhRunner;
  calls: GhCall[];
} {
  const calls: GhCall[] = [];
  const run: GhRunner = async (argv, options) => {
    calls.push({ argv, stdin: options?.stdin });
    if (handler) {
      const result = handler({ argv, stdin: options?.stdin });
      return result.ok ? { ok: true, stdout: "" } : { ok: false };
    }
    return { ok: true, stdout: "" };
  };
  return { run, calls };
}

export function labelsFromEdit(argv: string[]): { removed: string[]; added: string[] } {
  const removed: string[] = [];
  const added: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--remove-label" && argv[index + 1] !== undefined) {
      removed.push(argv[index + 1]);
    }
    if (argv[index] === "--add-label" && argv[index + 1] !== undefined) {
      added.push(argv[index + 1]);
    }
  }
  return { removed, added };
}

export function commentBodies(calls: GhCall[]): string[] {
  return calls
    .filter((call) => call.argv[0] === "issue" && call.argv[1] === "comment")
    .map((call) => call.stdin ?? "");
}

export function addedStateLabel(calls: GhCall[]): string | undefined {
  const edit = calls.find((call) => call.argv[0] === "issue" && call.argv[1] === "edit");
  return labelsFromEdit(edit?.argv ?? []).added[0];
}
