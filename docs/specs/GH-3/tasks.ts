import { defineTasks } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";
import type design from "./design.ts";

// 実装タスク（docs/specs/GH-3/tasks.ts）。上から順に実施する。
// 書き方: docs/sdd/guides/writing-tasks.md
export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "起動経路の既存テストを固定する",
      kind: "test",
      description:
        "src/main、src/config、src/tui は変更しない。src/main/index.test.ts が CURSOR_API_KEY 無しで終了コード 1 になり TUI を出さないこと、src/tui/index.test.ts がリポジトリ、間隔の分、モデル、担当者、状態 待機中、終了キー q を表示すること、src/config/index.test.ts が issue-runner.json のキー repository、interval、model、assignee を読むことを、既存の bun test のまま確かめる。prepareWorkBranch を run から呼ばない。",
      refs: ["INV-001"],
      verifies: ["INV-001"],
      status: "done",
    },
    "T-002": {
      title: "applyOutcome の失敗に段階を返す",
      kind: "impl",
      description:
        "src/github/index.ts の applyOutcome の失敗を { ok: false, step } にする。done と failed と再キューのラベル更新に失敗したときは step を label、failed でラベルのあとのコメントに失敗したときは comment、retryable でコメント一覧の取得に失敗したときは list にする。成功は { ok: true } のままにする。src/github/apply-outcome.test.ts で、ラベル更新の失敗は step が label、コメントの失敗は comment であることを、差し替えた gh の結果から観測する。apply-outcome-retry.test.ts の成功の toEqual({ ok: true }) は維持し、一覧取得の失敗は step が list であることを足す。listQueuedIssues と beginRunning の戻り値は変えない。",
      refs: ["GithubIssueState", "FR-015", "FR-017"],
      status: "done",
    },
    "T-003": {
      title: "作業ブランチの準備を実装する",
      kind: "impl",
      description:
        "src/work-branch/index.ts に prepareWorkBranch を置く。cwd の docs/sdd/config.ts を readText で読み、issueIdPrefix の文字列リテラルを取り出して前後の空白を除く。リテラルがあるときは spec 名を接頭辞、ハイフン、issue 番号の順にし、定義が無い、空、空白だけ、リテラルでないときは spec 名を issue 番号だけにする。git ls-remote --heads origin の結果のうち、小文字にした spec 名の直後にハイフンが付く名前がちょうど1つのときだけ、起動ディレクトリで git checkout する。0件は「該当する作業ブランチがありません」、複数は「該当する作業ブランチが複数あります」、設定ファイルが無いときは「docs/sdd/config.ts がありません」、git の失敗と設定ファイルが読めないが欠落ではないときは「作業ブランチを用意できませんでした」を applyOutcome の failed に渡す。ラベル更新の失敗は「ラベルを更新できませんでした」、コメントの失敗は「コメントを付けられませんでした」を writeStderr の1行にし、gh と git の stderr は出さない。失敗は exit(1) と { ok: false, exitCode: 1 }。成功はラベルもコメントも変えず exit を呼ばず { ok: true, specName, branch } を返す。エージェント起動の関数は呼ばない。knip.json の entry に src/work-branch/index.ts を足す。src/main、src/config、src/tui は変更しない。",
      refs: [
        "WorkBranch",
        "FR-001",
        "FR-002",
        "FR-003",
        "FR-004",
        "FR-005",
        "FR-006",
        "FR-007",
        "FR-008",
        "FR-009",
        "FR-010",
        "FR-011",
        "FR-012",
        "FR-013",
        "FR-014",
        "FR-016",
        "FR-018",
        "FR-019",
        "FR-020",
        "FR-021",
      ],
      status: "done",
    },
    "T-004": {
      title: "spec 名の決定をテストする",
      kind: "test",
      description:
        "src/work-branch/index.test.ts で prepareWorkBranch を呼ぶ。gh、git、readText、writeStderr、exit は差し替え、品質ゲートや依存関係の導入は呼ばない。issue 番号 3 と issueIdPrefix が GH のとき spec 名が GH-3 であること（AC-001）。作業ブランチ側の設定が違っても切り替える前の GH を使うこと（AC-014）。前後の空白を除いた GH で GH-3 になること（AC-020）。起動ディレクトリの設定だけを読むこと（AC-022）。接頭辞が無い、空、空白だけのときは spec 名が issue 番号のままであること（AC-002、AC-016、AC-018、AC-019）。origin に 111-hogehoge が1つあるときは、その短名を checkout し、エージェント起動の関数は呼ばれないこと（AC-003）。",
      refs: ["FR-001", "FR-002", "FR-003"],
      verifies: ["AC-001", "AC-014", "AC-020", "AC-022", "AC-002", "AC-016", "AC-018", "AC-019", "AC-003"],
      status: "done",
    },
    "T-005": {
      title: "ブランチの選択と成功時の状態をテストする",
      kind: "test",
      description:
        "src/work-branch/index.test.ts に足す。git の戻り値で origin の heads を渡し、checkout の引数と、呼ばれなかったことを観測する。gh-3-print-date が1つのときその短名を checkout すること（AC-004、AC-017）。gh-30-other は一致させないこと（AC-005）。起動ディレクトリで checkout すること（AC-021）。upstream やローカルだけのブランチは数えないこと（AC-023）。本文の feature-from-issue や空のタイトルでは選ばず、gh-3-print-date を checkout すること（AC-012、AC-013）。0件、複数、ローカルだけの gh-3-local では checkout もエージェント起動もされないこと（AC-006、AC-007、AC-008）。成功時は gh のラベル変更もコメントも無く、exit も呼ばれないこと（AC-015、AC-030）。",
      refs: ["FR-004", "FR-005", "FR-007", "FR-008", "FR-014"],
      verifies: [
        "AC-004",
        "AC-005",
        "AC-017",
        "AC-021",
        "AC-023",
        "AC-012",
        "AC-013",
        "AC-006",
        "AC-007",
        "AC-008",
        "AC-015",
        "AC-030",
      ],
      status: "done",
    },
    "T-006": {
      title: "失敗時のラベルとコメントと終了をテストする",
      kind: "test",
      description:
        "src/work-branch/index.test.ts に足す。差し替えた gh の edit と comment の引数、writeStderr、exit を観測する。該当が0件、複数、ローカルだけ、upstream だけのときは、ラベル追加が agent:failed だけで queued、running、done を外し、コメント本文がそれぞれ「該当する作業ブランチがありません」または「該当する作業ブランチが複数あります」であること（AC-009、AC-010、AC-011、AC-024、AC-028、AC-029）。設定ファイルが無いときは checkout せず、同じラベルと本文「docs/sdd/config.ts がありません」になり、エージェントは起動しないこと（AC-025、AC-026、AC-027）。これらは終了コード 1 で、標準エラーがそのコメント本文の1行であること（AC-035、AC-036、AC-037）。",
      refs: ["FR-006", "FR-009", "FR-010", "FR-011", "FR-012", "FR-013", "FR-019"],
      verifies: [
        "AC-009",
        "AC-010",
        "AC-011",
        "AC-024",
        "AC-025",
        "AC-026",
        "AC-027",
        "AC-028",
        "AC-029",
        "AC-035",
        "AC-036",
        "AC-037",
      ],
      status: "done",
    },
    "T-007": {
      title: "git と GitHub 書き込みの失敗をテストする",
      kind: "test",
      description:
        "src/work-branch/index.test.ts に足す。git ls-remote または checkout が失敗したときは checkout 後のブランチに移さず、ラベルは agent:failed だけにし、コメント本文と標準エラーが「作業ブランチを用意できませんでした」の1行で、git の stderr と secret-token を含まず、終了コードが 1 であること（AC-038、AC-039、AC-040、AC-041）。ラベル更新が失敗したときは終了コード 1、標準エラーが「ラベルを更新できませんでした」の1行で、gh の文と secret-token を出さないこと（AC-031、AC-032）。コメント投稿が失敗したときは終了コード 1、標準エラーが「コメントを付けられませんでした」の1行で、gh の文を出さないこと（AC-033、AC-034）。",
      refs: ["FR-015", "FR-016", "FR-017", "FR-018", "FR-020", "FR-021"],
      verifies: ["AC-031", "AC-032", "AC-033", "AC-034", "AC-038", "AC-039", "AC-040", "AC-041"],
      status: "done",
    },
  },
  acceptanceGuide: {
    setup: [
      { run: "bun install", note: "依存関係が揃っていることを確認する" },
      { run: "bun test src/work-branch/index.test.ts", note: "prepareWorkBranch の自動テスト" },
    ],
    server: {
      run: "bun docs/specs/GH-3/acceptance-server.ts",
      url: "http://127.0.0.1:3789/",
      timeoutSec: 15,
    },
    accounts: [],
    data: [
      {
        acs: ["AC-004", "AC-015"],
        run: "test -f docs/sdd/config.ts",
        expect: "起動ディレクトリに docs/sdd/config.ts があり、issueIdPrefix が読める",
      },
      {
        acs: ["AC-003", "AC-017"],
        run: "git remote get-url origin",
        expect: "origin が設定されており、人が該当ブランチを push 済みである",
      },
    ],
    check: [
      {
        url: "http://127.0.0.1:3789/",
        contains: "GH-3 acceptance ready",
        note: "受け入れテスト用の確認用サーバーが起動している",
      },
    ],
    notes: [
      "prepareWorkBranch は起動経路からは呼ばない。別コマンドや REPL で repository、issueNumber、title、body を渡して試す。",
      "人が確かめる受け入れ条件は、テスト用の GitHub issue（agent:queued）と origin の作業ブランチを用意してから prepareWorkBranch を実行し、git branch --show-current と gh issue view でラベル・コメントを確認する。",
      "失敗系は、該当ブランチが0件・複数・設定ファイル無しなどの状態を用意して、標準エラーが1行だけ出ることを確認する。",
    ],
  },
});
