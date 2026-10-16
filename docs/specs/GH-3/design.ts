import { defineDesign } from "../../sdd/schema/mod.ts";
import type requirements from "./requirements.ts";

export default defineDesign<typeof requirements>()({
  overview:
    "起動したディレクトリの docs/sdd/config.ts を文字列として読み、spec 名を決める。origin のブランチがちょうど1つなら git checkout し、失敗なら src/github の applyOutcome で agent:failed とコメントを残して終了コード 1 で終わる。起動経路からは呼ばない。",
  asIs:
    "src/github/index.ts の applyOutcome が、失敗時にラベルを agent:failed にしてから理由のコメントを付ける。失敗は { ok: false } だけで、ラベルとコメントのどちらで失敗したかは返さない。spec 名と git checkout は無い。src/main は起動時にポーリングしない。",
  toBe:
    "src/work-branch/index.ts の prepareWorkBranch が spec 名、origin のブランチ選択、checkout、終了コードと標準エラーを担う。ラベルとコメントは applyOutcome に任せ、失敗段階が分かるように戻り値を足す。成功時はラベルもコメントも変えず、プロセスは終了しない。",
  answers: {
    "ANS-020": {
      about: { placement: ["src/work-branch/"] },
      question: "spec 名の決定と作業ブランチのチェックアウトを、どのディレクトリに置きますか。",
      answer:
        "src/work-branch/ に置く。起動、設定、TUI は変えず、ラベルとコメントは src/github/ のままにする。knip の entry に src/work-branch/index.ts を足す。",
    },
    "ANS-021": {
      about: { link: [["src/work-branch/"], ["src/github/"]] },
      question: "作業ブランチの準備は、ラベルとコメントを src/github の applyOutcome に任せますか。",
      answer: "src/work-branch/ が src/github/ の applyOutcome を呼ぶ。",
    },
  },
  components: {
    WorkBranch: {
      kind: "new",
      responsibility:
        "起動ディレクトリから spec 名を決め、origin の該当ブランチが1つのときだけ checkout する。失敗時は終了コード 1 と標準エラーを出す",
      files: ["src/work-branch/index.ts"],
      placement: { answer: "ANS-020" },
    },
    GithubIssueState: {
      kind: "modified",
      responsibility: "agent:failed のラベルと失敗コメントを付け、ラベルとコメントのどちらで失敗したかを返す",
      files: ["src/github/index.ts"],
      asIs: "applyOutcome は失敗を { ok: false } だけ返す。failed のとき、ラベルのあとにコメントを付ける",
    },
  },
  dependencies: [
    {
      from: "WorkBranch",
      to: "GithubIssueState",
      label: "agent:failed と失敗コメント",
      basis: { answer: "ANS-021" },
    },
  ],
  interfaces: {
    prepareWorkBranch: {
      component: "WorkBranch",
      kind: "function",
      change: "new",
      signature: `prepareWorkBranch(
  input: { repository: string; issueNumber: number; title: string; body: string },
  deps: {
    gh: GhRunner;
    git: (argv: string[]) => Promise<{ ok: true; stdout: string } | { ok: false; stderr: string }>;
    readText: (path: string) => Promise<{ ok: true; text: string } | { ok: false; missing: boolean }>;
    cwd: string;
    writeStderr: (line: string) => void;
    exit: (code: number) => void;
  },
): Promise<{ ok: true; specName: string; branch: string } | { ok: false; exitCode: 1 }>`,
      description:
        "cwd の docs/sdd/config.ts から spec 名を決める。成功時は checkout したブランチ名を返し、exit は呼ばない。失敗時は writeStderr に理由の1行を渡し、exit(1) を呼ぶ",
    },
    applyOutcome: {
      component: "GithubIssueState",
      kind: "function",
      change: "modified",
      signature: `applyOutcome(
  repository: string,
  issueNumber: number,
  outcome: { type: "done" } | { type: "failed"; reason: string } | { type: "retryable"; reason: string },
  deps: { run: GhRunner },
): Promise<{ ok: true } | { ok: false; step: "label" | "comment" | "list" }>`,
      description:
        "failed の reason が空でなければ、その文字列をコメント本文にする。ラベル更新の失敗は step が label、その後のコメント失敗は comment である",
      compatibility:
        "呼び出しは src/github のテストだけである。成功の { ok: true } は維持する。失敗に step を足し、{ ok: false } だけを見ているテストは step も比較するよう直す",
    },
  },
  dataModels: {},
  errorHandling: [
    {
      case: "該当する origin のブランチが0件、または2件以上である",
      handling:
        "checkout しない。applyOutcome の failed に、0件なら「該当する作業ブランチがありません」、複数なら「該当する作業ブランチが複数あります」を渡す。その後 exit(1) と、同じ1行の標準エラー",
      refs: ["FR-005", "FR-006", "FR-012", "FR-013", "FR-019", "AC-008", "AC-011", "AC-024"],
    },
    {
      case: "docs/sdd/config.ts が無い",
      handling:
        "checkout しない。applyOutcome の failed に「docs/sdd/config.ts がありません」を渡し、exit(1) と、同じ1行の標準エラー",
      refs: ["FR-009", "FR-010", "FR-011", "FR-019"],
    },
    {
      case: "git の一覧取得、または checkout が失敗した",
      handling:
        "ブランチは動かさない。applyOutcome の failed に「作業ブランチを用意できませんでした」を渡す。標準エラーもその1行で、git の stderr は出さない。exit(1)",
      refs: ["FR-020", "FR-021", "AC-041"],
    },
    {
      case: "ラベルを agent:failed に更新できない",
      handling: "exit(1)。標準エラーは「ラベルを更新できませんでした」の1行。gh の失敗文は出さない",
      refs: ["FR-015", "FR-016"],
    },
    {
      case: "失敗コメントを付けられない",
      handling: "exit(1)。標準エラーは「コメントを付けられませんでした」の1行。gh の失敗文は出さない",
      refs: ["FR-017", "FR-018"],
    },
    {
      case: "設定ファイルが読めないが、ファイルが無いわけではない",
      handling: "git の失敗と同じく、ブランチは動かさず agent:failed と「作業ブランチを用意できませんでした」で終了する",
    },
  ],
  impact: {
    create: ["src/work-branch/index.ts", "src/work-branch/index.test.ts"],
    modify: ["src/github/index.ts", "src/github/apply-outcome.test.ts", "knip.json"],
  },
  decisions: [
    {
      title: "設定ファイルは文字列として読む",
      decidedBy: "ai",
      context: "spec 名には issueIdPrefix の文字列だけが要る。対象チェックアウトの設定ファイルを実行すると、そのファイルの依存まで読み込む",
      decision:
        "docs/sdd/config.ts をテキストで読み、issueIdPrefix の文字列リテラルを取り出す。前後の空白を除き、定義が無い、空、空白だけなら spec 名は issue 番号だけにする。リテラルでなければ、接頭辞は無いものとして扱う",
      alternatives: [
        { option: "対象の設定ファイルを import する", reason: "対象リポジトリの依存や副作用を起動時に実行することになる" },
      ],
      adr: false,
    },
    {
      title: "ブランチ操作は git コマンドに任せる",
      decidedBy: "ai",
      context: "origin のブランチ名と checkout が要る。新しいパッケージは要件に無い",
      decision:
        "依存パッケージは足さない。一覧は git ls-remote --heads origin、切り替えは git checkout を、起動ディレクトリで実行する。テストは git 関数を差し替える",
      alternatives: [
        { option: "git 用のライブラリを足す", reason: "コマンドの入出力で足り、依存を増やす理由が無い" },
        { option: "git branch -r の追跡ブランチだけを見る", reason: "取得していないリモートの状態とずれる" },
      ],
      adr: false,
    },
    {
      title: "applyOutcome の失敗段階を返す",
      decidedBy: "ai",
      context: "ラベル更新の失敗とコメントの失敗で、標準エラーの文が違う。いまの戻り値では区別できない",
      decision: "失敗の戻り値に step を足す。failed では label か comment、一覧の取得に失敗したときは list",
      alternatives: [
        { option: "src/work-branch で gh のラベル操作を書き直す", reason: "src/github と同じ付け替えが二重になる" },
      ],
      adr: false,
    },
    {
      title: "作業ブランチの準備は src/work-branch に置く",
      decidedBy: "user",
      answers: ["ANS-020"],
      context: "ラベル遷移の置き場所は src/github と決まっている。spec 名と checkout はその責務に入らない",
      decision:
        "src/work-branch/ に置く。起動、設定、TUI は変えず、ラベルとコメントは src/github/ のままにする。knip の entry に src/work-branch/index.ts を足す",
      alternatives: [{ option: "src/github/ に足す", reason: "ラベル用のモジュールが git checkout も持つことになる" }],
      adr: true,
    },
    {
      title: "ラベルとコメントは applyOutcome に任せる",
      decidedBy: "user",
      answers: ["ANS-021"],
      context: "失敗の段階で標準エラーの文が違う。ラベルの付け替えを2か所に書かない",
      decision: "src/work-branch/ が src/github/ の applyOutcome を呼ぶ。失敗の戻り値に、ラベルかコメントかを足す",
      alternatives: [{ option: "src/work-branch/ でラベルとコメントを別に実装する", reason: "同じ付け替えが二重になる" }],
      adr: true,
    },
  ],
  traceability: {
    "FR-001": ["WorkBranch"],
    "FR-002": ["WorkBranch"],
    "FR-003": ["WorkBranch"],
    "FR-004": ["WorkBranch"],
    "FR-005": ["WorkBranch"],
    "FR-006": ["WorkBranch", "GithubIssueState"],
    "FR-007": ["WorkBranch"],
    "FR-008": ["WorkBranch"],
    "FR-009": ["WorkBranch"],
    "FR-010": ["WorkBranch", "GithubIssueState"],
    "FR-011": ["WorkBranch", "GithubIssueState"],
    "FR-012": ["WorkBranch", "GithubIssueState"],
    "FR-013": ["WorkBranch", "GithubIssueState"],
    "FR-014": ["WorkBranch"],
    "FR-015": ["WorkBranch", "GithubIssueState"],
    "FR-016": ["WorkBranch"],
    "FR-017": ["WorkBranch", "GithubIssueState"],
    "FR-018": ["WorkBranch"],
    "FR-019": ["WorkBranch"],
    "FR-020": ["WorkBranch", "GithubIssueState"],
    "FR-021": ["WorkBranch", "GithubIssueState"],
  },
  nfrStrategy: {},
  invariantStrategy: {
    "INV-001": "src/main、src/config、src/tui は変更しない。prepareWorkBranch を run から呼ばない",
  },
  conventionsCompliance: {
    "CONV-001": "src/work-branch/index.ts に prepareWorkBranch を置く。型名は PascalCase、関数は camelCase",
    "CONV-002":
      "失敗の標準エラーは決めた日本語の1行にする。gh と git の失敗文は出さない。終了は注入した exit(1) で、API キーは扱わない",
    "CONV-003": "出力は writeStderr の1行だけにする。ログ用のライブラリは足さない",
    "CONV-004": "テストは src/work-branch/index.test.ts と、変更する src/github/apply-outcome.test.ts。ランナーは bun test。git と gh は差し替える",
    "CONV-005": "該当しない: 画面の描画を変えない",
    "CONV-007": "該当しない: パッケージを足さない",
    "CONV-008": "品質ゲートの閾値とコマンドは変えない",
  },
  checklist: {
    conventions: {
      result: "considered",
      note: "gh の呼び出し方と、差し替えるランナーは src/github/index.ts に合わせた。git も同じ形の関数にする",
    },
    security: {
      result: "considered",
      note: "設定ファイルは実行しない。gh と git の失敗文は標準エラーに出さない。AC-032、AC-034、AC-041",
    },
    dataIntegrity: {
      result: "considered",
      note: "applyOutcome はラベルの成功後にコメントを付ける。コメント失敗時は step が comment で、ラベルは failed のまま終了する",
    },
    performance: {
      result: "considered",
      note: "origin の heads を1回取り、該当が1つのときだけ checkout を1回行う",
    },
    observability: {
      result: "considered",
      note: "失敗の理由は標準エラーの1行と、付けられた GitHub コメントで分かる",
    },
    testability: {
      result: "considered",
      note: "gh、git、readText、writeStderr、exit を引数で差し替える。テストは src/work-branch/index.test.ts",
    },
    rollback: {
      result: "considered",
      note: "設定や保存データの移行は無い。戻すときは追加したファイルと knip の entry を戻せばよい",
    },
    sharedFiles: {
      result: "considered",
      note: "共有の変更は knip.json の entry 追加と、src/github/index.ts の失敗の戻り値だけである",
    },
  },
  risks: [
    "architecture.ts はまだ src/work-branch をモジュールに書いていない。sdd-finish で追記する",
    "issueIdPrefix が文字列リテラルでない設定は、接頭辞が無いものとして扱う",
    "ラベルの更新に成功しコメントだけ失敗すると、agent:failed のままプロセスが終了する",
  ],
});
