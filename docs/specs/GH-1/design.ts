import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

// 設計（docs/specs/GH-1/design.ts）。
// 書き方: docs/sdd/guides/writing-design.md
export default defineDesign<typeof requirements>()({
  overview:
    "起動は src/main/index.ts が設定の読み込みと TUI をつなぐ。設定の判定と issue-runner.json の読み書きは src/config/index.ts、設定画面と起動画面は src/tui/index.ts が行う。入力の判定には zod 4.6.7 を使い、品質ゲートは受け入れ済みのツールをリポジトリ直下の設定で動かす。",
  asIs: "新規作成。src も package.json も無い。docs/sdd の道具と恒久ドキュメントだけがある。",
  toBe:
    "カレントディレクトリの issue-runner.json と環境変数 CURSOR_API_KEY で起動し、設定画面か起動画面を出す。issue の取得、ラベル更新、エージェントの実行はしない。品質ゲートのコマンドを docs/sdd/config.ts に登録する。",
  answers: {
    "ANS-073": {
      about: { placement: ["src/main/", "src/config/", "src/tui/"] },
      question:
        "起動、設定、TUI のソースはどのディレクトリに置きますか。architecture.ts の modules は src/main.ts、src/config.ts、src/tui.ts というファイルパスを書いています。summary、layers、notes と accepted の ADR は、ディレクトリ src/ を置き場所としては書いていません。",
      answer: "src/main/、src/config/、src/tui/ に分ける",
    },
  },
  components: {
    main: {
      kind: "new",
      responsibility:
        "API キー、設定ファイル、gh のログイン名を順に見て、設定画面か起動画面を出す。終了コードを決める",
      files: ["src/main/index.ts"],
      placement: { answer: "ANS-073" },
    },
    config: {
      kind: "new",
      responsibility:
        "issue-runner.json の読み書きと、repository、interval、model、assignee、CURSOR_API_KEY の判定。gh からログイン名を取る",
      files: ["src/config/index.ts"],
      placement: { answer: "ANS-073" },
    },
    tui: {
      kind: "new",
      responsibility:
        "設定画面と起動画面を @opentui/core で描く。設定の中身は引数で受け取り、config を import しない",
      files: ["src/tui/index.ts"],
      placement: { answer: "ANS-073" },
    },
  },
  dependencies: [
    { from: "main", to: "config", label: "設定の読み書きと判定を呼ぶ" },
    { from: "main", to: "tui", label: "設定画面と起動画面を出す" },
  ],
  interfaces: {
    loadStartup: {
      component: "config",
      kind: "function",
      change: "new",
      signature:
        "loadStartup(cwd: string, env: { CURSOR_API_KEY?: string }, ghLogin: () => Promise<string | undefined>): Promise<{ kind: 'exit'; code: 1; stderr?: string } | { kind: 'settings'; draft: SettingsDraft } | { kind: 'main'; config: AppConfig }>",
      description:
        "API キーを trim し、空なら終了コード 1 で画面を出さない。JSON として読めなければ終了コード 1 と標準エラー「設定ファイルを読めません: issue-runner.json」。ファイルが無い、または repository、assignee、model が起動画面に出せないときは設定画面の初期値を返す。そろっていれば起動画面用の設定を返す",
    },
    saveConfig: {
      component: "config",
      kind: "function",
      change: "new",
      signature:
        "saveConfig(cwd: string, input: SettingsDraft): Promise<{ ok: true; config: AppConfig } | { ok: false; field?: 'repository' | 'interval' | 'model' | 'assignee'; message: string }>",
      description:
        "前後の空白を除いて判定し、通れば issue-runner.json に repository、interval、model、assignee を書く。書けなければ message は「設定ファイルを書けません: issue-runner.json」",
    },
    runSettings: {
      component: "tui",
      kind: "function",
      change: "new",
      signature:
        "runSettings(draft: SettingsDraft, submit: (draft: SettingsDraft) => Promise<{ ok: true } | { ok: false; message: string }>): Promise<'saved' | 'cancel'>",
      description:
        "repository、interval、model、assignee の順に入力欄を出す。Enter で submit を呼ぶ。q は文字として入れる。Ctrl+C はファイルを書かず 'cancel' を返す",
    },
    runMain: {
      component: "tui",
      kind: "function",
      change: "new",
      signature:
        "runMain(view: { repository: string; intervalLabel: string; model: string; assignee: string; status: string; quitKey: string }): Promise<'quit'>",
      description:
        "上段に repository、intervalLabel、model、assignee、中段に status、下段に quitKey を、幅を超えたら折り返して出す。改行があればその位置で行を分ける。q と Ctrl+C で 'quit' を返す。通常の起動では status は「待機中」、quitKey は q",
    },
  },
  dataModels: {
    AppConfig: {
      kind: "new",
      description: "起動画面に出す、判定済みの設定。チェックアウトのパスとブランチは持たない",
      definition:
        "type AppConfig = { repository: string; interval: number; model: string; assignee: string };",
    },
    SettingsDraft: {
      kind: "new",
      description: "設定画面の入力欄。interval は分の文字列、空の model と assignee は既定を入れた状態で渡す",
      definition:
        "type SettingsDraft = { repository: string; interval: string; model: string; assignee: string };",
    },
    IssueRunnerJson: {
      kind: "new",
      description: "カレントディレクトリの issue-runner.json。キーは repository、interval、model、assignee。interval は分の整数",
      definition:
        '{ "repository": "acme/widgets", "interval": 1, "model": "composer-2.5", "assignee": "octocat" }',
    },
  },
  errorHandling: [
    {
      case: "CURSOR_API_KEY が無い、空、空白だけ",
      handling: "終了コード 1 でプロセスを終える。TUI も設定画面も出さない。キーの値は標準エラーにも出さない",
      refs: ["FR-003", "AC-004", "AC-009", "AC-020"],
    },
    {
      case: "issue-runner.json が JSON として読めない",
      handling: "終了コード 1。画面は出さず、標準エラーへ「設定ファイルを読めません: issue-runner.json」だけを出す",
      refs: ["FR-012", "AC-018"],
    },
    {
      case: "repository が無い、空、空白だけ、改行を含む",
      handling: "起動画面に進まず設定画面を開く。Enter 時はファイルを書かず、空なら「repository を入力してください」、形が違えば「repository は owner/repo の形で入力してください」",
      refs: ["FR-013", "FR-030", "FR-031", "AC-022", "AC-035", "AC-057", "AC-078", "AC-080"],
    },
    {
      case: "assignee が無い、空、空白だけ、改行を含む、ユーザー名として不正",
      handling:
        "起動画面に進まず設定画面を開く。gh がログイン名を返せれば入力欄に出し、返せなければ空にする。Enter 時は空なら「assignee を入力してください」、不正なら「assignee は GitHub のユーザー名で入力してください」",
      refs: ["FR-022", "FR-033", "FR-034", "FR-041", "AC-041", "AC-042", "AC-045", "AC-059", "AC-062", "AC-084", "AC-086", "AC-101"],
    },
    {
      case: "interval が 1 未満、小数、半角数字以外",
      handling:
        "ファイルを書かず設定画面に留まる。1 未満は「interval は 1分 以上にしてください」、小数は「interval は整数で入力してください」、半角数字以外は「interval は半角数字で入力してください」",
      refs: ["FR-017", "FR-018", "FR-024", "AC-029", "AC-032", "AC-050"],
    },
    {
      case: "model の途中に改行がある、または空文字",
      handling:
        "起動画面に出さない。空文字なら設定画面の入力欄に composer-2.5 を出す。途中の改行は設定画面に留まり「model に改行は使えません」と出す",
      refs: ["FR-036", "FR-037", "AC-068", "AC-090", "AC-092"],
    },
    {
      case: "issue-runner.json をディスクに書けない",
      handling: "設定画面に留まり「設定ファイルを書けません: issue-runner.json」と出す。プロセスは終了しない",
      refs: ["FR-023", "AC-047"],
    },
  ],
  impact: {
    create: [
      "package.json",
      "bun.lock",
      "biome.json",
      ".dependency-cruiser.cjs",
      "knip.json",
      ".jscpd.json",
      "src/main/index.ts",
      "src/config/index.ts",
      "src/tui/index.ts",
      "src/config/index.test.ts",
      "src/tui/index.test.ts",
    ],
    modify: ["docs/sdd/config.ts", "docs/sdd/conventions.ts"],
  },
  decisions: [
    {
      title: "入力の判定に zod 4.6.7 を使う",
      decidedBy: "user",
      context:
        "要件は判定を zod の文字列に合わせると決めている。zod は accepted の ADR に無く、新しいライブラリになる。npm の最新安定版は 4.6.7 である",
      decision: "zod 4.6.7 を依存に入れる。前後の空白の除去と文字列の判定は、この版の z.string().trim() を使う",
      alternatives: [
        {
          option: "zod 3 系",
          reason: "API が古く、要件が合わせる仕様とずれるため",
        },
        {
          option: "判定を自前の関数だけで書く",
          reason: "要件が zod の文字列に合わせると決めているため",
        },
      ],
      adr: true,
    },
    {
      title: "起動と設定と TUI を src/ に置く",
      decidedBy: "user",
      answers: ["ANS-073"],
      context:
        "architecture.ts の modules は各ファイルのパスを書くが、summary、layers、notes と accepted の ADR はディレクトリ src/ を置き場所として書いていない",
      decision: "src/main/index.ts、src/config/index.ts、src/tui/index.ts に分ける",
      alternatives: [
        {
          option: "src/main.ts、src/config.ts、src/tui.ts を src/ に置く",
          reason: "ディレクトリに分ける回答だったため",
        },
      ],
      adr: true,
    },
    {
      title: "品質ゲートは受け入れ済みの版のまま導入する",
      decidedBy: "ai",
      context: "issue と、品質ゲートを決めた accepted の記録が、ツールと版と閾値を決めている",
      decision:
        "Biome 2.5.15、dependency-cruiser 18.6.0、@swc/core 1.16.18、Knip 6.41.0、jscpd 5.4.1、TypeScript 7.0.2 を devDependency にする。docs/sdd/config.ts の commands.format は bunx biome check --write .、commands.check は bunx biome check . && bun --check && bunx depcruise src --config .dependency-cruiser.cjs && bunx knip && bunx jscpd src、commands.test は bun test。package.json の script 名に check は置かない。e2e は登録しない",
      alternatives: [
        {
          option: "package.json に check という script を置く",
          reason: "bun check が型検査ではなくなるため",
        },
      ],
      adr: false,
    },
    {
      title: "@cursor/sdk はこの issue の依存に入れない",
      decidedBy: "ai",
      context:
        "エージェント実行の accepted の記録は @cursor/sdk 1.0.37 を手段にし、この issue では実行そのものを作らないと書いている。未使用の依存は Knip が失敗させる",
      decision: "この issue では @cursor/sdk を package.json に入れない。エージェントを作る issue で入れる",
      alternatives: [
        {
          option: "未使用のまま依存に入れる",
          reason: "Knip が未使用の依存を失敗させるため",
        },
      ],
      adr: false,
    },
    {
      title: "モジュール依存の規約だけ enforcedBy を gate にする",
      decidedBy: "ai",
      context:
        "issue は、導入したツールで強制できる規約の enforcedBy を gate に変えると書いている。dependency-cruiser はモジュールの依存を検査できる。日本語の文言、終了コード、画面の骨組みは、導入するツールの規則にならない",
      decision:
        "モジュール依存の規約の enforcedBy を gate にする。dependency-cruiser で、config は main と tui に依存しない、tui は config を import しない、@opentui/core を import できるのは src/tui/index.ts だけ、と書く。命名、エラー処理、ログ、テスト、TUI、パッケージマネージャ、品質ゲートの手順の規約は manual のままにする",
      alternatives: [
        {
          option: "命名の規約も Biome の命名規則で gate にする",
          reason: "環境変数名だけ大文字のスネークケースにする例外を、同じ規約のまま機械的に表せないため",
        },
      ],
      adr: false,
    },
  ],
  traceability: {
    "FR-001": ["main", "tui"],
    "FR-002": ["config", "main"],
    "FR-003": ["config", "main"],
    "FR-004": ["tui", "main"],
    "FR-005": ["config"],
    "FR-006": ["main", "config", "tui"],
    "FR-007": ["tui", "main"],
    "FR-008": ["tui", "main"],
    "FR-009": ["tui"],
    "FR-010": ["tui", "main"],
    "FR-011": ["tui", "main"],
    "FR-012": ["config", "main"],
    "FR-013": ["config", "main", "tui"],
    "FR-014": ["config", "tui"],
    "FR-015": ["config", "tui"],
    "FR-016": ["config", "tui"],
    "FR-017": ["config", "tui"],
    "FR-018": ["config", "tui"],
    "FR-019": ["config", "tui"],
    "FR-021": ["config", "tui"],
    "FR-022": ["config", "tui"],
    "FR-023": ["config", "tui"],
    "FR-024": ["config", "tui"],
    "FR-025": ["config", "tui"],
    "FR-026": ["config", "tui"],
    "FR-027": ["config", "tui"],
    "FR-028": ["config", "main"],
    "FR-029": ["tui"],
    "FR-030": ["config", "main", "tui"],
    "FR-031": ["config", "main", "tui"],
    "FR-032": ["tui"],
    "FR-033": ["config", "main", "tui"],
    "FR-034": ["config", "main", "tui"],
    "FR-035": ["tui"],
    "FR-036": ["config", "main", "tui"],
    "FR-037": ["config", "main", "tui"],
    "FR-038": ["tui"],
    "FR-039": ["tui"],
    "FR-040": ["tui"],
    "FR-041": ["config", "main", "tui"],
  },
  nfrStrategy: {},
  invariantStrategy: {},
  conventionsCompliance: {
    "CONV-001":
      "ファイル名は src/main/index.ts、src/config/index.ts、src/tui/index.ts と、隣の src/config/index.test.ts、src/tui/index.test.ts。関数と変数は camelCase、型は PascalCase。環境変数名は CURSOR_API_KEY だけ大文字のスネークケース",
    "CONV-002":
      "API キーが無いときと JSON が読めないときは例外にせず、loadStartup の kind: 'exit' で終了コード 1 にする。利用者向けの文は要件の日本語にする。API キーの値は画面にも標準エラーにも出さない",
    "CONV-003":
      "ログ用のライブラリは入れない。出せるのは標準出力と標準エラーだけ。API キーは出さない。読めない JSON のときだけ標準エラーへ決まった文を出す",
    "CONV-004":
      "src/config/index.test.ts で設定の読み書きを bun test する。src/tui/index.test.ts で @opentui/core/testing の createTestRenderer のフレームを bun test のスナップショットと比べる",
    "CONV-005":
      "描画は src/tui/index.ts だけが行う。部品は @opentui/core だけ。色は端末の既定、強調は太字、幅は端末に合わせる。上段に設定、中段に状態、下段に終了キーを置く。操作はキーボードだけ",
    "CONV-006":
      "src/main/index.ts だけが src/config/index.ts と src/tui/index.ts を import する。src/tui/index.ts は設定を引数で受け取り、src/config/index.ts を import しない。src/config/index.ts は main と tui を import しない。@opentui/core の import は src/tui/index.ts だけ。この境界を .dependency-cruiser.cjs に書き、モジュール依存の規約の enforcedBy を gate にし、規約のパスもこのファイルに合わせる",
    "CONV-007": "依存の追加は bun add だけを使う。package-lock.json、yarn.lock、pnpm-lock.yaml は置かない。bun.lock だけを置く",
    "CONV-008":
      "commands.format は bunx biome check --write .。commands.check は bunx biome check . と bun --check と dependency-cruiser と knip と jscpd。commands.test は bun test。package.json の script 名は check にしない。Biome の閾値は認知的複雑度 12、関数本体 60 行、引数 4。jscpd は閾値 0% で、5 行または 50 トークン未満は見ない",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "ファイル名と依存の向きは命名とモジュール依存の規約に合わせた。新しい画面ライブラリは足さず、TUI は @opentui/core だけを src/tui/index.ts から使う",
    },
    security: {
      result: "considered",
      note: "CURSOR_API_KEY は loadStartup が環境変数から読み、空なら終了コード 1。値は画面と標準エラーに出さない。GitHub のトークンは読まず、ログイン名は gh の実行結果だけを使う",
    },
    dataIntegrity: {
      result: "considered",
      note: "issue-runner.json は saveConfig が判定を通したときだけ書く。書けないときはファイルを残して設定画面に留まる。同時に動かすプロセスは想定しない",
    },
    performance: {
      result: "notApplicable",
      note: "起動時に設定ファイルを1回読むだけで、一覧も繰り返しの取得も無い",
    },
    observability: {
      result: "considered",
      note: "ログ用ライブラリは置かない。JSON が読めないときだけ標準エラーへ決まった文を出す。API キーは出さない",
    },
    testability: {
      result: "considered",
      note: "loadStartup は gh のログイン名取得を引数で受け取る。runMain は status と quitKey を引数で受け、改行を含む表示を src/tui/index.test.ts から渡せる。設定のテストは src/config/index.test.ts",
    },
    rollback: {
      result: "considered",
      note: "データベースもマイグレーションも無い。戻すときはこのブランチの変更を戻す。既存の issue-runner.json はまだ無い",
    },
    sharedFiles: {
      result: "considered",
      note: "共有で変えるのは docs/sdd/config.ts の commands と docs/sdd/conventions.ts の CONV-006 だけ。ルーティングと DI は無い",
    },
  },
  risks: [
    "architecture.ts の config の責務は、ローカルのチェックアウトも読むと書いている。要件はパスもブランチも持たない。実装は要件に合わせ、architecture.ts は sdd-finish で直す",
    "architecture.ts のモジュールのパスは src/main.ts、src/config.ts、src/tui.ts である。置き場所の回答は src/main/、src/config/、src/tui/ なので、実装のパスは index.ts になる。architecture.ts は sdd-finish で直す",
    "@cursor/sdk は ADR-0002 の手段だが、この issue では未使用になるため依存に入れない。エージェントを作る issue で入れる",
  ],
});
