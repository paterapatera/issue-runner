import { defineArchitecture } from "./schema/mod.ts";

// 構成。コードと食い違ったらコードを正とし、こちらを直す。
// 全部を最初から書き起こさない。大まかに作り、sdd-finish のたびに触った部分を詳しくする。
export default defineArchitecture({
  basedOn: "71d024a144f253de94d5373c44430cfdd614e181",
  updatedAt: "2026-10-16",
  summary:
    "issue-runner は、開発者本人が自分のマシンで動かすローカルプロセスである。設定した1つの GitHub リポジトリの issue をポーリングし、Cursor のエージェントをそのリポジトリのチェックアウトで実行する。利用者は1人で、対象リポジトリは1つである。",
  stack: [
    { name: "Bun", version: "1.4.3", purpose: "実行とパッケージ管理。型検査は bun --check" },
    { name: "TypeScript", version: "7.0.2", purpose: "言語" },
    {
      name: "@cursor/sdk",
      version: "1.0.37",
      purpose: "Cursor のエージェントを、監視対象リポジトリのチェックアウト上でローカル実行する",
    },
    { name: "@opentui/core", version: "0.6.6", purpose: "端末の画面（TUI）" },
    { name: "gh", version: "2.45.0", purpose: "GitHub の操作。認証は実行環境の gh を使う" },
  ],
  modules: {
    main: {
      path: "src/main/index.ts",
      responsibility:
        "API キーと issue-runner.json を順に見て、設定画面か起動画面を出す。終了コードを決める",
      dependsOn: ["config", "tui"],
    },
    config: {
      path: "src/config/index.ts",
      responsibility:
        "issue-runner.json の読み書きと、repository、interval、model、assignee、CURSOR_API_KEY の判定。gh からログイン名を取る",
    },
    tui: {
      path: "src/tui/index.ts",
      responsibility:
        "設定画面と起動画面を @opentui/core で描く。設定の中身は引数で受け取り、config を import しない",
    },
    github: {
      path: "src/github/index.ts",
      responsibility:
        "issue-runner.json の repository と assignee を引数で受け、gh で agent:* ラベルの列挙・付け替えと実行 ID・失敗理由のコメントを行う。起動経路からはまだ呼ばない",
    },
  },
  layers: [
    { name: "config", rule: "main と tui に依存しない。環境変数と設定ファイルだけを読む" },
    { name: "tui", rule: "config を import しない。@opentui/core を import できるのはこのモジュールだけ" },
    { name: "main", rule: "config と tui を組み立てて起動する" },
    {
      name: "github",
      rule: "main・config・tui に依存しない。GitHub 操作は gh CLI のみ。呼び出し側が repository と assignee を渡す",
    },
  ],
  notes: [
    "Web の画面は無い。config.ts の ui は false",
    "GH-1 で起動、設定、TUI の骨組みを実装した",
    "GH-2 で src/github にラベル遷移を実装した。ポーリングとエージェント実行の接続は別 issue",
    "品質ゲートのコマンドは docs/sdd/config.ts に登録済み（Biome、bun --check、dependency-cruiser、Knip、jscpd、bun test）",
  ],
});
