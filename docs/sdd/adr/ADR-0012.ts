import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0012",
  title: "間隔ごとの接続は src/poll に置く",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-5",
  context:
    "設定した間隔で agent:queued を1件進める処理は、実行 ID とラベル、作業ブランチ、local agent を順に呼ぶ。src/agent はラベルと作業ブランチを呼ばない。src/github は SDK と git を持たない。",
  decision:
    "src/poll/index.ts に startPolling を置く。src/agent の pollOnce は残し、本番の起動からは呼ばない。",
  consequences:
    "ポーリング、優先順位の判断、再起動時の running の片付けを1か所にまとめられる。main と TUI は startPolling を渡すだけにできる。",
  alternatives: [
    {
      option: "src/agent/ に接続を足す",
      reason: "ラベルと作業ブランチの準備を agent が呼ぶことになる",
    },
    {
      option: "src/main/index.ts に接続を書く",
      reason: "起動のファイルが GitHub と SDK の手順を持つことになる",
    },
  ],
});
