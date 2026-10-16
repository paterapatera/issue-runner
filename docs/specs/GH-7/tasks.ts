import { defineTasks } from "../../sdd/schema/mod.ts";
import type design from "./design.ts";
import type requirements from "./requirements.ts";

export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "起動判定に sdkAuthReady と認証不足の文言を足す",
      kind: "test",
      description:
        "src/config/index.ts の loadStartup に第4引数 sdkAuthReady を足す。trim 後に空でない CURSOR_API_KEY のときは従来どおり設定ファイルの判定へ進む。空のときは sdkAuthReady が false なら { kind: 'exit', code: 1, stderr: 'Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください' } を返す。src/main/sdk-auth.ts に sdkAuthReady(stat) を作り、homedir() の .cursor/sdk/auth.json のサイズが 1 バイト以上のときだけ true、無い・0バイト・stat 失敗は false とし、中身は読まない。src/main/index.ts の loadStartup 呼び出しにその結果を渡す。src/config/index.test.ts で空文字・空白のみ・sdkAuthReady false の終了と文言（AC-004、AC-008、AC-011）を実行して観測する。src/main/sdk-auth.test.ts で 0 バイトと 1 バイトと欠落を stat の差し替えで観測する。JSON が読めないときの「設定ファイルを読めません: issue-runner.json」の既存テストは文言を変えずに残す（INV-001）。既存の「stderr なし」期待は、認証不足の新しい文言に更新する。",
      refs: ["FR-002", "FR-003", "FR-004", "INV-001", "Config", "Main"],
      verifies: ["AC-004", "AC-008", "AC-011", "INV-001"],
      status: "done",
    },
    "T-002": {
      title: "エージェントへ渡す API キーを環境変数優先にする",
      kind: "test",
      description:
        "src/main/index.ts の createProductionPollingDeps の apiKey を string | undefined にする。trim 後に空でない CURSOR_API_KEY のときはその文字列を Agent.create に渡す。空で sdkAuthReady が true のときは apiKey: undefined を渡す。src/main/index.test.ts で、前後に空白が1文字ずつの sk-example を渡したときエージェントへ渡る値が sk-example であること（AC-003）と、空白だけのキーかつ sdkAuthReady true のとき apiKey が undefined であること（AC-006）を、createAgent の差し替えで実行して観測する。",
      refs: ["FR-002", "FR-003", "Main"],
      verifies: ["AC-003", "AC-006"],
      status: "done",
    },
    "T-003": {
      title: "認証の有無で起動画面か終了になることをテストする",
      kind: "test",
      description:
        "src/main/index.test.ts の run で次を実行して観測する。有効な issue-runner.json と CURSOR_API_KEY が sk-example で認証ファイルが無いとき、起動画面が出て画面に sk-example が無い（AC-002）。キー未設定かつ sdkAuthReady true のとき起動画面が出て API キー値が無い（AC-005、AC-010 の起動ケース）。キー未設定かつ sdkAuthReady false のとき TUI が無く、標準エラーが「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の全文である（AC-007、AC-013）。gh 未ログインでも GitHub トークンの入力欄が画面に無い（AC-009）。設定画面の項目は repository、interval、model、assignee のままである既存テストを変えずに残す（INV-002）。キーがあるときの起動画面に上段の設定、中段の状態、下段の終了キー q があり q で終了する既存の観測を維持する（BNFR-001）。",
      refs: ["FR-002", "FR-003", "FR-004", "FR-005", "FR-006", "INV-002", "Main"],
      verifies: ["AC-002", "AC-005", "AC-007", "AC-009", "AC-010", "AC-013", "INV-002", "BNFR-001"],
      status: "todo",
    },
    "T-004": {
      title: "bun src/main/login.ts の成功と失敗をテストする",
      kind: "test",
      description:
        "src/main/login.ts に runLogin を作り、import.meta.main から終了コードで終わる。既定の login は @cursor/sdk 1.0.37 の Cursor.auth.login() を呼ぶ。src/main/login.test.ts では login を差し替える。成功したら 0 を返す（AC-001 の実行口。ホームに auth.json ができることは人が bun src/main/login.ts を1回実行して確かめる）。login が失敗したら終了コード 1 で、標準エラーは「Cursor へのログインに失敗しました」の全文だけであり、例外の message は出さない（AC-012、AC-014）。knip.json の entry に src/main/login.ts を足す。docs/sdd/adr/ADR-0002.ts の decision を、trim 後に空でない CURSOR_API_KEY を優先し、空のときは SDK の保存済み認証で起動する、に更新する。",
      refs: ["FR-001", "Main"],
      verifies: ["AC-001", "AC-012", "AC-014"],
      status: "todo",
    },
  },
});
