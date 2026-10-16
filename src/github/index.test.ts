import { describe, expect, test } from "bun:test";
import { type GhRunner, listQueuedIssues } from "./index";
import type { GhIssue } from "./test-fixtures";

function issue(partial: GhIssue): GhIssue {
  return {
    title: "",
    body: "",
    labels: [{ name: "agent:queued" }],
    assignee: { login: "octocat" },
    ...partial,
  };
}

function listRunner(issues: GhIssue[], fail = false): GhRunner {
  return async (argv) => {
    expect(argv[0]).toBe("api");
    expect(argv).toContain(`repos/example/app/issues`);
    if (fail) {
      return { ok: false };
    }
    return { ok: true, stdout: JSON.stringify(issues) };
  };
}

async function listOctocatQueued(
  issues: GhIssue[],
  fail = false,
): Promise<
  { ok: true; issues: { number: number; title: string; body: string }[] } | { ok: false }
> {
  return listQueuedIssues("example/app", "octocat", {
    run: listRunner(issues, fail),
    writeStderr: () => {},
  });
}

test("AC-001 filters repository, assignee, label, and open issues", async () => {
  const ghResponse = [
    issue({
      number: 10,
      title: "日付を表示する",
      body: "今日の日付を出す",
    }),
  ];
  const stderr: string[] = [];
  const result = await listQueuedIssues("example/app", "octocat", {
    run: listRunner(ghResponse),
    writeStderr: (line) => stderr.push(line),
  });
  expect(result).toEqual({
    ok: true,
    issues: [{ number: 10, title: "日付を表示する", body: "今日の日付を出す" }],
  });
  expect(stderr).toEqual([]);
});

test("AC-002 returns empty list without message", async () => {
  const stderr: string[] = [];
  const result = await listQueuedIssues("example/app", "octocat", {
    run: listRunner([]),
    writeStderr: (line) => stderr.push(line),
  });
  expect(result).toEqual({ ok: true, issues: [] });
  expect(stderr).toEqual([]);
});

test("AC-022 reports list failure on stderr", async () => {
  const stderr: string[] = [];
  const result = await listQueuedIssues("example/app", "octocat", {
    run: listRunner([issue({ number: 10 })], true),
    writeStderr: (line) => stderr.push(line),
  });
  expect(result).toEqual({ ok: false });
  expect(stderr).toEqual(["issue の列挙に失敗しました\n"]);
});

describe("listQueuedIssues ordering", () => {
  test("AC-023 sorts by issue number ascending", async () => {
    const result = await listOctocatQueued([issue({ number: 12 }), issue({ number: 10 })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.map((row) => row.number)).toEqual([10, 12]);
    }
  });

  test("AC-024 returns all matching issues", async () => {
    const result = await listOctocatQueued([
      issue({ number: 10 }),
      issue({ number: 11 }),
      issue({ number: 12 }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.map((row) => row.number)).toEqual([10, 11, 12]);
    }
  });
});

describe("listQueuedIssues fields", () => {
  test("AC-025 preserves empty title", async () => {
    const result = await listOctocatQueued([issue({ number: 15, title: "" })]);
    expect(result).toEqual({ ok: true, issues: [{ number: 15, title: "", body: "" }] });
  });

  test("AC-026 preserves long title", async () => {
    const longTitle = "あ".repeat(300);
    const result = await listOctocatQueued([issue({ number: 17, title: longTitle })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues[0]?.title).toBe(longTitle);
      expect(result.issues[0]?.title.length).toBe(300);
    }
  });

  test("AC-027 preserves multiline title", async () => {
    const title = "1行目\n2行目";
    const result = await listOctocatQueued([issue({ number: 18, title })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues[0]?.title).toBe(title);
    }
  });

  test("AC-028 preserves empty body", async () => {
    const result = await listOctocatQueued([issue({ number: 19, body: "" })]);
    expect(result).toEqual({ ok: true, issues: [{ number: 19, title: "", body: "" }] });
  });

  test("AC-029 preserves long body", async () => {
    const longBody = "あ".repeat(300);
    const result = await listOctocatQueued([issue({ number: 23, body: longBody })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues[0]?.body).toBe(longBody);
      expect(result.issues[0]?.body.length).toBe(300);
    }
  });

  test("AC-030 preserves multiline body", async () => {
    const body = "1行目\n2行目";
    const result = await listOctocatQueued([issue({ number: 24, body })]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues[0]?.body).toBe(body);
    }
  });

  test("excludes pull requests", async () => {
    const result = await listOctocatQueued([issue({ number: 25, pull_request: {} })]);
    expect(result).toEqual({ ok: true, issues: [] });
  });

  test("drops issues missing queued label or assignee", async () => {
    const result = await listOctocatQueued([
      issue({ number: 11, labels: [] }),
      issue({ number: 13, labels: [{ name: "agent:running" }] }),
      issue({ number: 14, assignee: { login: "hubot" } }),
      issue({ number: 16, assignee: null }),
    ]);
    expect(result).toEqual({ ok: true, issues: [] });
  });
});
