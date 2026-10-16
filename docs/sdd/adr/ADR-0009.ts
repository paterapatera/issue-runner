import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0009",
  title: "作業ブランチの準備は src/work-branch に置く",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-3",
  context:
    "sdd-impl の前に、起動ディレクトリの issueIdPrefix と issue 番号から spec 名を決め、origin の該当ブランチへ checkout する必要がある。起動画面とラベル遷移の責務を分けたい。",
  decision:
    "src/work-branch/index.ts に prepareWorkBranch を置く。起動、設定、TUI は変えず、ラベルとコメントは src/github/ のままにする。knip の entry に src/work-branch/index.ts を足す。",
  consequences:
    "ポーラーまたは別の起動経路が、作業ブランチの準備と GitHub 状態の更新を分けて呼べる。main からは直接呼ばない。",
  alternatives: [
    {
      option: "src/github/ に checkout を足す",
      reason: "ラベル用のモジュールが git checkout も持つことになる",
    },
  ],
});
