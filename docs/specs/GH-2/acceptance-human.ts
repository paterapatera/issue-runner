import { readFileSync } from "node:fs";
import { beginRunning, defaultGhRunner } from "../../../src/github/index.ts";

const RUN_ID = "2f1c0c3e-7b4a-4d1e-9a6b-0c5d8e7f1a2b";
const STATE_LABELS = ["agent:queued", "agent:running", "agent:done", "agent:failed"];

function loadRepositoryFromConfig(): string {
  let raw: string;
  try {
    raw = readFileSync("issue-runner.json", "utf8");
  } catch {
    throw new Error("issue-runner.json がありません。リポジトリのルートに置き、repository を書いてください");
  }
  let config: { repository?: string };
  try {
    config = JSON.parse(raw) as { repository?: string };
  } catch {
    throw new Error("issue-runner.json を読めません");
  }
  const repository = config.repository?.trim() ?? "";
  if (repository.length === 0 || !repository.includes("/")) {
    throw new Error("issue-runner.json の repository が空、または owner/repo 形式ではありません");
  }
  return repository;
}

async function ghJson(argv: string[]): Promise<unknown> {
  const result = await defaultGhRunner(argv);
  if (!result.ok) {
    throw new Error(`gh ${argv.join(" ")} が失敗しました`);
  }
  return JSON.parse(result.stdout) as unknown;
}

async function ensureLabels(repository: string): Promise<void> {
  for (const label of STATE_LABELS) {
    const result = await defaultGhRunner([
      "label",
      "create",
      label,
      "--repo",
      repository,
      "--force",
      "--color",
      "ededed",
    ]);
    if (!result.ok) {
      throw new Error(`ラベル ${label} の作成に失敗しました`);
    }
  }
}

async function main(): Promise<void> {
  const repository = loadRepositoryFromConfig();
  await ensureLabels(repository);

  const create = await ghJson([
    "api",
    "-X",
    "POST",
    `repos/${repository}/issues`,
    "-f",
    "title=sdd-acceptance GH-2",
    "-f",
    "body=受け入れテスト用（自動で閉じます）",
    "-f",
    "labels[]=agent:queued",
  ]);
  const issueNumber = (create as { number: number }).number;

  const started = await beginRunning(repository, issueNumber, {
    run: defaultGhRunner,
    newRunId: () => RUN_ID,
  });
  if (!started.ok) {
    throw new Error("beginRunning が失敗しました");
  }

  const view = (await ghJson([
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repository,
    "--json",
    "labels,comments",
  ])) as {
    labels: { name: string }[];
    comments: { body: string }[];
  };

  const labelNames = view.labels.map((label) => label.name);
  if (!labelNames.includes("agent:running")) {
    throw new Error(`agent:running がありません: ${labelNames.join(", ")}`);
  }
  for (const forbidden of ["agent:queued", "agent:done", "agent:failed"]) {
    if (labelNames.includes(forbidden)) {
      throw new Error(`不要なラベル ${forbidden} が付いています`);
    }
  }

  const runComment = view.comments.find((comment) => comment.body === RUN_ID);
  if (runComment === undefined) {
    throw new Error(`実行 ID コメント ${RUN_ID} がありません`);
  }

  const closed = await defaultGhRunner([
    "issue",
    "close",
    String(issueNumber),
    "--repo",
    repository,
    "--comment",
    "sdd-acceptance GH-2 で自動作成した issue を閉じます",
  ]);
  if (!closed.ok) {
    throw new Error("テスト issue のクローズに失敗しました");
  }

  console.log(`AC-003 / AC-005: issue ${issueNumber} でラベルとコメントを確認しました`);
}

await main();
