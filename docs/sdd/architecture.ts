import { defineArchitecture } from "./schema/mod.ts";

// 構成。コードと食い違ったらコードを正とし、こちらを直す。
// 全部を最初から書き起こさない。大まかに作り、sdd-finish のたびに触った部分を詳しくする。
export default defineArchitecture({
  basedOn: "8a4247b1f2d0c60135a2f3922091282a11f5555b",
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
      path: "src/main.ts",
      responsibility: "設定を読んで TUI を起動する",
      dependsOn: ["config", "tui"],
    },
    config: {
      path: "src/config.ts",
      responsibility:
        "監視するリポジトリ（owner/repo）、ローカルのチェックアウト、ポーリング間隔、モデル（既定は composer-2.5）を設定から読む。CURSOR_API_KEY は環境変数から読み、無いときは起動を失敗させる。GitHub の資格情報は読まない",
    },
    tui: {
      path: "src/tui.ts",
      responsibility:
        "上段に設定、中段に状態、下段に終了キーを描画する。設定は引数で受け取る",
    },
  },
  layers: [
    { name: "config", rule: "main と tui に依存しない。環境変数と設定ファイルだけを読む" },
    { name: "tui", rule: "config を import しない。@opentui/core を import できるのはこのモジュールだけ" },
    { name: "main", rule: "config と tui を組み立てて起動する" },
  ],
  notes: [
    "Web の画面は無い。config.ts の ui は false",
    "GH-1 が作るのは起動、設定、TUI の骨組みである。issue の取得、ラベル更新、エージェントの実行は GH-1 の対象外",
    "品質ゲートのコマンドは、ツールを導入する基盤 issue で config.ts に登録する",
  ],
});
