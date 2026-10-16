import { describe, expect, test } from "bun:test";
import { applyOutcome } from "./index";
import { addedStateLabel, commentBodies, labelsFromEdit, recordingGhRunner } from "./test-fixtures";

const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"];

describe("applyOutcome done", () => {
  test("AC-007 sets agent:done only", async () => {
    const { run, calls } = recordingGhRunner();
    const result = await applyOutcome("example/app", 30, { type: "done" }, { run });
    expect(result).toEqual({ ok: true });
    expect(addedStateLabel(calls)).toBe("agent:done");
    const edit = calls.find((call) => call.argv[1] === "edit");
    expect(labelsFromEdit(edit?.argv ?? []).removed).toEqual(STATE_LABELS);
    expect(commentBodies(calls)).toEqual([]);
  });

  test("AC-008 does not add comments", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 30, { type: "done" }, { run });
    expect(commentBodies(calls).length).toBe(0);
  });
});

describe("applyOutcome failed", () => {
  test("AC-009 AC-011 sets agent:failed without queued", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome(
      "example/app",
      40,
      { type: "failed", reason: "エージェントが異常終了した" },
      { run },
    );
    expect(addedStateLabel(calls)).toBe("agent:failed");
    const labels = labelsFromEdit(calls.find((call) => call.argv[1] === "edit")?.argv ?? []);
    expect(labels.added).not.toContain("agent:queued");
  });

  test("AC-010 sets agent:failed for skill stop", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome(
      "example/app",
      41,
      { type: "failed", reason: "人の判断が必要です" },
      { run },
    );
    expect(addedStateLabel(calls)).toBe("agent:failed");
  });

  test("AC-012 keeps queued off after skill stop", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome(
      "example/app",
      41,
      { type: "failed", reason: "人の判断が必要です" },
      { run },
    );
    expect(labelsFromEdit(calls.find((c) => c.argv[1] === "edit")?.argv ?? []).added).toEqual([
      "agent:failed",
    ]);
  });

  test("AC-014 non-retryable pre-start failure", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 51, { type: "failed", reason: "起動に失敗した" }, { run });
    expect(addedStateLabel(calls)).toBe("agent:failed");
  });
});

describe("applyOutcome failed comments", () => {
  test("AC-015 adds failure comment", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome(
      "example/app",
      40,
      { type: "failed", reason: "エージェントが異常終了した" },
      { run },
    );
    expect(commentBodies(calls)).toEqual(["エージェントが異常終了した"]);
  });

  test("AC-016 adds skill stop comment", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome(
      "example/app",
      41,
      { type: "failed", reason: "人の判断が必要です" },
      { run },
    );
    expect(commentBodies(calls)).toEqual(["人の判断が必要です"]);
  });

  test("AC-017 uses default message for empty reason", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 42, { type: "failed", reason: "" }, { run });
    expect(commentBodies(calls)).toEqual(["予期せぬ失敗が発生しました"]);
  });

  test("AC-018 preserves long failure reason", async () => {
    const reason = "あ".repeat(300);
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 43, { type: "failed", reason }, { run });
    expect(commentBodies(calls)[0]).toBe(reason);
    expect(commentBodies(calls)[0]?.length).toBe(300);
  });

  test("AC-019 preserves multiline failure reason", async () => {
    const reason = "1行目\n2行目";
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 44, { type: "failed", reason }, { run });
    expect(commentBodies(calls)[0]).toBe(reason);
  });

  test("AC-021 adds pre-start failure comment", async () => {
    const { run, calls } = recordingGhRunner();
    await applyOutcome("example/app", 51, { type: "failed", reason: "起動に失敗した" }, { run });
    expect(commentBodies(calls)).toEqual(["起動に失敗した"]);
  });
});

function ghRunnerFailingOn(argvCommand: string, argvSubcommand: string) {
  return recordingGhRunner((call) => {
    if (call.argv[0] === argvCommand && call.argv[1] === argvSubcommand) {
      return { ok: false };
    }
    return { ok: true };
  }).run;
}

describe("applyOutcome failed steps", () => {
  test("label update failure returns step label", async () => {
    const result = await applyOutcome(
      "example/app",
      60,
      { type: "failed", reason: "失敗" },
      { run: ghRunnerFailingOn("issue", "edit") },
    );
    expect(result).toEqual({ ok: false, step: "label" });
  });

  test("comment failure returns step comment", async () => {
    const result = await applyOutcome(
      "example/app",
      61,
      { type: "failed", reason: "失敗" },
      { run: ghRunnerFailingOn("issue", "comment") },
    );
    expect(result).toEqual({ ok: false, step: "comment" });
  });

  test("done label failure returns step label", async () => {
    const result = await applyOutcome(
      "example/app",
      62,
      { type: "done" },
      { run: ghRunnerFailingOn("issue", "edit") },
    );
    expect(result).toEqual({ ok: false, step: "label" });
  });
});
