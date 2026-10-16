import { defineTasks } from "../../sdd/schema/mod.ts";
import type design from "./design.ts";
import type requirements from "./requirements.ts";

export default defineTasks<typeof requirements, typeof design>()({
  tasks: {
    "T-001": {
      title: "起動時の終了理由をテストで固定する",
      kind: "test",
      description:
        "src/config/index.test.ts の loadStartup で、issue-runner.json が [] と null のとき終了コード 1 と「設定ファイルを読めません: issue-runner.json」になることを足す。中身が { の既存テストに、標準エラーへ載る文字列が sk-live-secret を含まないことを足す。未設定キーの既存テストに、同じ秘密の文字列を含まないことを足す。src/main/index.test.ts の run で、キー未設定かつ SDK 認証が無いときは終了コード 1、標準エラーが「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行、設定画面も起動画面も出ないことを観測する。キーが半角空白3文字で SDK 認証が無いときも同じ終了になることを足す。SDK 認証がありキーが空のときは終了コード 1 にならない既存の起動を維持する。src/main/login.test.ts のログイン失敗は終了コード 1 と「Cursor へのログインに失敗しました」の1行であることを維持し、その文字列に秘密の値を含まないことを足す。設定ファイルが無いときは設定画面へ進む既存テストと、saveConfig が4項目だけを書く既存テストは期待を変えない。",
      refs: ["FR-001", "FR-002", "NFR-001", "INV-001", "INV-004", "INV-005", "loadStartup"],
      verifies: [
        "AC-001",
        "AC-002",
        "AC-003",
        "AC-004",
        "AC-005",
        "AC-006",
        "AC-007",
        "AC-011",
        "AC-012",
        "INV-001",
        "INV-004",
        "INV-005",
        "NFR-001",
      ],
      status: "done",
    },
    "T-002": {
      title: "pollOnce の空の失敗理由を日本語にする",
      kind: "impl",
      description:
        "src/agent/index.ts の failWithMessage で、writeStderr する文字列の長さが 0 のときだけ「予期せぬ失敗が発生しました」を書く。1文字以上ならその文字列のまま書く。runSddCycle が返す message は空のまま変えない。GitHub のコメント本文は変えない。",
      refs: ["FR-003", "pollOnce"],
      status: "done",
    },
    "T-003": {
      title: "pollOnce の空理由と英語理由をテストする",
      kind: "test",
      description:
        "src/agent/poll-once-failures.test.ts に、実行結果が error で error.message が無いとき pollOnce が終了コード 1 になり、writeStderr が「予期せぬ失敗が発生しました」の1行になるテストを足す。失敗理由が tool failed のときは、その1行のまま日本語へ置き換わらない既存の観測を維持する。",
      refs: ["FR-003", "pollOnce"],
      verifies: ["AC-008", "AC-010"],
      status: "done",
    },
    "T-004": {
      title: "startPolling の空の失敗理由を標準エラーだけ日本語にする",
      kind: "impl",
      description:
        "src/poll/index.ts で、優先度判定の失敗と runSddCycle の失敗を exit(1) する直前に、標準エラーへ書く文字列の長さが 0 のときだけ既存の UNEXPECTED_FAILURE_MESSAGE（予期せぬ失敗が発生しました）を書く。applyOutcome に渡す reason は空文字のまま変えない。1文字以上の理由は標準エラーも失敗コメントもそのままにする。",
      refs: ["FR-003", "startPolling"],
      status: "done",
    },
    "T-005": {
      title: "startPolling の空理由と失敗コメントをテストする",
      kind: "test",
      description:
        "src/poll/index.test.ts に、優先度判定が error で message が無いとき標準エラーが「予期せぬ失敗が発生しました」で終了コード 1 になるテストを足す。runSddCycle に相当する実行が error で message が無いときも、標準エラーは同じ日本語1行、終了コードは 1、失敗コメントの理由は空のままであることを観測する。理由が tool failed の既存テストは、標準エラーが tool failed のままであることを維持する。",
      refs: ["FR-003", "startPolling"],
      verifies: ["AC-008", "AC-010"],
      status: "todo",
    },
    "T-006": {
      title: "設定が残っていない終了理由を run に足す",
      kind: "impl",
      description:
        "src/main/index.ts の RunDeps に任意の runSettings を足し、未指定なら src/tui の runSettings を使う。runSettingsFlow で戻りが saved かつ savedConfig が無いとき、process.stderr.write で「設定を保存できないため終了します」を1行書いて 1 を返す。cancel のときは 0 のままで、この文を書かない。saveConfig の入力エラーは画面内メッセージのまま、プロセスを終了させない。",
      refs: ["FR-003", "INV-002", "INV-003", "run"],
      status: "todo",
    },
    "T-007": {
      title: "設定終了とキャンセルをテストする",
      kind: "test",
      description:
        "src/main/index.test.ts で、注入した runSettings が submit を成功させずに saved を返すとき、run の終了コードが 1 で、標準エラーが「設定を保存できないため終了します」の1行になることを観測する。設定画面のキャンセルは終了コード 0 で、この文を標準エラーへ出さないことを観測する。不正な repository の保存は画面内のエラーのままで、終了コード 1 にならないことを観測する。",
      refs: ["FR-003", "INV-002", "INV-003", "run"],
      verifies: ["AC-009", "INV-002", "INV-003"],
      status: "todo",
    },
  },
});
