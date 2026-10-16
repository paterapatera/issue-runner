import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0013",
  title: "本番の起動だけが src/poll を呼ぶ",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-5",
  context:
    "起動画面の状態を処理中に切り替えるには、画面を出したあとでポーリングを始める必要がある。テスト用の run は API キーと設定画面の挙動を変えない。",
  decision:
    "import.meta.main のときだけ startPolling を渡す。src/poll は listQueuedIssues、listRunningIssues、beginRunning、applyOutcome、prepareWorkBranch、runSddCycle を呼ぶ。src/tui は setStatus を受け取るだけで、それらを import しない。",
  consequences:
    "本番起動は間隔ごとに issue を進め、既存の起動テストは GitHub と SDK をモックせずに通せる。",
  alternatives: [
    {
      option: "run が常に startPolling を呼ぶ",
      reason: "既存の起動テストが GitHub と SDK を呼ぶことになる",
    },
  ],
});
