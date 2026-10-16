import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0007",
  title: "起動と設定と TUI を src/main・src/config・src/tui に分ける",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-1",
  context:
    "起動、設定ファイル、画面は責務が異なる。dependency-cruiser で層の依存を検査するため、モジュール境界をファイルパスで表す必要がある。",
  decision:
    "src/main/index.ts、src/config/index.ts、src/tui/index.ts に分ける。config は main と tui に依存しない。tui は config を import しない。",
  consequences:
    "単一ファイルよりファイル数は増えるが、テストと境界検査が明確になる。",
  alternatives: [
    {
      option: "src/main.ts、src/config.ts、src/tui.ts を src/ に置く",
      reason: "ディレクトリに分ける設計判断を採用したため",
    },
  ],
});
