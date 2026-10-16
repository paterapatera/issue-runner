import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0010",
  title: "作業ブランチ準備のラベルとコメントは applyOutcome に任せる",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-3",
  context:
    "作業ブランチの準備に失敗したとき、agent:failed と理由コメントを付ける。ラベル付け替えは src/github に既にある。失敗段階ごとに標準エラーの文が違う。",
  decision:
    "src/work-branch/ が src/github/ の applyOutcome を呼ぶ。applyOutcome の失敗戻り値に step（label / comment / list）を足し、work-branch が標準エラーの文を選ぶ。",
  consequences:
    "ラベル操作の実装は github に一元化される。applyOutcome の呼び出し側は step で失敗原因を区別できる。",
  alternatives: [
    {
      option: "src/work-branch/ でラベルとコメントを別に実装する",
      reason: "src/github と同じ付け替えが二重になる",
    },
  ],
});
