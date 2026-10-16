import { defineBaselineNfrs } from "./schema/mod.ts";

// プロジェクト全体の非機能要件。目標値が決まったものだけを書く。
export default defineBaselineNfrs({
  "BNFR-001": {
    title: "WSL と macOS で動く",
    category: "システム環境・エコロジー",
    metric: "対象の OS でプロセスが起動し、TUI を操作できること",
    target: "WSL と macOS の両方でできる",
    condition: "Bun 1.4.3 が入った開発者の WSL と macOS",
    verification:
      "それぞれの OS でプロセスを起動し、上段に設定、中段に状態、下段に終了キーが表示され、終了キーでプロセスが終わることを操作して確かめる",
  },
});
