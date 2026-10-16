import { describe, expect, test } from "bun:test";
import { applyOutcome } from "./index";
import {
  addedStateLabel,
  commentBodies,
  commentsAwareGhRunner,
  labelsFromEdit,
} from "./test-fixtures";

const RUN_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function uuidComments(count: number): { body: string }[] {
  const bodies = [RUN_ID];
  for (let index = 1; index < count; index += 1) {
    bodies.push(`bbbbbbbb-bbbb-cccc-dddd-${String(index).padStart(12, "0")}`);
  }
  return bodies.map((body) => ({ body }));
}

describe("applyOutcome retryable", () => {
  test("AC-013 requeues when retry count is 0", async () => {
    const { run, calls } = commentsAwareGhRunner(uuidComments(1));
    const result = await applyOutcome(
      "example/app",
      50,
      { type: "retryable", reason: "temporary" },
      { run },
    );
    expect(result).toEqual({ ok: true });
    expect(addedStateLabel(calls)).toBe("agent:queued");
    const labels = labelsFromEdit(calls.find((call) => call.argv[1] === "edit")?.argv ?? []);
    expect(labels.added).not.toContain("agent:running");
    expect(labels.added).not.toContain("agent:failed");
  });

  test("AC-020 does not add comment on requeue", async () => {
    const { run, calls } = commentsAwareGhRunner(uuidComments(1));
    await applyOutcome("example/app", 50, { type: "retryable", reason: "temporary" }, { run });
    expect(commentBodies(calls)).toEqual([]);
  });

  test("AC-031 requeues when retry count is 2", async () => {
    const { run, calls } = commentsAwareGhRunner(uuidComments(3));
    await applyOutcome("example/app", 52, { type: "retryable", reason: "temporary" }, { run });
    expect(addedStateLabel(calls)).toBe("agent:queued");
  });

  test("AC-032 fails when retry count is 3", async () => {
    const { run, calls } = commentsAwareGhRunner(uuidComments(4));
    await applyOutcome("example/app", 53, { type: "retryable", reason: "ignored" }, { run });
    expect(addedStateLabel(calls)).toBe("agent:failed");
    expect(labelsFromEdit(calls.find((c) => c.argv[1] === "edit")?.argv ?? []).added).toEqual([
      "agent:failed",
    ]);
  });

  test("comment list failure returns step list", async () => {
    const { run } = commentsAwareGhRunner(uuidComments(1));
    const failingRun = async (argv: string[], options?: { stdin?: string }) => {
      if (argv[0] === "api" && argv[2]?.includes("/comments")) {
        return { ok: false };
      }
      return run(argv, options);
    };
    const result = await applyOutcome(
      "example/app",
      54,
      { type: "retryable", reason: "temporary" },
      { run: failingRun },
    );
    expect(result).toEqual({ ok: false, step: "list" });
  });

  test("AC-033 adds failure comment at retry limit", async () => {
    const { run, calls } = commentsAwareGhRunner(uuidComments(4));
    await applyOutcome(
      "example/app",
      53,
      { type: "retryable", reason: "再試行の上限に達しました" },
      { run },
    );
    expect(commentBodies(calls)).toEqual(["再試行の上限に達しました"]);
  });
});
