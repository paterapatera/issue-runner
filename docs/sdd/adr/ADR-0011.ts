import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0011",
  title: "local agent の実行は src/agent に置く",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-4",
  context:
    "queued の issue を1件だけ @cursor/sdk の local agent で /sdd-impl する必要がある。ラベル遷移は src/github、作業ブランチの準備は src/work-branch にあり、SDK の実行をそこに混ぜない。",
  decision:
    "src/agent/index.ts に pollOnce を置く。起動、設定、TUI、ラベル、作業ブランチの準備は変えず、それらからは呼ばない。knip の entry に src/agent/index.ts を足す。",
  consequences:
    "ポーリングや別の起動経路が、repository・assignee・cwd と注入可能な createAgent で local agent を1件ずつ実行できる。main からはまだ呼ばない。",
  alternatives: [
    {
      option: "src/github/ に SDK 実行を足す",
      reason: "ラベル用のモジュールがエージェント実行も持つことになる",
    },
  ],
});
