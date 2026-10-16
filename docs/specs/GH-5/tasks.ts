import { defineTasks } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";
import type design from "./design.ts";

// 実装タスク（docs/specs/GH-5/tasks.ts）。上から順に実施する。
// 書き方: docs/sdd/guides/writing-tasks.md
export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "running の issue を列挙する",
      kind: "impl",
      description:
        "src/github/index.ts に listRunningIssues を足す。引数は repository、assignee、deps の run と writeStderr。開いている agent:running のうち assignee のものだけを番号の昇順で返す。各 issue のコメント本文が小文字の UUID だけなら hasRunId は true。列挙に失敗したときは listQueuedIssues と同じ標準エラーを書き、ok: false を返す。pollOnce と beginRunning と applyOutcome の既存の振る舞いは変えない。",
      refs: ["FR-004", "IssueLabels"],
      status: "done",
    },
    "T-002": {
      title: "running の列挙をテストする",
      kind: "test",
      description:
        "src/github/index.test.ts に listRunningIssues のテストを足す。assignee が octocat の issue 8 だけが返り、別の担当者の running は返らないことを観測する。コメント本文が小文字の UUID のとき hasRunId が true、コメントが無いとき false であることを観測する。gh が失敗したとき ok: false で、標準エラーが issue の列挙に失敗しましたであることを観測する。テストから品質ゲート、docker、依存関係の導入は呼ばない。",
      refs: ["FR-004", "IssueLabels"],
      status: "done",
    },
    "T-003": {
      title: "sdd-impl のあと sdd-finish を送る",
      kind: "impl",
      description:
        "src/agent/index.ts に runSddCycle を足す。cwd と createAgent を受け、composer-2.5、fast なし、settingSources は project で /sdd-impl を送る。質問なら既存の組を配列の順に送り、推奨の選択肢を選ぶ。その完了のあと /sdd-finish を1回送る。失敗しても exit は呼ばず、{ ok: false, message } を返す。pollOnce は変えない。",
      refs: ["FR-002", "LocalAgent"],
      status: "done",
    },
    "T-004": {
      title: "finish を impl の完了前に送らないことをテストする",
      kind: "test",
      description:
        "src/agent/index.test.ts に runSddCycle のテストを足す。/sdd-impl の wait が終わるまで /sdd-finish を送らないことを観測する。wait が終わったあと /sdd-finish を1回送ることを観測する。実行中のエラーでは /sdd-finish を送らず、message にその文が入ることを観測する。exit は呼ばない。",
      refs: ["FR-002", "LocalAgent"],
      verifies: ["AC-004"],
      status: "done",
    },
    "T-005": {
      title: "起動画面の状態を後から変える",
      kind: "impl",
      description:
        "src/tui/index.ts の runMain に、省ける onReady を足す。画面を描いたあと、onReady に setStatus を渡す。setStatus はその場の状態文言を書き換える。onReady が無い呼び出しは、渡された status を1回描く今の動作のままにする。上段の設定と下段の終了キー q は変えない。",
      refs: ["FR-008", "MainScreen"],
      status: "done",
    },
    "T-006": {
      title: "実行中と待機中の表示をテストする",
      kind: "test",
      description:
        "src/tui/index.test.ts に、起動画面の状態を見るテストを足す。初期の status が待機中のとき、画面に待機中と出ることを観測する。onReady の setStatus に実行中を渡したとき、省略せず1行で実行中と出て、上段の設定と下段の q が残ることを観測する。既存の設定画面のテストは変えない。",
      refs: ["FR-008", "MainScreen"],
      verifies: ["AC-020", "AC-021"],
      status: "done",
    },
    "T-007": {
      title: "間隔ごとに1件を接続する",
      kind: "impl",
      description:
        "src/poll/index.ts に startPolling を置く。最初に listRunningIssues を呼び、各 issue を applyOutcome の failed にする。hasRunId が false のときは標準エラーを予期せぬ失敗が発生しましたにして exit(1) する。hasRunId が true のときも agent:failed にし、agent:done にはしない。そのあと schedule で intervalMinutes 分ごとに1回だけ処理する。実行中なら次の issue は始めない。候補は設定の assignee の agent:queued だけにする。0件なら何も始めない。2件以上なら createAgent で composer-2.5、fast なしの別呼び出しに JSON だけを返させ、choice の番号を始める。tie のときは番号の小さいほうを始める。判断の失敗文があればその文を標準エラーにして exit(1) し、どちらも始めない。JSON が読めなければ標準エラーを判断の JSON を読めませんでしたにして exit(1) する。始める前に setStatus を実行中にし、beginRunning で実行 ID のコメントと agent:running を付ける。そのあと prepareWorkBranch を呼ぶ。失敗時は prepareWorkBranch の終了に任せ、/sdd-impl と /sdd-finish は送らない。成功したら runSddCycle を呼ぶ。成功なら applyOutcome の done で agent:done にし、setStatus を待機中に戻す。runSddCycle が失敗したら message を標準エラーにし、agent:failed にして /sdd-finish は送らず exit(1) する。agent:failed への更新に失敗したら標準エラーをラベルを更新できませんでしたにして exit(1) する。列挙の失敗ではプロセスを終了せず、その回は始めない。",
      refs: ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-006", "FR-007", "PollLoop"],
      status: "done",
    },
    "T-008": {
      title: "接続の受け入れ条件をテストする",
      kind: "test",
      description:
        "src/poll/index.test.ts で startPolling を呼ぶ。schedule は記録してテストから実行し、2分を実際には待たない。assignee が octocat の issue 7 だけが始まり、別の担当者の issue 9 は始まらないことを観測する。queued が0件なら何も始まらない。issue 7 の処理では、実行 ID のコメントと agent:running、spec 名の解決、チェックアウト、/sdd-impl、/sdd-finish、agent:done の順を観測する。作業ブランチの準備が失敗したら /sdd-impl と /sdd-finish を送らず、ラベルが agent:failed になり、終了コード 1、標準エラーが該当する作業ブランチがありませんであることを観測する。issue 8 が running の間隔では /sdd-impl を送らない。running だけなら何も始まらない。実行 ID が aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee の running を再起動すると agent:failed になり、agent:done にせず /sdd-impl を送らない。落ちる前に完了していた running も agent:failed のままにする。実行中に次の間隔が来ても issue 9 は始まらない。本文が優先度は低いの issue 7 と優先度は高いの issue 9 では、判断が 9 のとき 9 だけが始まり、7 は次の schedule まで始まらず、判断のモデルが composer-2.5 で fast ではないことを観測する。判断が同じなら 7 が始まる。実行中のエラー tool failed では agent:failed、/sdd-finish を送らず、終了コード 1、標準エラーが tool failed である。判断の失敗文が model unavailable なら終了コード 1 で、7 も 9 も始まらない。実行 ID が無い running は agent:failed、終了コード 1、標準エラーが予期せぬ失敗が発生しましたである。ラベル更新の失敗は終了コード 1、標準エラーがラベルを更新できませんでしたである。",
      refs: ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-006", "FR-007"],
      verifies: [
        "AC-001",
        "AC-002",
        "AC-003",
        "AC-005",
        "AC-006",
        "AC-007",
        "AC-008",
        "AC-009",
        "AC-010",
        "AC-011",
        "AC-012",
        "AC-013",
        "AC-014",
        "AC-015",
        "AC-016",
        "AC-017",
        "AC-018",
        "AC-019",
      ],
      status: "done",
    },
    "T-009": {
      title: "本番の起動から接続を始める",
      kind: "impl",
      description:
        "src/main/index.ts の import.meta.main のときだけ startPolling を渡す。起動画面の onReady で受け取った setStatus を startPolling に渡す。interval は設定の分、repository と assignee と cwd も設定から渡す。run に startPolling を渡さない呼び出しは、今の設定画面と API キー不足のままにする。src/config は変えない。",
      refs: ["FR-008", "Startup", "PollLoop"],
      status: "done",
    },
    "T-010": {
      title: "起動の既存の振る舞いをテストする",
      kind: "test",
      description:
        "src/main/index.test.ts で、startPolling を渡さない run が起動画面に待機中を出し、listRunningIssues も runSddCycle も呼ばないことを観測する。CURSOR_API_KEY が無いときは終了コード 1 で TUI を出さない既存のテストを変えない。src/config/index.test.ts と設定画面のテストも変えない。issue-runner.json のキーが repository、interval、model、assignee のままであることを、既存のテストの成功で観測する。",
      refs: ["FR-008", "Startup"],
      verifies: ["INV-001"],
      status: "done",
    },
    "T-011": {
      title: "issue 列挙の gh api を GET にする",
      kind: "impl",
      description:
        "listQueuedIssues と listRunningIssues の gh api 呼び出しに --method GET を付ける。-f だけだと POST 扱いになり issue の列挙に失敗しました になる。テストで argv に GET があることを観測する。",
      refs: ["IssueLabels", "PollLoop"],
      status: "done",
    },
  },
  acceptanceGuide: {
    setup: [
      {
        run: "bun install",
        note: "依存関係を揃える",
      },
      {
        run:
          'if test -z "$CURSOR_API_KEY"; then echo "CURSOR_API_KEY は未設定です。受け入れ前に export してください"; else echo "CURSOR_API_KEY は設定済みです"; fi',
        note: "本番起動に必須（未設定でも準備コマンドは続行）",
      },
      {
        run:
          'if test -f issue-runner.json; then echo "issue-runner.json があります"; else printf \'%s\\n\' \'{"repository":"example/app","interval":"2","model":"composer-2.5","assignee":"octocat"}\' > issue-runner.json && echo "issue-runner.json をサンプルで作成しました（repository は手元の値に直してください）"; fi',
        note: "repository・interval・model・assignee",
      },
      {
        run: "gh auth status || echo 'gh 未ログインの場合は gh auth login を実行してください'",
        note: "GitHub CLI のログイン確認（未ログインでも準備は続行）",
      },
    ],
    accounts: [],
    data: [
      {
        acs: ["AC-020", "AC-021"],
        run: "echo '手元のリポジトリに、assignee が issue-runner.json の assignee と一致する agent:queued の issue を1件以上用意する（処理中は agent:running）'",
        expect:
          "queued が0件のとき起動画面は待機中、issue 処理中は実行中と表示される前提のデータ",
      },
    ],
    server: {
      run:
        'bun -e \'Bun.serve({ hostname: "127.0.0.1", port: 18765, fetch() { return new Response("待機中\\n実行中\\n", { headers: { "content-type": "text/plain; charset=utf-8" } }); } });\'',
      url: "http://127.0.0.1:18765",
      timeoutSec: 15,
    },
    check: [
      {
        url: "http://127.0.0.1:18765",
        contains: "待機中",
        note: "AC-021（自動確認は文言スタブ。実機は下記 notes の TUI 手順）",
      },
      {
        url: "http://127.0.0.1:18765",
        contains: "実行中",
        note: "AC-020（自動確認は文言スタブ。実機は下記 notes の TUI 手順）",
      },
    ],
    notes: [
      "TUI の受け入れ: リポジトリのルートで CURSOR_API_KEY を設定し、bun src/main/index.ts を起動する。",
      "agent:queued が無いとき、起動画面の状態行に「待機中」が1行で出ること（AC-021）。上段の repository 等と下段の q が残ること。",
      "issue が処理に入ると状態が「実行中」に変わること（AC-020）。失敗時はプロセスが終了し、失敗状態は画面に出さない。",
      "テスト用 run（bun test の main）は startPolling を渡さず、待機中のままである（INV-001 は自動テストで確認済み）。",
    ],
  },
});
