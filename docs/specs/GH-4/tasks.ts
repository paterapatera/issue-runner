import { defineTasks } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";
import type design from "./design.ts";

// 実装タスク（docs/specs/GH-4/tasks.ts）。上から順に実施する。
// 書き方: docs/sdd/guides/writing-tasks.md
// コミットはタスクに書かない（コミットメッセージ「<type>(<ID>): <タスクID> <タイトル>」から自動で求める）。
export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "local agent 用の SDK を足す",
      kind: "chore",
      description:
        "bun add で dependencies に @cursor/sdk の 1.0.37 だけを足す。他のパッケージや lock ファイルは足さない。src はまだ作らない。",
      refs: ["LocalAgent"],
      status: "done",
    },
    "T-002": {
      title: "1件の local agent を起動する",
      kind: "impl",
      description:
        "src/agent/index.ts に pollOnce を置く。引数は repository、assignee、cwd。deps は gh（GhRunner）、running、createAgent、writeStderr、exit。running.current が true のときは createAgent を呼ばない。false のときは src/github の listQueuedIssues を呼び、昇順の先頭1件だけを起動する。一覧が失敗したときは listQueuedIssues の標準エラーに任せ、exit を呼ばずエージェントも起動しない。起動中は running.current を true にし、完了のあと false に戻す。createAgent には cwd、settingSources が [\"project\"] だけ、modelId が composer-2.5、fast が false を渡す。最初に送るプロンプトは /sdd-impl だけにする。spec 名が空でも同じ文にする。その run で wait() を1回呼ぶ。判断用の別呼び出しが {\"kind\":\"done\"} を返したら追加のプロンプトは送らない。「受け入れテストは合格。PRを作成する。」と /sdd-finish は送らない。prepareWorkBranch、beginRunning、applyOutcome は呼ばない。run からは呼ばない。knip.json の entry に src/agent/index.ts を足す。src/main、src/config、src/tui、src/github、src/work-branch は変更しない。",
      refs: ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-008", "FR-013", "LocalAgent"],
      status: "done",
    },
    "T-003": {
      title: "起動と完了の受け入れ条件をテストする",
      kind: "test",
      description:
        "src/agent/index.test.ts を追加する。pollOnce を呼び、createAgent に渡した local.cwd、settingSources、modelId、fast、send したプロンプト、wait() の回数、exit の有無を観測する。cwd は /home/dev/widgets。issue-runner の起動ディレクトリが違っても cwd は渡した値のままであることを確かめる。issue-runner.json の model が gpt でもモデルは composer-2.5 にする。queued が0件の実行中から1件起動すること、実行中に次の issue 4 を起動しないこと、完了のあと次のポーリングで issue 4 を起動できることを確かめる。spec 名が GH-3 でも空でもプロンプトは /sdd-impl であることを確かめる。{\"kind\":\"done\"} のあと追加プロンプトが無く、受け入れ文と /sdd-finish を送らないことを確かめる。既存の src/main、src/config、src/tui、src/github、src/work-branch のテストファイルは変更しない。テストから品質ゲート、docker、依存関係の導入は呼ばない。",
      refs: ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-008", "FR-013"],
      verifies: [
        "INV-001",
        "AC-001",
        "AC-002",
        "AC-003",
        "AC-004",
        "AC-005",
        "AC-006",
        "AC-007",
        "AC-008",
        "AC-009",
        "AC-010",
        "AC-013",
        "AC-028",
        "AC-029",
        "AC-031",
        "AC-036",
        "AC-038",
      ],
      status: "done",
    },
    "T-004": {
      title: "起動失敗と実行中の失敗で終了する",
      kind: "impl",
      description:
        "pollOnce で、createAgent か send が CursorAgentError を投げたときは wait() を呼ばず、exit(1) し、writeStderr にはそのエラーの文をそのまま出す。wait() の result.status が error のときは wait() を1回呼んだうえで exit(1) し、writeStderr にはその実行中のエラー文を出す。どちらの失敗でも追加のプロンプトは送らず、次の queued issue は起動しない。成功時は exit を呼ばない。",
      refs: ["FR-004", "FR-009", "LocalAgent"],
      status: "done",
    },
    "T-005": {
      title: "失敗の受け入れ条件をテストする",
      kind: "test",
      description:
        "src/agent/index.test.ts に失敗のテストを足す。CursorAgentError の文が missing CURSOR_API_KEY のとき、終了コード 1、標準エラーがその文、wait() は呼ばれない、issue 4 は起動しないことを観測する。result.status が error で文が tool failed のとき、wait() は1回、終了コード 1、標準エラーが tool failed、issue 4 は起動しないことを観測する。2つの失敗で標準エラーの文が違うことを観測する。起動失敗では「受け入れテストは合格。PRを作成する。」と /sdd-finish を送らないことを観測する。",
      refs: ["FR-004", "FR-009", "FR-013"],
      verifies: ["AC-014", "AC-015", "AC-016", "AC-030", "AC-032", "AC-033", "AC-034"],
      status: "done",
    },
    "T-006": {
      title: "質問への回答を同じエージェントへ送る",
      kind: "impl",
      description:
        "実行が error でも CursorAgentError でもないとき、同じ createAgent の条件（composer-2.5、fast は false）で別エージェントを1回呼び、実行結果から JSON だけを返させる。/sdd-impl のプロンプトは変えない。kind が question のとき、pairs の各組を配列の順に元のエージェントへ送り、そのあと wait() する。質問文に（推奨）の選択肢が1つあるときは、JSON の answer が別の文でも、送る回答はその推奨の選択肢にし、文から（推奨）を除く。組が0件、question か answer が空、JSON でない、kind が question でも done でもないときは exit(1) し、標準エラーは「判断の JSON を読めませんでした」にする。回答生成が失敗したときは exit(1) し、標準エラーはその失敗文にし、元のエージェントへは送らない。質問の送信では終了コード 1 にしない。",
      refs: ["FR-010", "FR-011", "FR-014", "LocalAgent"],
      status: "done",
    },
    "T-007": {
      title: "質問と推奨の受け入れ条件をテストする",
      kind: "test",
      description:
        "src/agent/index.test.ts に質問のテストを足す。未コミット変更の確認では終了コード 1 にならず、回答側のモデルが composer-2.5 で fast ではなく、その組を同じエージェントへ送ることを観測する。組が1件の JSON では質問「未コミット変更をどうしますか」と回答「そのまま残す」だけを送る。組が2件の JSON ではその順に送る。ブランチ名の確認でも終了コード 1 にせず、失敗の標準エラーを出さない。判断結果が not-json、または pairs が空なら終了コード 1、標準エラーは「判断の JSON を読めませんでした」、追加プロンプトは送らない。生成失敗の文が model unavailable なら終了コード 1、標準エラーはその文、回答は送らない。選択肢が「捨てる」と「そのまま残す（推奨）」、および「別名にする（推奨）」と「この名前でよい」の2問なら、送る回答は「そのまま残す」と「別名にする」である。1問の選択肢が残す、捨てる（推奨）、聞くの順なら、送る回答は「捨てる」である。",
      refs: ["FR-010", "FR-011", "FR-014"],
      verifies: [
        "AC-017",
        "AC-018",
        "AC-019",
        "AC-020",
        "AC-035",
        "AC-037",
        "AC-039",
        "AC-040",
        "AC-041",
        "AC-042",
      ],
      status: "done",
    },
  },
  acceptanceGuide: {
    setup: [
      { run: "bun install", note: "依存関係（@cursor/sdk 含む）" },
      { run: "bun test src/agent", note: "local agent の受け入れ条件をカバーするユニットテスト" },
      { run: "bun docs/sdd/scripts/gate.ts", note: "品質ゲート" },
    ],
    accounts: [],
    data: [],
    check: [
      {
        url: "https://example.com",
        status: 200,
        note:
          "pollOnce は起動経路未接続のため画面確認は無し。上記 setup で agent モジュールを確かめる。",
      },
    ],
    notes: [
      "src/agent の pollOnce は、repository・assignee・cwd と createAgent 等を呼び出し側が渡す。issue-runner の TUI からはまだ呼ばれない。",
      "実際の local agent 実行には CURSOR_API_KEY と対象チェックアウトが必要。手動試験は別スクリプトから pollOnce を呼ぶ。",
    ],
  },
});
