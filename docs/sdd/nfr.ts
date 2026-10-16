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
  "BNFR-002": {
    title: "終了理由に秘密を出さない",
    category: "セキュリティ",
    metric: "固定の終了理由の標準エラーに、API キーの値とトークンが含まれる件数",
    target: "0件",
    condition: "終了コード 1 で出す、決めた日本語の終了理由（認証不足・設定読み取り失敗・保存失敗・ポーリング失敗など）",
    verification:
      "自動テストで標準エラーに、与えた秘密の値や環境変数のキー値が含まれないことを確かめる。固定文言にファイル本文や SDK の生メッセージを連結しない",
  },
});
