import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

export default defineDesign<typeof requirements>()({
  overview:
    "起動画面を出したまま、設定した間隔で agent:queued を1件だけ進める。処理の前に実行 ID と agent:running を付け、spec 名の解決、チェックアウト、/sdd-impl、/sdd-finish、agent:done の順にする。失敗と、実行 ID の無い再起動は終了コード 1 で終える。",
  asIs:
    "src/main は起動画面を出すだけで、ポーリングしない。状態の文言は待機中のままである。src/github の listQueuedIssues は assignee の agent:queued を番号の昇順で返す。beginRunning は実行 ID のコメントのあと agent:running にする。src/work-branch の prepareWorkBranch は失敗すると agent:failed と標準エラーと終了コード 1 になる。src/agent の pollOnce は /sdd-impl だけを送り、/sdd-finish とラベルと作業ブランチの準備はしない。",
  toBe:
    "src/poll の startPolling が、起動時に agent:running を agent:failed へ反映し、そのあと間隔ごとに優先順位の高い1件を進める。起動画面の状態は、処理中だけ実行中になる。pollOnce は変えない。",
  answers: {
    "ANS-010": {
      about: { placement: ["src/poll/"] },
      question: "間隔ごとの接続は、どのディレクトリに置きますか。",
      answer:
        "src/poll/ に置く。src/agent はラベルと作業ブランチを呼ばない。src/github は git と SDK を持たない。src/main は起動と画面の組み立てに留める。",
    },
    "ANS-011": {
      about: {
        link: [
          ["src/poll/"],
          ["src/main/", "src/github/", "src/agent/", "src/work-branch/"],
        ],
      },
      question: "src/poll は、起動とラベルと local agent と作業ブランチの準備を、どう呼びますか。",
      answer:
        "本番の起動だけが src/poll を呼ぶ。src/poll は src/github、src/agent、src/work-branch を呼ぶ。src/tui は状態の文言を受け取るだけで、それらを呼ばない。",
    },
  },
  components: {
    PollLoop: {
      kind: "new",
      responsibility:
        "間隔ごとに1件を、実行 ID、agent:running、作業ブランチ、/sdd-impl、/sdd-finish、agent:done の順で進める。再起動時の running は agent:failed にする",
      files: ["src/poll/index.ts"],
      placement: { answer: "ANS-010" },
    },
    Startup: {
      kind: "modified",
      responsibility: "設定が揃った本番の起動で、起動画面と startPolling を同時に始める",
      files: ["src/main/index.ts"],
      asIs: "run は設定画面か起動画面を出す。import.meta.main のときだけ process.exit する",
    },
    MainScreen: {
      kind: "modified",
      responsibility: "起動画面の状態文言を、出たあとから待機中と実行中に切り替える",
      files: ["src/tui/index.ts"],
      asIs: "runMain は渡された status を1回描き、q で終了する",
    },
    IssueLabels: {
      kind: "modified",
      responsibility: "assignee の agent:running を、実行 ID コメントの有無とともに返す",
      files: ["src/github/index.ts"],
      asIs: "listQueuedIssues と beginRunning と applyOutcome がある。running の一覧は無い",
    },
    LocalAgent: {
      kind: "modified",
      responsibility: "/sdd-impl のあと /sdd-finish を送り、質問には既存の判断で答える。終了は呼び出し側に返す",
      files: ["src/agent/index.ts"],
      asIs: "pollOnce は /sdd-impl だけを送り、失敗すると自分で exit する",
    },
  },
  dependencies: [
    {
      from: "Startup",
      to: "PollLoop",
      label: "本番の起動で間隔ごとの処理を始める",
      basis: { answer: "ANS-011" },
    },
    {
      from: "Startup",
      to: "MainScreen",
      label: "状態文言を切り替える",
    },
    {
      from: "PollLoop",
      to: "IssueLabels",
      label: "queued と running の一覧、beginRunning、applyOutcome",
      basis: { answer: "ANS-011" },
    },
    {
      from: "PollLoop",
      to: "LocalAgent",
      label: "/sdd-impl と /sdd-finish",
      basis: { answer: "ANS-011" },
    },
  ],
  interfaces: {
    startPolling: {
      component: "PollLoop",
      kind: "function",
      change: "new",
      signature: `startPolling(
  input: { repository: string; assignee: string; cwd: string; intervalMinutes: number },
  deps: {
    gh: GhRunner;
    git: GitRunner;
    readText: (path: string) => Promise<ReadTextResult>;
    createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession>;
    newRunId: () => string;
    writeStderr: (line: string) => void;
    exit: (code: number) => void;
    setStatus: (status: "待機中" | "実行中") => void;
    schedule: (delayMs: number, run: () => void) => void;
  },
): Promise<void>`,
      description:
        "最初に agent:running を agent:failed へ反映する。実行 ID が無いときは標準エラーを予期せぬ失敗が発生しましたにして exit(1) する。そのあと schedule で intervalMinutes 分ごとに、実行中でなければ候補を1件だけ始める。処理中は setStatus に実行中、それ以外は待機中を渡す",
    },
    listRunningIssues: {
      component: "IssueLabels",
      kind: "function",
      change: "new",
      signature: `listRunningIssues(
  repository: string,
  assignee: string,
  deps: { run: GhRunner; writeStderr: (line: string) => void },
): Promise<{ ok: true; issues: { number: number; hasRunId: boolean }[] } | { ok: false }>`,
      description:
        "開いている agent:running のうち assignee のものだけを番号の昇順で返す。コメント本文が小文字の UUID だけなら hasRunId は true。失敗時は listQueuedIssues と同じ標準エラーを書き、ok: false を返す",
    },
    runSddCycle: {
      component: "LocalAgent",
      kind: "function",
      change: "new",
      signature: `runSddCycle(
  cwd: string,
  deps: { createAgent: (options: CreateAgentOptions) => Promise<LocalAgentSession> },
): Promise<{ ok: true } | { ok: false; message: string }>`,
      description:
        "composer-2.5、fast なし、settingSources は project で、/sdd-impl を送る。質問なら既存の組を順に送る。その完了のあと /sdd-finish を1回送る。exit は呼ばない",
    },
    runMain: {
      component: "MainScreen",
      kind: "function",
      change: "modified",
      signature: `runMain(view: MainView, options?: { onReady?: (handle: { setStatus: (status: string) => void }) => void }): Promise<"quit">`,
      description: "画面を描いたあと onReady に setStatus を渡す。引数が無い呼び出しは、今どおり status を1回描く",
      compatibility:
        "呼び出し元は src/main/index.ts の1か所。onReady は省けるので、既存のテストは引数を足さずに通す",
    },
  },
  dataModels: {},
  errorHandling: [
    {
      case: "作業ブランチの準備が失敗した",
      handling:
        "prepareWorkBranch が agent:failed、失敗理由の標準エラー、終了コード 1 を行う。startPolling は /sdd-impl と /sdd-finish を送らない",
      refs: ["FR-006", "FR-007", "AC-005", "AC-012", "AC-014"],
    },
    {
      case: "実行中にエラーになった",
      handling:
        "runSddCycle の message を標準エラーにし、applyOutcome で agent:failed にしてから exit(1) する。/sdd-finish は送らない",
      refs: ["FR-006", "FR-007", "AC-013", "AC-015"],
    },
    {
      case: "agent:failed へのラベル更新に失敗した",
      handling: "標準エラーをラベルを更新できませんでしたにして exit(1) する",
      refs: ["FR-007", "AC-016"],
    },
    {
      case: "優先順位の判断が失敗した",
      handling: "失敗の文を標準エラーにし、どの issue も始めずに exit(1) する",
      refs: ["FR-007", "AC-017"],
    },
    {
      case: "再起動時に実行 ID のコメントが無い",
      handling:
        "applyOutcome で agent:failed にし、標準エラーを予期せぬ失敗が発生しましたにして exit(1) する",
      refs: ["FR-004", "FR-006", "FR-007", "AC-018"],
    },
    {
      case: "優先順位の JSON が読めない",
      handling: "標準エラーを判断の JSON を読めませんでしたにして exit(1) する",
    },
    {
      case: "queued または running の列挙に失敗した",
      handling: "listQueuedIssues と同じ標準エラーを書いたあと、プロセスは終了せず、その回は issue を始めない",
    },
  ],
  impact: {
    create: ["src/poll/index.ts", "src/poll/index.test.ts"],
    modify: [
      "knip.json",
      "src/main/index.ts",
      "src/main/index.test.ts",
      "src/tui/index.ts",
      "src/tui/index.test.ts",
      "src/github/index.ts",
      "src/github/index.test.ts",
      "src/agent/index.ts",
      "src/agent/test-fixtures.ts",
      "src/agent/run-sdd-cycle.test.ts",
      "src/poll/test-fixtures.ts",
    ],
  },
  decisions: [
    {
      title: "間隔ごとの接続は src/poll に置く",
      decidedBy: "user",
      answers: ["ANS-010"],
      context:
        "src/agent はラベルと作業ブランチを呼ばない。src/github は SDK と git を持たない。接続をどちらかへ入れると、その境界を越える",
      decision:
        "src/poll/ に startPolling を置く。src/agent の pollOnce は残し、本番の起動からは呼ばない",
      alternatives: [
        { option: "src/agent/ に接続を足す", reason: "ラベルと作業ブランチの準備を agent が呼ぶことになる" },
        { option: "src/main/index.ts に接続を書く", reason: "起動のファイルが GitHub と SDK の手順を持つことになる" },
      ],
      adr: true,
    },
    {
      title: "本番の起動だけが src/poll を呼ぶ",
      decidedBy: "user",
      answers: ["ANS-011"],
      context:
        "起動画面の状態を変えるには、画面を出したあとで処理を始める必要がある。テストの run は API キーと設定画面のままにする",
      decision:
        "import.meta.main のときだけ startPolling を渡す。src/poll は listQueuedIssues、listRunningIssues、beginRunning、applyOutcome、prepareWorkBranch、runSddCycle を呼ぶ。src/tui は setStatus を受け取るだけで、それらを import しない",
      alternatives: [
        { option: "run が常に startPolling を呼ぶ", reason: "既存の起動テストが GitHub と SDK を呼ぶことになる" },
      ],
      adr: true,
    },
    {
      title: "優先順位は別の1回の判断で決める",
      decidedBy: "ai",
      context: "候補が2件以上のとき、内容から1件を選ぶ。モデルは composer-2.5 で fast は false である",
      decision:
        "同じ createAgent で別エージェントを1回呼び、JSON だけを返させる。形は {\"choice\":9} か {\"tie\":[7,9]} である。tie のときは番号の小さいほうを始める。候補が1件のときは判断を呼ばない",
      alternatives: [
        { option: "番号の昇順だけで選ぶ", reason: "内容から優先順位を判断する、という要件に合わない" },
      ],
      adr: false,
    },
  ],
  traceability: {
    "FR-001": ["PollLoop", "LocalAgent"],
    "FR-002": ["PollLoop", "IssueLabels", "LocalAgent"],
    "FR-003": ["PollLoop"],
    "FR-004": ["PollLoop", "IssueLabels"],
    "FR-005": ["PollLoop"],
    "FR-006": ["PollLoop", "IssueLabels"],
    "FR-007": ["PollLoop"],
    "FR-008": ["Startup", "MainScreen"],
  },
  nfrStrategy: {},
  invariantStrategy: {
    "INV-001":
      "src/config は変えない。run に startPolling を渡さない呼び出しは、今の設定画面と API キー不足のままにする。起動画面の初期 status は待機中のままにする",
  },
  conventionsCompliance: {
    "CONV-001": "src/poll/index.ts に startPolling を置く。関数は camelCase、型は PascalCase",
    "CONV-002":
      "途中の失敗と実行 ID が無い再起動は、要件の文を標準エラーに出して exit(1) する。API キーの値は出さない",
    "CONV-003": "出力は writeStderr の1行だけにする。ログ用のライブラリは足さない",
    "CONV-004": "テストは src/poll/index.test.ts。既存の隣の *.test.ts も bun test のままにする",
    "CONV-005": "起動画面の構成は上段の設定、中段の状態、下段の終了キーのままにする。変えるのは状態の文言だけである",
    "CONV-007": "新しいパッケージは足さない",
    "CONV-008": "品質ゲートの閾値とコマンドは変えない。関数が長くなるときは startPolling の中で分ける",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "列挙とラベルは src/github/index.ts、作業ブランチは prepareWorkBranch、SDK は src/agent の createAgent に合わせた",
    },
    security: {
      result: "considered",
      note: "API キーは既存の起動判定のままである。標準エラーにキーを出さない",
    },
    dataIntegrity: {
      result: "considered",
      note: "処理の前に beginRunning し、失敗時は applyOutcome の failed にする。実行中の印はラベルとメモリの両方である",
    },
    performance: {
      result: "considered",
      note: "1回の間隔で始める実行は1件である。優先順位の判断は候補が2件以上のときだけ1回呼ぶ",
    },
    observability: {
      result: "considered",
      note: "失敗の理由は標準エラーの1行である。成功時は追加の出力をしない",
    },
    testability: {
      result: "considered",
      note: "gh、git、createAgent、setStatus、exit、schedule を引数で差し替える。テストは src/poll/index.test.ts",
    },
    rollback: {
      result: "considered",
      note: "保存データの移行は無い。戻すときは src/poll と、main、tui、github、agent の追加呼び出しを戻す",
    },
    sharedFiles: {
      result: "considered",
      note: "共有の変更は src/main、src/tui、src/github、src/agent の既存ファイルへの追加だけである。package.json は変えない",
    },
  },
  risks: [
    "architecture.ts はまだ src/poll をモジュールに書いていない。sdd-finish で追記する",
    "pollOnce は /sdd-finish を送らない。本番は runSddCycle を使う",
    "prepareWorkBranch は失敗時に自分で exit する。startPolling はそのあとを続けない",
    "列挙の失敗はプロセスを終了しない。要件の途中失敗とは別である",
  ],
});
