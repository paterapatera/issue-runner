import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

export default defineDesign<typeof requirements>()({
  overview:
    "終了コード 1 で理由が空になる箇所だけを、既存モジュールの中で埋める。認証不足と壊れた JSON の文言は loadStartup のままにし、設定が残っていない終了は main が標準エラーへ書く。エージェント失敗の空文字は、標準エラーに出す直前だけ「予期せぬ失敗が発生しました」に置き換える。",
  asIs:
    "loadStartup は、キーが trim 後に空で SDK 認証が無いときと、JSON として読めないとき、および配列・null のときに、それぞれ決まった日本語を stderr に載せて kind: exit を返す。run はその文字列を標準エラーへ書く。runSettingsFlow は、保存成功扱いで設定が残っていないとき、標準エラーへ何も書かずに 1 を返す。pollOnce の failWithMessage と、startPolling の優先度判定・runSddCycle 失敗は、失敗理由が空文字でもそのまま writeStderr して exit(1) する。ログイン失敗は既に日本語を出して 1 を返す。",
  toBe:
    "loadStartup の分岐と文言は維持し、配列と null のテストを足す。runSettingsFlow は、その無言の 1 のときだけ「設定を保存できないため終了します」を標準エラーへ書いてから 1 を返す。失敗理由の長さが 0 のときだけ、pollOnce と startPolling が標準エラーへ「予期せぬ失敗が発生しました」を書く。長さが 1 以上の SDK の文は、英語のままで、GitHub の失敗コメントの本文も変えない。",
  answers: {},
  components: {
    loadStartup: {
      kind: "modified",
      responsibility:
        "API キーと SDK 認証の有無、issue-runner.json の読み取り結果から、起動継続か終了かを決める。終了時の日本語はここが持つ",
      files: ["src/config/index.ts"],
      asIs: "認証不足は SDK_AUTH_REQUIRED、JSON の解析失敗とオブジェクトでない値は READ_ERROR を stderr に載せて kind: exit を返す。空のキーで SDK 認証があるときは終了しない",
    },
    run: {
      kind: "modified",
      responsibility:
        "loadStartup の終了理由を標準エラーへ書き、設定フローで設定が残っていないときの終了理由も書く",
      files: ["src/main/index.ts"],
      asIs: "startup.kind が exit で stderr が空でないときだけ process.stderr.write する。runSettingsFlow の設定欠落は 1 を返すだけで標準エラーへ書かない。runSettings は直接 import している",
    },
    pollOnce: {
      kind: "modified",
      responsibility:
        "1件のエージェント実行が終了コード 1 になるとき、空の失敗理由を標準エラーへ出す前に固定の日本語へ置き換える",
      files: ["src/agent/index.ts"],
      asIs: "failWithMessage は受け取った文字列をそのまま writeStderr し、error.message が無いときは空文字のまま exit(1) する",
    },
    startPolling: {
      kind: "modified",
      responsibility:
        "ポーリング中に終了コード 1 で止まるとき、空の失敗理由を標準エラーへ出す前に、既にある予期しない失敗の日本語へ置き換える",
      files: ["src/poll/index.ts"],
      asIs: "優先度判定の message と runSddCycle の message を、空でもそのまま writeStderr してから exit(1) する。UNEXPECTED_FAILURE_MESSAGE は別の失敗で既に使っている",
    },
  },
  dependencies: [
    { from: "run", to: "loadStartup", label: "起動時の終了理由を受け取って標準エラーへ書く" },
    {
      from: "startPolling",
      to: "pollOnce",
      label: "runSddCycle の失敗理由を受け取り、標準エラーへ出して終了する",
    },
  ],
  interfaces: {
    loadStartup: {
      component: "loadStartup",
      kind: "function",
      change: "modified",
      signature:
        'export async function loadStartup(cwd: string, env: { CURSOR_API_KEY?: string }, ghLogin: () => Promise<string | undefined>, sdkAuthReady: boolean): Promise<LoadStartupResult>',
      description:
        "シグネチャと終了時の stderr 文言は変えない。配列と null は従来どおり READ_ERROR で kind: exit を返す",
      compatibility:
        "呼び出し元は src/main/index.ts の run だけである。戻り値の形は変えない。既存の認証不足と読み取り失敗のテストがそのまま通る",
    },
    run: {
      component: "run",
      kind: "function",
      change: "modified",
      signature: "export async function run(options?: RunOptions): Promise<number>",
      description:
        "戻り値は終了コードのままである。RunDeps に任意の runSettings を足し、未指定なら src/tui の runSettings を使う。設定が残っていないとき、標準エラーへ「設定を保存できないため終了します」を1行書いて 1 を返す",
      compatibility:
        "呼び出し元は src/main/index.ts の本番起動と src/main/index.test.ts である。既存の引数は変えず、runSettings は省略できる。キャンセルは 0 のまま、標準エラーへ終了理由を足さない",
    },
    pollOnce: {
      component: "pollOnce",
      kind: "function",
      change: "modified",
      signature:
        "export async function pollOnce(input: { repository: string; assignee: string; cwd: string }, deps: PollOnceDeps): Promise<{ ok: true } | { ok: false; exitCode: 1 }>",
      description:
        "シグネチャは変えない。writeStderr する失敗理由の長さが 0 のときだけ「予期せぬ失敗が発生しました」を書く。1文字以上ならその文字列のまま書く",
      compatibility:
        "呼び出し元は src/agent のテストである。tool failed のように1文字以上の理由を期待する既存テストは変えない。空文字のときだけ標準エラーの期待を新しい日本語にする",
    },
    startPolling: {
      component: "startPolling",
      kind: "function",
      change: "modified",
      signature:
        "export async function startPolling(input: StartPollingInput, deps: StartPollingDeps): Promise<void>",
      description:
        "シグネチャは変えない。優先度判定と runSddCycle の失敗で exit(1) するとき、標準エラーへ出す文字列の長さが 0 なら「予期せぬ失敗が発生しました」を書く。applyOutcome に渡す失敗理由の文字列は、空のまま変えない",
      compatibility:
        "呼び出し元は src/main/index.ts の本番起動と src/poll/index.test.ts である。1文字以上の失敗理由を標準エラーと失敗コメントの両方に使う既存テストは変えない",
    },
  },
  dataModels: {},
  errorHandling: [
    {
      case: "CURSOR_API_KEY が trim 後に空で、SDK の保存済み認証も無い",
      handling:
        "loadStartup が SDK_AUTH_REQUIRED を stderr に載せて kind: exit を返す。run がそれを1行で標準エラーへ書き、1 を返す。TUI は開かない。文言は定数のままで、環境変数の値は連結しない",
      refs: ["FR-001", "AC-003"],
    },
    {
      case: "issue-runner.json が JSON として読めない、またはオブジェクトでない",
      handling:
        "loadStartup が READ_ERROR を stderr に載せて kind: exit を返す。空ファイル、解析できない文字列、[]、null は同じ文言である。run がそれを標準エラーへ書いて 1 を返す",
      refs: ["FR-002", "AC-011"],
    },
    {
      case: "終了コード 1 になるが、失敗理由の文字列の長さが 0 である",
      handling:
        "pollOnce と startPolling は、標準エラーへ書く直前だけ「予期せぬ失敗が発生しました」に置き換える。長さが 1 以上の SDK の文は置き換えない。設定が残っていない run の終了は「設定を保存できないため終了します」を書く",
      refs: ["FR-003", "AC-009"],
    },
  ],
  impact: {
    create: [],
    modify: [
      "src/config/index.ts",
      "src/config/index.test.ts",
      "src/main/index.ts",
      "src/main/index.test.ts",
      "src/agent/index.ts",
      "src/agent/poll-once-failures.test.ts",
      "src/poll/index.ts",
      "src/poll/index.test.ts",
    ],
  },
  decisions: [
    {
      title: "空の失敗理由は標準エラーへ出す直前だけ置き換える",
      decidedBy: "ai",
      context:
        "失敗理由が無いときの日本語は要件で決まっている。poll は既に UNEXPECTED_FAILURE_MESSAGE を持ち、agent は poll に依存できない。空文字を GitHub の失敗コメントにも書くと、要件に無いコメント本文の変更になる",
      decision:
        "pollOnce は agent 内の同じ日本語定数を、標準エラーへ書く直前だけ使う。startPolling は既存の UNEXPECTED_FAILURE_MESSAGE を、標準エラーへ書く直前だけ使う。applyOutcome の reason は空文字のまま渡す。長さが 1 以上の文はどちらもそのまま出す",
      alternatives: [
        {
          option: "空文字を runSddCycle の戻り値の時点で日本語に変える",
          reason: "失敗コメントの本文まで変わる。要件は標準エラーだけを決めている",
        },
        {
          option: "共通モジュールに文言を置く",
          reason: "既存の各モジュールが自分の日本語定数を持っており、新しいモジュールは要らない",
        },
      ],
      adr: false,
    },
    {
      title: "設定が残っていない終了は run が標準エラーへ書く",
      decidedBy: "ai",
      context:
        "この分岐は runSettingsFlow の中にあり、通常の runSettings では保存成功のあとでしか saved を返さない。テストから届かせるには、runSettings を差し替える必要がある",
      decision:
        "RunDeps の任意項目 runSettings が未指定なら、今の src/tui の runSettings を使う。戻りが saved で savedConfig が無いとき、process.stderr.write で「設定を保存できないため終了します」を1行書いて 1 を返す。テストはこの任意項目で saved を返し、submit を成功させない",
      alternatives: [
        {
          option: "runSettings の実装に、保存せず saved を返す本番分岐を足す",
          reason: "届かない終了を本番の操作で起こすことになり、要件の通常操作を変える",
        },
      ],
      adr: false,
    },
  ],
  traceability: {
    "FR-001": ["loadStartup", "run"],
    "FR-002": ["loadStartup", "run"],
    "FR-003": ["run", "pollOnce", "startPolling"],
    "NFR-001": ["loadStartup", "run", "pollOnce", "startPolling"],
  },
  nfrStrategy: {
    "NFR-001":
      "認証不足と設定ファイル読み取り失敗の文言は、環境変数やファイル本文を連結しない定数のままにする。新しい2つの終了理由も固定の日本語定数にし、自動テストで与えた秘密の文字列が含まれないことを確かめる",
  },
  invariantStrategy: {
    "INV-001":
      "キーが trim 後に空でも sdkAuthReady が true の分岐は変えない。既存の起動テストが終了せず画面へ進むことを維持する",
    "INV-002": "runSettings の戻りが cancel のときは 0 を返し、標準エラーへ終了理由を書かない",
    "INV-003":
      "設定値の検証失敗は saveConfig のメッセージを画面へ返す今の submit のままにし、プロセスを終了させない",
    "INV-004": "saveConfig と読み取り成功時の JSON の形には手を入れない",
    "INV-005": "issue-runner.json が無いときに設定画面へ進む loadStartup の分岐は変えない",
  },
  conventionsCompliance: {
    "CONV-001":
      "新しいファイルは作らない。終了理由の定数は既存ファイルの UPPER_SNAKE の定数名にし、関数は camelCase のままにする",
    "CONV-002":
      "終了コード 1 のときは、既存の loadStartup と login.ts と同じく結果を返して止める。新しく出す利用者向けの文は日本語の定数にし、API キーの値は含めない",
    "CONV-003":
      "終了理由は process.stderr.write か、注入された writeStderr だけに出す。ログ用のライブラリは足さない。API キーは出さない",
    "CONV-004":
      "テストは src/config/index.test.ts、src/main/index.test.ts、src/agent/poll-once-failures.test.ts、src/poll/index.test.ts に足す。ランナーは bun test のままにする",
    "CONV-005": "該当しない: TUI の部品、色、配置は変えない",
    "CONV-007": "該当しない: パッケージは足さない",
    "CONV-008": "該当しない: 品質ゲートのコマンドや閾値は変えない",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "終了理由の定数と標準エラーへの1行出力は、src/config/index.ts の READ_ERROR と src/poll/index.ts の UNEXPECTED_FAILURE_MESSAGE に合わせた",
    },
    security: {
      result: "considered",
      note: "NFR-001 のとおり、固定文言には秘密を連結しない。長さが 1 以上の SDK の文は要件どおりそのまま出す",
    },
    dataIntegrity: {
      result: "notApplicable",
      note: "設定ファイルの保存手順も、同時更新の扱いも変えない",
    },
    performance: {
      result: "notApplicable",
      note: "終了時に固定文字列を1回書くだけで、一覧の走査や繰り返しの通信は足さない",
    },
    observability: {
      result: "considered",
      note: "終了コード 1 の空理由は、pollOnce と startPolling と run が標準エラーへ日本語1行を書く",
    },
    testability: {
      result: "considered",
      note: "runSettings は RunDeps の任意項目で差し替える。エージェントと git と gh は既存のテスト用の注入を使う",
    },
    rollback: {
      result: "considered",
      note: "保存データの移行は無い。戻すときはこのブランチの変更を戻せば、終了時の標準エラーだけが元に戻る",
    },
    sharedFiles: {
      result: "considered",
      note: "package.json、ルーティング、共通スキーマは変えない。変更は main、config のテスト、agent、poll と、それぞれの隣のテストに限る",
    },
  },
  risks: [
    "docs/sdd/architecture.ts の basedOn は origin/main より遅れており、package.json の依存変更が未反映である。この設計は依存を変えない。architecture.ts の更新は sdd-finish で行う",
    "設定が残っていない終了は、本番の runSettings では保存成功後にしか saved を返さないため、通常操作では起きない。テストは注入した runSettings で再現する",
  ],
});
