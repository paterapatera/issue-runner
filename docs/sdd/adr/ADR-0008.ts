import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0008",
  title: "GitHub のラベル遷移を src/github に置く",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-2",
  context:
    "ADR-0007 は起動、設定、TUI のモジュール境界だけを定めている。issue のラベル列挙と付け替えはポーラーが行うが、起動画面の処理と混ぜない必要がある。",
  decision:
    "src/github/index.ts に listQueuedIssues、beginRunning、applyOutcome を置く。起動経路（src/main、src/config、src/tui）は変更しない。knip の entry に src/github/index.ts を足す。",
  consequences:
    "ポーラーは config から repository と assignee を読み、github モジュールを呼ぶ。起動とラベル操作の依存が分かれる。",
  alternatives: [
    {
      option: "src/main/index.ts に GitHub 操作を足す",
      reason: "起動のモジュールがラベル遷移を抱え、INV-001 の境界と混ざる",
    },
  ],
});
