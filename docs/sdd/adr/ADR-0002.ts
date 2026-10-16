import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0002",
  title: "エージェントの実行に @cursor/sdk 1.0.37 のローカル実行を使う",
  status: "accepted",
  date: "2026-10-16",
  context:
    "プロセスは開発者のマシンで動き、監視対象リポジトリのローカルチェックアウトを持つ。エージェントの実行には Cursor SDK が必要である。",
  decision:
    "@cursor/sdk 1.0.37 を使い、ローカル実行の cwd を監視対象リポジトリのチェックアウトにする。API キーは環境変数 CURSOR_API_KEY から読む。",
  consequences:
    "クラウド上の仮想マシンは使わない。エージェントは実行したマシンのファイルを直接変更できる。GH-1 ではエージェントの実行そのものは作らない。",
  alternatives: [
    {
      option: "Cursor SDK のクラウド実行",
      reason: "チェックアウトが開発者のマシンにあり、プロセスもそこで動かすため",
    },
  ],
});
