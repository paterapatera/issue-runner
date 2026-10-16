import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

// 設計（docs/specs/GH-2/design.ts）。
export default defineDesign<typeof requirements>()({
  overview:
    "GitHub のラベル遷移と queued の列挙を、起動や TUI とは別のモジュールで gh に行わせる。状態ラベルは付け替えのたびに1つだけにし、再キューの回数は issue に残った実行 ID のコメントから数える。起動画面の処理は呼ばない。",
  asIs:
    "新規作成。src には起動、設定、TUI しか無く、issue のラベルを読む処理も付ける処理も無い。main が gh を使うのは、ログイン名を gh api user で取るときだけである。",
  toBe:
    "src/github/index.ts が、設定の repository と assignee を引数で受け、gh で queued の列挙、running への遷移、完了・失敗・再キューの反映を行う。run からは呼ばない。列挙の失敗だけが、決まった1行を標準エラーに出す。",
  answers: {
    "ANS-032": {
      about: { placement: ["src/github/"] },
      question: "ラベル遷移のコードをどのディレクトリに置きますか。",
      answer: "src/github/ に置く。起動、設定、TUI のファイルは変えない。knip の entry に src/github/index.ts を足す。",
    },
  },
  components: {
    GithubIssueState: {
      kind: "new",
      responsibility:
        "開いている agent:queued の列挙、状態ラベルを1つだけにすること、実行 ID と失敗理由のコメント、再キュー回数の判定を行う。gh の起動は引数で差し替える。",
      files: ["src/github/index.ts"],
      placement: { answer: "ANS-032" },
    },
  },
  dependencies: [],
  interfaces: {
    listQueuedIssues: {
      component: "GithubIssueState",
      kind: "function",
      change: "new",
      signature:
        "listQueuedIssues(repository: string, assignee: string, deps: { run: GhRunner; writeStderr: (line: string) => void }): Promise<{ ok: true; issues: IssueRow[] } | { ok: false }>",
      description:
        "gh api --paginate で、その repository の開いている issue のうち assignee が担当でラベル agent:queued のものをすべて取る。pull request は除く。number の昇順に並べ、各行は number、title、body をそのまま返す。0件なら issues は空で、文言は出さない。gh が失敗したら ok: false とし、writeStderr に「issue の列挙に失敗しました\\n」だけを渡す。gh の標準エラーは出さない。",
    },
    beginRunning: {
      component: "GithubIssueState",
      kind: "function",
      change: "new",
      signature:
        "beginRunning(repository: string, issueNumber: number, deps: { run: GhRunner; newRunId: () => string }): Promise<{ ok: true; runId: string } | { ok: false }>",
      description:
        "newRunId が返す小文字の UUID だけを本文にするコメントを付け、状態ラベルを agent:running だけにする。コメントとラベルのどちらが失敗しても ok: false を返し、成功とは扱わない。",
    },
    applyOutcome: {
      component: "GithubIssueState",
      kind: "function",
      change: "new",
      signature:
        "applyOutcome(repository: string, issueNumber: number, outcome: { type: \"done\" } | { type: \"failed\"; reason: string } | { type: \"retryable\" }, deps: { run: GhRunner }): Promise<{ ok: true } | { ok: false }>",
      description:
        "done は agent:done だけにしてコメントを増やさない。failed は agent:failed だけにし、reason が空文字でなければその文字列、空文字なら「予期せぬ失敗が発生しました」を本文にするコメントを1件足す。retryable は、本文が小文字 UUID そのもののコメント件数から1を引いた回数が3未満なら agent:queued だけにしてコメントを増やさない。その回数が3以上なら failed と同じく agent:failed と失敗コメントにする。ラベルまたはコメントの gh が失敗したら ok: false。",
    },
  },
  dataModels: {
    IssueRow: {
      kind: "new",
      description: "列挙の1行。GitHub の番号、タイトル、本文をそのまま持つ。",
      definition: "type IssueRow = { number: number; title: string; body: string }",
    },
  },
  errorHandling: [
    {
      case: "queued の列挙で gh が失敗する",
      handling:
        "ok: false を返す。ラベルは変えない。標準エラーには「issue の列挙に失敗しました」の1行だけを出し、gh の出力は出さない。",
      refs: ["AC-022"],
    },
    {
      case: "失敗理由が空文字である",
      handling: "コメント本文を「予期せぬ失敗が発生しました」にする。",
      refs: ["AC-017"],
    },
    {
      case: "列挙した issue のタイトルが空文字である",
      handling: "その行の title を空文字のまま返す。",
      refs: ["AC-025"],
    },
    {
      case: "列挙した issue の本文が空文字である",
      handling: "その行の body を空文字のまま返す。",
      refs: ["AC-028"],
    },
    {
      case: "ラベルの付け替え、またはコメントの投稿で gh が失敗する",
      handling: "ok: false を返す。成功とは扱わない。利用者向けの追加の文は出さない。",
    },
  ],
  impact: {
    create: ["src/github/index.ts", "src/github/index.test.ts"],
    modify: ["knip.json"],
  },
  decisions: [
    {
      title: "GitHub 操作は gh のままにする",
      decidedBy: "ai",
      context: "GitHub の操作は実行環境の gh に任せ、資格情報はアプリが読まないと既に決まっている。",
      decision:
        "列挙は gh api --paginate、ラベルは gh issue edit の --add-label と --remove-label、コメントは gh issue comment --body-file - で行う。新しいパッケージは足さない。実行 ID は crypto.randomUUID の小文字表記を使う。",
      alternatives: [
        {
          option: "GitHub の API を呼ぶ新しいライブラリを足す",
          reason: "既存の方針が gh に任せるとしており、新しい依存は要らない",
        },
      ],
      adr: false,
    },
    {
      title: "再キューの回数は実行 ID のコメントから数える",
      decidedBy: "ai",
      context:
        "再キューのときはコメントを増やさない。running へ進むたびに小文字 UUID のコメントが1件残る。回数を別の保存先に置く要件は無い。",
      decision:
        "applyOutcome の retryable では、本文が小文字 UUID そのもののコメントの件数から1を引いた値を、これまでに queued へ戻した回数とする。3未満なら queued に戻し、3以上なら failed にする。",
      alternatives: [
        {
          option: "回数をローカルファイルに書く",
          reason: "プロセスが落ちるとファイルと GitHub の状態がずれ、要件は GitHub 上の回数で決まっている",
        },
      ],
      adr: false,
    },
    {
      title: "ラベル遷移を src/github に置く",
      decidedBy: "user",
      answers: ["ANS-032"],
      context:
        "ADR-0007 と architecture.ts は src/main、src/config、src/tui だけを置いている。ラベル遷移のディレクトリは、その文書から1つに決まらない。",
      decision:
        "src/github/ に置く。src/main、src/config、src/tui は変更しない。knip.json の entry に src/github/index.ts を足す。",
      alternatives: [
        {
          option: "src/main/index.ts に関数を足す",
          reason: "起動のモジュールが GitHub のラベル操作を抱える。INV-001 の起動経路と混ざる",
        },
      ],
      adr: true,
    },
  ],
  traceability: {
    "FR-001": ["GithubIssueState"],
    "FR-002": ["GithubIssueState"],
    "FR-003": ["GithubIssueState"],
    "FR-004": ["GithubIssueState"],
    "FR-005": ["GithubIssueState"],
    "FR-006": ["GithubIssueState"],
    "FR-007": ["GithubIssueState"],
    "FR-008": ["GithubIssueState"],
    "FR-009": ["GithubIssueState"],
    "FR-010": ["GithubIssueState"],
    "FR-011": ["GithubIssueState"],
    "FR-012": ["GithubIssueState"],
  },
  nfrStrategy: {},
  invariantStrategy: {
    "INV-001":
      "src/main/index.ts、src/config/index.ts、src/tui/index.ts を変更しない。ラベル遷移は run から呼ばない。既存の起動、設定、TUI のテストをそのまま通す。",
  },
  conventionsCompliance: {
    "CONV-001":
      "ファイルは src/github/index.ts。関数は listQueuedIssues、beginRunning、applyOutcome。型は IssueRow と GhRunner。",
    "CONV-002":
      "列挙の失敗は例外にせず ok: false とし、標準エラーに「issue の列挙に失敗しました」の1行だけを出す。API キーの値は出さない。起動できないときの終了コード 1 は既存の main のままである。",
    "CONV-003":
      "ログ用のライブラリは足さない。出すのは列挙失敗の1行だけで、標準エラーへ書く。gh の標準エラーは転送しない。",
    "CONV-004": "テストは src/github/index.test.ts に置き、bun test で gh と UUID の生成を差し替えて確かめる。",
    "CONV-005": "該当しない: TUI のファイルも描画も変えない",
    "CONV-007": "該当しない: パッケージは足さない。lock ファイルも増やさない",
    "CONV-008": "該当しない: 閾値やゲートのコマンドは変えない。knip の entry に src/github/index.ts を足すだけである",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "gh の呼び方は src/main/index.ts の fetchGhLogin と同じく、コマンド実行を引数で差し替える。新しいライブラリは足さない。",
    },
    security: {
      result: "considered",
      note: "資格情報は gh に任せる。列挙失敗では gh の標準エラーを出さず、決まった1行だけを出す。コメント本文に API キーは足さない。",
    },
    dataIntegrity: {
      result: "considered",
      note: "状態ラベルは --remove-label で4つを外してから1つを付ける。コメントまたはラベルの gh が失敗したら ok: false とし、成功とは扱わない。再キュー回数は UUID コメントの件数から計算する。",
    },
    performance: {
      result: "considered",
      note: "列挙は gh api --paginate で一致したものをすべて取る。gh issue list の既定上限 30 には頼らない。",
    },
    observability: {
      result: "considered",
      note: "列挙失敗だけ標準エラーに1行出す。それ以外の gh 失敗は戻り値の ok: false で分かる。",
    },
    testability: {
      result: "considered",
      note: "GhRunner と newRunId を引数で差し替える。テストは src/github/index.test.ts。",
    },
    rollback: {
      result: "considered",
      note: "保存データの移行は無い。戻すときは src/github と knip.json の entry を戻せば、起動経路は元のままである。",
    },
    sharedFiles: {
      result: "considered",
      note: "共有ファイルの変更は knip.json の entry 追加だけである。src/main、src/config、src/tui は変えない。",
    },
  },
  risks: [
    "architecture.ts は src/github をまだモジュールにしていない。sdd-finish で追記する。",
    "本文が小文字 UUID そのもののコメントを人が足すと、再キューの回数の計算がずれる。",
    "ラベルの変更に成功しコメントの投稿に失敗すると、ok: false でもラベルだけ先に変わっていることがある。",
  ],
});
