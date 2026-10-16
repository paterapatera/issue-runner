import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0014",
  title: "API キーは環境変数を優先し、無いときは SDK の認証ファイルを使う",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-7",
  context:
    "ADR-0002 はローカル SDK 実行と CURSOR_API_KEY を前提にしている。手元では毎回 export が煩わしく、SDK が保存する ~/.cursor/sdk/auth.json を使いたい。config は環境変数と issue-runner.json だけを読む層である。",
  decision:
    "trim 後に空でない CURSOR_API_KEY があればそれを Agent.create に渡す。空のときは main が ~/.cursor/sdk/auth.json のサイズが 1 バイト以上かだけを調べ、真なら TUI に進み apiKey は undefined で SDK の保存済み認証に任せる。どちらも無いときは終了コード 1 とログイン案内の1行を標準エラーに出す。ログインは bun src/main/login.ts で Cursor.auth.login() を呼ぶ。",
  consequences:
    "env 無しでも一度ログインすれば起動できる。認証ファイルの中身は読まない。GitHub は引き続き gh 認証のみ。",
  alternatives: [
    {
      option: "環境変数が無いときは起動しないままにする",
      reason: "ログイン済みの認証ファイルでも起動したい要件に合わない",
    },
    {
      option: "config が認証ファイルを直接読む",
      reason: "architecture の config 層がファイルシステムのホーム配下まで広がる",
    },
  ],
});
