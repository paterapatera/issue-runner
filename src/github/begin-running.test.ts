import { describe, expect, test } from "bun:test";
import { beginRunning } from "./index";
import { labelsFromEdit, recordingGhRunner } from "./test-fixtures";

const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"];

function commentCall(calls: { argv: string[]; stdin?: string }[]) {
  return calls.find((call) => call.argv[0] === "issue" && call.argv[1] === "comment");
}

function editCall(calls: { argv: string[]; stdin?: string }[]) {
  return calls.find((call) => call.argv[0] === "issue" && call.argv[1] === "edit");
}

describe("beginRunning", () => {
  test("AC-003 AC-005 posts run id comment and sets running label only", async () => {
    const runId = "2f1c0c3e-7b4a-4d1e-9a6b-0c5d8e7f1a2b";
    const { run, calls } = recordingGhRunner();
    const result = await beginRunning("example/app", 20, {
      run,
      newRunId: () => runId,
    });
    expect(result).toEqual({ ok: true, runId });
    const comment = commentCall(calls);
    expect(comment?.stdin).toBe(runId);
    const edit = editCall(calls);
    expect(edit?.argv).toContain("20");
    expect(edit?.argv).toContain("example/app");
    const labels = labelsFromEdit(edit?.argv ?? []);
    expect(labels.removed).toEqual(STATE_LABELS);
    expect(labels.added).toEqual(["agent:running"]);
  });

  test("AC-004 leaves only agent:running", async () => {
    const { run, calls } = recordingGhRunner();
    const result = await beginRunning("example/app", 21, {
      run,
      newRunId: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    expect(result.ok).toBe(true);
    const labels = labelsFromEdit(editCall(calls)?.argv ?? []);
    expect(labels.added).toEqual(["agent:running"]);
    expect(labels.removed).toEqual(STATE_LABELS);
  });

  test("AC-006 preserves full uuid in comment body", async () => {
    const runId = "00000000-0000-4000-8000-000000000000";
    const { run, calls } = recordingGhRunner();
    await beginRunning("example/app", 22, {
      run,
      newRunId: () => runId,
    });
    expect(commentCall(calls)?.stdin).toBe(runId);
    expect(commentCall(calls)?.stdin?.length).toBe(36);
  });

  test("returns ok false when gh step fails", async () => {
    for (const failingStep of ["comment", "edit"] as const) {
      const { run } = recordingGhRunner((call) => {
        if (call.argv[1] === failingStep) {
          return { ok: false };
        }
        return { ok: true };
      });
      const result = await beginRunning("example/app", 20, {
        run,
        newRunId: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      });
      expect(result).toEqual({ ok: false });
    }
  });
});
