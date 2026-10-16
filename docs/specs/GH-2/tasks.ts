import { defineTasks } from "../../sdd/schema/mod.ts";
import type design from "./design.ts";
import type requirements from "./requirements.ts";

// 実装タスク（docs/specs/GH-2/tasks.ts）。上から順に実施する。
export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "queued の列挙を実装しテストする",
      kind: "test",
      description:
        "src/github/index.ts に listQueuedIssues と GhRunner、IssueRow を作る。gh api --paginate で repository の開いている issue を取り、assignee が担当でラベル agent:queued のものだけを残し、pull request を除き、number の昇順で number、title、body をそのまま返す。0件は空配列で、文言は出さない。gh が失敗したら ok: false とし、writeStderr には「issue の列挙に失敗しました\\n」だけを渡す。knip.json の entry に src/github/index.ts を足す。src/github/index.test.ts では GhRunner を差し替え、listQueuedIssues を呼んで AC-001、AC-002、AC-022、AC-023、AC-024、AC-025、AC-026、AC-027、AC-028、AC-029、AC-030 の when と then を観測する。src/main、src/config、src/tui は変えない。既存の src/main/index.test.ts、src/config/index.test.ts、src/tui/index.test.ts が INV-001 を観測したまま bun test で通る。",
      refs: ["FR-001", "INV-001", "GithubIssueState"],
      verifies: [
        "INV-001",
        "AC-001",
        "AC-002",
        "AC-022",
        "AC-023",
        "AC-024",
        "AC-025",
        "AC-026",
        "AC-027",
        "AC-028",
        "AC-029",
        "AC-030",
      ],
      status: "done",
    },
    "T-002": {
      title: "running への遷移と実行 ID コメントを実装しテストする",
      kind: "test",
      description:
        "src/github/index.ts に beginRunning を足す。newRunId が返す小文字 UUID だけを本文にするコメントを gh issue comment --body-file - で付け、gh issue edit の --remove-label で agent:queued、agent:running、agent:done、agent:failed を外し、--add-label で agent:running だけにする。どちらかが失敗したら ok: false。src/github/index.test.ts で beginRunning を呼び、付けたラベルと外したラベル、コメント本文が UUID そのものであることを観測する。AC-003 と AC-005 は人が GitHub の画面で見る結果と同じ内容を、差し替えた GhRunner の引数で観測する。AC-004 は queued と running が両方付いた状態から running だけになること、AC-006 は 00000000-0000-4000-8000-000000000000 の 36 文字が省略されないことを観測する。",
      refs: ["FR-002", "FR-003", "GithubIssueState"],
      verifies: ["AC-003", "AC-004", "AC-005", "AC-006"],
      status: "done",
    },
    "T-003": {
      title: "完了と失敗の反映を実装しテストする",
      kind: "test",
      description:
        "src/github/index.ts に applyOutcome を足す。type が done のときは agent:done だけにし、コメントを増やさない。type が failed のときは agent:failed だけにし、reason が空文字でなければその文字列、空文字なら「予期せぬ失敗が発生しました」を本文にするコメントを1件足す。長い文字列も改行も省略しない。isRetryable が偽の起動前失敗も failed として同じコメントにする。src/github/index.test.ts で applyOutcome を呼び、ラベルとコメント件数、コメント本文を観測する。対象は AC-007、AC-008、AC-009、AC-010、AC-011、AC-012、AC-014、AC-015、AC-016、AC-017、AC-018、AC-019、AC-021。",
      refs: ["FR-004", "FR-005", "FR-006", "FR-007", "FR-009", "FR-010", "GithubIssueState"],
      verifies: [
        "AC-007",
        "AC-008",
        "AC-009",
        "AC-010",
        "AC-011",
        "AC-012",
        "AC-014",
        "AC-015",
        "AC-016",
        "AC-017",
        "AC-018",
        "AC-019",
        "AC-021",
      ],
      status: "done",
    },
    "T-004": {
      title: "再キューと4回目の失敗を実装しテストする",
      kind: "test",
      description:
        "applyOutcome の type が retryable のとき、gh でコメント一覧を読み、本文が小文字 UUID そのものの件数から1を引いた値を、これまでに queued へ戻した回数とする。3未満なら agent:queued だけにしてコメントを増やさない。3以上なら agent:failed だけにし、失敗理由のコメントを1件足す。空文字なら「予期せぬ失敗が発生しました」。src/github/index.test.ts で、戻した回数が0のとき（AC-013、AC-020）、2のとき（AC-031）、3のとき（AC-032、AC-033）を、コメント一覧を返す GhRunner で観測する。",
      refs: ["FR-008", "FR-010", "FR-011", "FR-012", "GithubIssueState"],
      verifies: ["AC-013", "AC-020", "AC-031", "AC-032", "AC-033"],
      status: "done",
    },
  },
});
