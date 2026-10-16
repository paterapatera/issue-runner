import { expect, test } from "bun:test";
import { pollOnce } from "./index";
import {
  ASSIGNEE,
  buildDeps,
  CHECKOUT,
  doneJudgment,
  implStoppedQuestionScript,
  REPO,
} from "./test-fixtures";

test("AC-017 AC-018 AC-019 AC-020 answers via composer-2.5 and sends pair to same agent", async () => {
  const { deps, agents, stderr, exitCodes } = buildDeps(
    implStoppedQuestionScript(
      [{ question: "未コミット変更をどうしますか", answer: "そのまま残す" }],
      "stopped for question",
    ),
  );

  const result = await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(result).toEqual({ ok: true });
  expect(exitCodes).toEqual([]);
  expect(stderr).toEqual([]);
  expect(agents[1]?.options.modelId).toBe("composer-2.5");
  expect(agents[1]?.options.fast).toBe(false);
  expect(agents[0]?.runs.map((run) => run.send)).toEqual(["/sdd-impl", "そのまま残す"]);
});

test("AC-037 sends two pairs in order", async () => {
  const { deps, agents } = buildDeps(
    implStoppedQuestionScript([
      { question: "未コミット変更をどうしますか", answer: "そのまま残す" },
      { question: "ブランチ名はこれでよいか", answer: "この名前でよい" },
    ]),
  );

  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(agents[0]?.runs.map((run) => run.send)).toEqual([
    "/sdd-impl",
    "そのまま残す",
    "この名前でよい",
  ]);
});

test("AC-039 AC-040 invalid judgment JSON exits 1", async () => {
  for (const body of ["not-json", '{"kind":"question","pairs":[]}']) {
    const { deps, stderr, exitCodes } = buildDeps({
      onSend: (prompt, agentIndex) => {
        if (agentIndex === 0 && prompt === "/sdd-impl") {
          return { status: "finished", result: "x" };
        }
        return { status: "finished", result: body };
      },
    });
    const result = await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
    expect(result).toEqual({ ok: false, exitCode: 1 });
    expect(stderr).toEqual(["判断の JSON を読めませんでした"]);
    expect(exitCodes).toEqual([1]);
  }
});

test("AC-035 judgment generation failure does not send answers", async () => {
  const { deps, agents, stderr, exitCodes } = buildDeps({
    onSend: (prompt, agentIndex) => {
      if (agentIndex === 0 && prompt === "/sdd-impl") {
        return { status: "finished", result: "stopped" };
      }
      if (agentIndex === 1) {
        return { status: "error", error: { message: "model unavailable" } };
      }
      return doneJudgment();
    },
  });

  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(stderr).toEqual(["model unavailable"]);
  expect(exitCodes).toEqual([1]);
  expect(agents[0]?.runs.map((run) => run.send)).toEqual(["/sdd-impl"]);
});

test("AC-041 AC-042 recommended answers are chosen", async () => {
  const { deps, agents } = buildDeps(
    implStoppedQuestionScript([
      { question: "捨てる、そのまま残す（推奨）", answer: "wrong" },
      { question: "別名にする（推奨）、この名前でよい", answer: "wrong2" },
    ]),
  );
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, deps);
  expect(agents[0]?.runs.map((run) => run.send)).toContain("そのまま残す");
  expect(agents[0]?.runs.map((run) => run.send)).toContain("別名にする");

  const single = buildDeps(
    implStoppedQuestionScript([{ question: "残す、捨てる（推奨）、聞く", answer: "残す" }]),
  );
  await pollOnce({ repository: REPO, assignee: ASSIGNEE, cwd: CHECKOUT }, single.deps);
  expect(single.agents[0]?.runs.map((run) => run.send)).toContain("捨てる");
});
