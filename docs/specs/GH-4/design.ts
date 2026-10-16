import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

export default defineDesign<typeof requirements>()({
  overview:
    "渡されたチェックアウトで local agent を1件だけ動かし、プロンプトは /sdd-impl だけにする。実行結果は fast ではない composer-2.5 の JSON で質問か完了かに分ける。質問なら組になった質問と回答を順に同じエージェントへ送る。失敗ならプロセスを終了コード 1 で終える。起動経路からは呼ばない。",
  asIs:
    "src/main は起動画面を出すだけで、issue をポーリングしない。src/github の listQueuedIssues は agent:queued を番号の昇順で返す。src/work-branch の prepareWorkBranch は起動経路から呼ばれない。@cursor/sdk は package.json に無い。",
  toBe:
    "src/agent/index.ts の pollOnce が、実行中でなければ queued の先頭1件を local agent で実行する。完了の JSON のあとだけ次のポーリングで次の1件を始められる。ラベルと作業ブランチの準備は呼ばない。",
  answers: {
    "ANS-015": {
      about: { placement: ["src/agent/"] },
      question: "local agent の実行とポーリングの停止を、どのディレクトリに置きますか。",
      answer:
        "src/agent/ に置く。起動、設定、TUI、ラベル、作業ブランチの準備は変えず、それらからは呼ばない。knip の entry に src/agent/index.ts を足す。",
    },
  },
  components: {
    LocalAgent: {
      kind: "new",
      responsibility:
        "queued の issue を1件だけ local agent で実行し、質問なら回答を同じエージェントへ送り、失敗ならプロセスを終了する",
      files: ["src/agent/index.ts"],
      placement: { answer: "ANS-015" },
    },
  },
  dependencies: [],
  interfaces: {
    pollOnce: {
      component: "LocalAgent",
      kind: "function",
      change: "new",
      signature: `pollOnce(
  input: { repository: string; assignee: string; cwd: string },
  deps: {
    gh: GhRunner;
    running: { current: boolean };
    createAgent: (options: {
      cwd: string;
      settingSources: ["project"];
      modelId: "composer-2.5";
      fast: false;
    }) => Promise<LocalAgentSession>;
    writeStderr: (line: string) => void;
    exit: (code: number) => void;
  },
): Promise<{ ok: true } | { ok: false; exitCode: 1 }>`,
      description:
        "running が true のときはエージェントを起動しない。false のときは listQueuedIssues の先頭1件を、cwd で /sdd-impl として実行する。成功時は exit を呼ばない",
    },
  },
  dataModels: {},
  errorHandling: [
    {
      case: "spec 名が空である",
      handling: "プロンプトは /sdd-impl のまま送る。空の spec 名を理由に失敗にしない",
      refs: ["AC-036"],
    },
    {
      case: "起動が CursorAgentError で失敗した",
      handling:
        "プロセスを終了コード 1 で終える。標準エラーはその CursorAgentError の文。追加のプロンプトは送らない。次の issue は起動しない",
      refs: ["FR-009", "AC-033", "AC-034", "AC-015", "AC-030"],
    },
    {
      case: "run の result.status が error である",
      handling:
        "プロセスを終了コード 1 で終える。標準エラーはその実行中のエラー文。追加のプロンプトは送らない。次の issue は起動しない",
      refs: ["FR-009", "AC-032", "AC-016"],
    },
    {
      case: "判断の JSON が質問か完了の形でない",
      handling:
        "プロセスを終了コード 1 で終える。標準エラーは「判断の JSON を読めませんでした」。追加のプロンプトは送らない",
      refs: ["AC-039", "AC-040"],
    },
    {
      case: "質問への回答を生成できない",
      handling:
        "プロセスを終了コード 1 で終える。標準エラーは生成の失敗文。同じエージェントへ回答を送らない",
      refs: ["FR-010", "AC-035"],
    },
    {
      case: "判断が question である",
      handling:
        "失敗にしない。pairs の質問と回答を、配列の順に同じエージェントへ送ってから wait() する。標準エラーに失敗の文は出さない",
      refs: ["FR-010", "FR-011", "AC-020", "AC-037"],
    },
  ],
  impact: {
    create: ["src/agent/index.ts", "src/agent/index.test.ts"],
    modify: ["package.json", "knip.json"],
  },
  decisions: [
    {
      title: "エージェント実行に @cursor/sdk 1.0.37 を足す",
      decidedBy: "ai",
      context: "ローカル実行の SDK の版はすでに 1.0.37 と決まっている。package.json にはまだ無い",
      decision:
        "dependencies に @cursor/sdk 1.0.37 を足す。local.cwd は引数のチェックアウト、local.settingSources は [\"project\"]、モデルは composer-2.5 で fast を false にする。API キーは環境変数 CURSOR_API_KEY から読む",
      alternatives: [{ option: "クラウド実行を使う", reason: "チェックアウトは開発者のマシンにあり、プロセスもそこで動かす" }],
      adr: false,
    },
    {
      title: "作業ブランチの準備とラベル変更は呼ばない",
      decidedBy: "ai",
      context: "チェックアウトは要件の前提として渡される。ラベルとコメントはこの実行では変えない",
      decision:
        "prepareWorkBranch、beginRunning、applyOutcome は呼ばない。起動する issue は listQueuedIssues が返す昇順の先頭だけにする。一覧の失敗は listQueuedIssues の標準エラーに任せ、プロセスは終了しない",
      alternatives: [
        { option: "pollOnce から prepareWorkBranch を呼ぶ", reason: "チェックアウトは引数で渡される前提である" },
      ],
      adr: false,
    },
    {
      title: "質問か完了かは別の1回の判断で分ける",
      decidedBy: "ai",
      context: "完了は kind が done のまま。質問は ANS-016 のとおり、質問と回答の組を1件以上返す。/sdd-impl のプロンプトは変えない",
      decision:
        "実行が error でも CursorAgentError でもないとき、同じモデルの別エージェントに実行結果を渡して JSON だけを返させる。質問に推奨の選択肢があるときは、その選択肢を回答にする。kind が question のとき、pairs の各組を配列の順に元のエージェントへ送る。組が0件、question か answer が空なら判断の JSON を読めなかったものとして扱う。kind が done なら追加で送らない",
      alternatives: [
        { option: "実行中のエージェント自身に JSON を返させる", reason: "/sdd-impl のプロンプトを変えることになる" },
      ],
      adr: false,
    },
    {
      title: "local agent の実行は src/agent に置く",
      decidedBy: "user",
      answers: ["ANS-015"],
      context: "ラベルは src/github、作業ブランチの準備は src/work-branch にある。SDK の実行はそのどちらにも入らない",
      decision:
        "src/agent/ に置く。起動、設定、TUI、ラベル、作業ブランチの準備は変えず、それらからは呼ばない。knip の entry に src/agent/index.ts を足す",
      alternatives: [{ option: "src/github/ に足す", reason: "ラベル用のモジュールが SDK の実行も持つことになる" }],
      adr: true,
    },
  ],
  traceability: {
    "FR-001": ["LocalAgent"],
    "FR-002": ["LocalAgent"],
    "FR-003": ["LocalAgent"],
    "FR-004": ["LocalAgent"],
    "FR-005": ["LocalAgent"],
    "FR-008": ["LocalAgent"],
    "FR-009": ["LocalAgent"],
    "FR-010": ["LocalAgent"],
    "FR-011": ["LocalAgent"],
    "FR-013": ["LocalAgent"],
    "FR-014": ["LocalAgent"],
  },
  nfrStrategy: {},
  invariantStrategy: {
    "INV-001": "src/main、src/config、src/tui、src/github、src/work-branch は変更しない。pollOnce を run から呼ばない",
  },
  conventionsCompliance: {
    "CONV-001": "src/agent/index.ts に pollOnce を置く。型名は PascalCase、関数は camelCase",
    "CONV-002":
      "起動前と実行中の失敗は、要件で決めた失敗の文を標準エラーに出して exit(1) する。判断の JSON が読めないときは「判断の JSON を読めませんでした」。API キーそのものは組み立てない",
    "CONV-003": "出力は writeStderr の1行だけにする。ログ用のライブラリは足さない",
    "CONV-004": "テストは src/agent/index.test.ts。ランナーは bun test。SDK と gh は差し替える",
    "CONV-005": "該当しない: 画面の描画を変えない",
    "CONV-007": "パッケージの追加は bun で @cursor/sdk 1.0.37 だけを足す。他の lock ファイルは置かない",
    "CONV-008": "品質ゲートの閾値とコマンドは変えない",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "gh の列挙は listQueuedIssues に任せた。SDK は差し替える関数にする",
    },
    security: {
      result: "considered",
      note: "API キーは環境変数から SDK に渡す。標準エラーにキーを組み立てて出さない。AC-034 の失敗文は要件どおり出す",
    },
    dataIntegrity: {
      result: "considered",
      note: "ラベル、コメント、作業ブランチは変えない。実行中の印はメモリだけである",
    },
    performance: {
      result: "considered",
      note: "1回のポーリングで起動するエージェントは1件までである",
    },
    observability: {
      result: "considered",
      note: "失敗の理由は標準エラーの1行で分かる。成功時は追加の出力をしない",
    },
    testability: {
      result: "considered",
      note: "createAgent、gh、writeStderr、exit、running を引数で差し替える。テストは src/agent/index.test.ts",
    },
    rollback: {
      result: "considered",
      note: "保存データの移行は無い。戻すときは src/agent と依存パッケージと knip の entry を戻せばよい",
    },
    sharedFiles: {
      result: "considered",
      note: "共有の変更は package.json の依存追加と knip.json の entry 追加だけである",
    },
  },
  risks: [
    "architecture.ts はまだ src/agent をモジュールに書いていない。sdd-finish で追記する",
    "fast を false にする SDK のパラメータ名は、実装時に Cursor.models.list の定義に合わせる",
    "判断用の別エージェントがファイルを変更し得る。プロンプトでは JSON だけを返すよう求める",
    "pollOnce は run から呼ばない。起動画面を出しただけではポーリングは始まらない",
  ],
});
