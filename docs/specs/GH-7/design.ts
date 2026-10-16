import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

export default defineDesign<typeof requirements>()({
  overview:
    "起動判定はこれまでどおり src/config の loadStartup に置く。認証ファイルの大きさだけを src/main で調べ、真偽を渡す。ログインは bun src/main/login.ts から Cursor.auth.login() を呼ぶ。環境変数が空のとき、エージェントには API キーを渡さない。",
  asIs:
    "loadStartup は CURSOR_API_KEY を trim し、空なら stderr 無しで終了コード 1 を返す。~/.cursor/sdk/auth.json は見ない。本番起動は process.env.CURSOR_API_KEY ?? \"\" を createProductionPollingDeps に渡し、Agent.create の apiKey は常に文字列である。ログイン用の入口は無い。",
  toBe:
    "trim 後に空でないキーがあれば、認証ファイルを見ずにその値をエージェントへ渡して TUI に進む。キーが空のときは、認証ファイルのサイズが 1 バイト以上のときだけ TUI に進み、apiKey は undefined を渡す。どちらも無い、またはファイルが 0 バイトなら終了コード 1 とし、標準エラーにログイン案内の 1 文だけを出す。bun src/main/login.ts は Cursor.auth.login() を呼び、失敗時は終了コード 1 と失敗の 1 文だけを出す。",
  answers: {},
  components: {
    Config: {
      kind: "modified",
      responsibility:
        "trim 後の CURSOR_API_KEY と、呼び出し元が渡した sdkAuthReady で起動してよいかを決める。認証ファイルは開かない。認証不足の標準エラー文言を返す。",
      files: ["src/config/index.ts"],
      asIs: "CURSOR_API_KEY が trim 後に空なら { kind: 'exit', code: 1 } を返し、stderr は付けない。ホームの認証ファイルは引数にも判定にも無い。",
    },
    Main: {
      kind: "modified",
      responsibility:
        "認証ファイルのサイズを調べて loadStartup に渡し、本番のエージェント生成では空のキーのとき apiKey を undefined にする。ログイン入口から Cursor.auth.login() を実行する。",
      files: ["src/main/index.ts", "src/main/login.ts", "src/main/sdk-auth.ts"],
      asIs: "src/main/index.ts だけが起動と Agent.create を持つ。apiKey は空文字を含む文字列を渡す。login.ts と sdk-auth.ts は無い。",
    },
  },
  dependencies: [{ from: "Main", to: "Config", label: "起動判定と認証不足の文言" }],
  interfaces: {
    loadStartup: {
      component: "Config",
      kind: "function",
      change: "modified",
      signature:
        "function loadStartup(cwd: string, env: { CURSOR_API_KEY?: string }, ghLogin: () => Promise<string | undefined>, sdkAuthReady: boolean): Promise<LoadStartupResult>",
      description:
        "trim 後に空でない CURSOR_API_KEY があれば sdkAuthReady を見ない。空のときは sdkAuthReady が true のときだけ設定ファイルの判定へ進む。false のときは { kind: 'exit', code: 1, stderr: 'Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください' } を返す。",
      compatibility:
        "呼び出し元は src/main/index.ts と src/config/index.test.ts だけである。第4引数を追加し、呼び出し元をすべて直す。旧シグネチャは残さない。",
    },
    createProductionPollingDeps: {
      component: "Main",
      kind: "function",
      change: "modified",
      signature:
        "function createProductionPollingDeps(cwd: string, apiKey: string | undefined): BuildPollingDeps",
      description:
        "apiKey が string のときは Agent.create にその文字列を渡す。undefined のときは apiKey: undefined を渡し、SDK の保存済み認証に任せる。",
      compatibility:
        "呼び出し元は src/main/index.ts の本番起動だけである。引数の型を string | undefined に変え、その1か所を直す。",
    },
    runLogin: {
      component: "Main",
      kind: "function",
      change: "new",
      signature:
        "function runLogin(deps?: { login?: () => Promise<void>; writeStderr?: (line: string) => void }): Promise<number>",
      description:
        "login が成功したら 0 を返す。失敗したら標準エラーに「Cursor へのログインに失敗しました」だけを書き、1 を返す。src/main/login.ts の import.meta.main から呼ぶ。",
    },
    sdkAuthReady: {
      component: "Main",
      kind: "function",
      change: "new",
      signature: "function sdkAuthReady(stat: (path: string) => Promise<{ size: number }>): Promise<boolean>",
      description:
        "homedir() の .cursor/sdk/auth.json を stat し、サイズが 1 バイト以上のときだけ true を返す。ファイルが無い、0 バイト、stat が失敗したときは false。中身は読まない。",
    },
  },
  dataModels: {},
  errorHandling: [
    {
      case: "CURSOR_API_KEY が trim 後に空で、認証ファイルが無いか 0 バイトである",
      handling:
        "終了コード 1。TUI は出さない。標準エラーには「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」だけを書く。キー値も stat の生エラーも出さない。",
      refs: ["FR-004", "AC-004", "AC-011"],
    },
    {
      case: "bun src/main/login.ts で Cursor.auth.login() が失敗する",
      handling:
        "終了コード 1。標準エラーには「Cursor へのログインに失敗しました」だけを書く。SDK の例外文は出さない。",
      refs: ["AC-012"],
    },
  ],
  impact: {
    create: ["src/main/login.ts", "src/main/login.test.ts", "src/main/sdk-auth.ts", "src/main/sdk-auth.test.ts"],
    modify: [
      "src/main/index.ts",
      "src/main/index.test.ts",
      "src/config/index.ts",
      "src/config/index.test.ts",
      "knip.json",
      "docs/sdd/adr/ADR-0002.ts",
    ],
  },
  decisions: [
    {
      title: "API キーは環境変数を優先し、無いときは SDK の認証ファイルを使う",
      decidedBy: "user",
      adr: true,
      context:
        "ADR-0002 は API キーを環境変数 CURSOR_API_KEY から読むと決めている。GH-7 の要件は、trim 後に空でなければそれを優先し、空なら ~/.cursor/sdk/auth.json が 1 バイト以上のとき起動すると決めた。要件の前提で、この拡張に合わせて ADR-0002 を更新する。",
      decision:
        "ADR-0002 の決定文を、trim 後に空でない CURSOR_API_KEY を優先し、空のときは SDK が保存した認証で起動する、に更新する。新しいパッケージは足さない。",
      alternatives: [
        {
          option: "環境変数が無いときは起動しないままにする",
          reason: "GH-7 の要件が、ログイン済みの認証ファイルでも起動すると決めたため",
        },
      ],
    },
    {
      title: "認証ファイルの stat は main が行い、config は真偽だけを受け取る",
      decidedBy: "ai",
      adr: false,
      context:
        "architecture.ts の config 層は、環境変数と設定ファイルだけを読む。認証ファイルの有無は起動判定に必要である。",
      decision:
        "src/main/sdk-auth.ts が homedir() の .cursor/sdk/auth.json を stat し、1 バイト以上かを loadStartup の sdkAuthReady に渡す。config はファイルを開かない。中身の JSON は見ない。",
      alternatives: [
        {
          option: "loadStartup の中で認証ファイルを stat する",
          reason: "config 層が設定ファイル以外のパスを読むことになるため",
        },
      ],
    },
    {
      title: "ログイン失敗と認証不足では、決めた日本語の1文以外を標準エラーに出さない",
      decidedBy: "ai",
      adr: false,
      context:
        "要件は、認証不足とログイン失敗の標準エラーをそれぞれ決めた1文にしている。SDK の例外文や stat のエラーには、利用者の秘密や余分な英文が混ざり得る。",
      decision:
        "どちらの失敗も、要件の文だけを1行書き、例外オブジェクトの message は書かない。狭い端末での折り返しは、こちらで切らず全文を書くことで端末に任せる。",
      alternatives: [
        {
          option: "SDK や stat のエラー文を後ろに足す",
          reason: "標準エラーが決めた1文でなくなるため",
        },
      ],
    },
  ],
  traceability: {
    "FR-001": ["Main"],
    "FR-002": ["Config", "Main"],
    "FR-003": ["Config", "Main"],
    "FR-004": ["Config", "Main"],
    "FR-005": ["Main"],
    "FR-006": ["Main"],
  },
  nfrStrategy: {},
  invariantStrategy: {
    "INV-001":
      "issue-runner.json の JSON 失敗の分岐と、標準エラー「設定ファイルを読めません: issue-runner.json」には手を入れない。認証不足の終了は、その分岐より前で返す。",
    "INV-002":
      "src/tui の設定項目は変えない。GitHub トークンの入力欄は足さない。gh のログイン名取得は fetchGhLogin のままにする。",
  },
  conventionsCompliance: {
    "CONV-001":
      "新しいファイルは src/main/login.ts と src/main/sdk-auth.ts。関数は runLogin と sdkAuthReady。環境変数名は CURSOR_API_KEY のまま。",
    "CONV-002":
      "認証不足とログイン失敗は終了コード 1 とし、利用者向けの文は要件の日本語だけにする。API キーの値は出さない。",
    "CONV-003": "ログ用ライブラリは足さない。失敗は標準エラーの1行だけにする。",
    "CONV-004":
      "テストは src/main/login.test.ts、src/main/sdk-auth.test.ts、および既存の src/config/index.test.ts と src/main/index.test.ts に足す。",
    "CONV-005": "該当しない: 設定画面と起動画面の部品、色、操作は変えない。",
    "CONV-007": "パッケージは足さない。実行は bun src/main/login.ts と既存の bun 起動のまま。",
    "CONV-008": "該当しない: 品質ゲートのコマンドと閾値は変えない。",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "起動の注入は src/main/index.ts の RunDeps、判定は src/config/index.ts の loadStartup に合わせた。新しいライブラリは無い。",
    },
    security: {
      result: "considered",
      note: "認証ファイルの中身は読まない。標準エラーは決めた文だけにし、API キーと SDK の例外文は出さない。GitHub トークン欄は足さない。",
    },
    dataIntegrity: {
      result: "notApplicable",
      note: "共有の保存データは変えない。認証ファイルは SDK の login が書き、このプロセスはサイズだけを見る。",
    },
    performance: {
      result: "considered",
      note: "起動のたびに認証ファイルを stat するのは1回だけである。キーが trim 後に空でないときは stat しない。",
    },
    observability: {
      result: "considered",
      note: "認証不足とログイン失敗は、それぞれ決めた日本語の1行を標準エラーに出す。それ以外の失敗理由は出さない。",
    },
    testability: {
      result: "considered",
      note: "sdkAuthReady は stat を引数で受け、runLogin は login と writeStderr を差し替える。ホームディレクトリの本物のファイルには触らない。",
    },
    rollback: {
      result: "considered",
      note: "設定ファイルの形は変えない。戻すときはこの変更のコミットを戻し、環境変数だけでも起動できる状態に戻る。",
    },
    sharedFiles: {
      result: "considered",
      note: "共有の変更は knip.json の entry に src/main/login.ts を足すことと、ADR-0002 の決定文だけである。package.json は変えない。",
    },
  },
  risks: [
    "architecture.ts の main モジュールのパスは src/main/index.ts のままである。src/main/login.ts は同じディレクトリの別入口なので、sdd-finish で architecture の記述を合わせる。",
    "ADR-0002 の現在の決定文は環境変数だけを読む。この設計で決定文を更新するまで、文書と実装が一時的にずれる。",
  ],
});
