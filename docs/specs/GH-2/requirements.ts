import { defineRequirements } from "../../sdd/schema/mod.ts";

// 要件（docs/specs/GH-2/requirements.ts）。
// 書き方: docs/sdd/guides/writing-requirements.md
export default defineRequirements({
  issue: "GH-2",
  summary:
    "ポーラーが GitHub issue のラベルを唯一の状態として付け替え、二重実行を防ぐ。ラベルの付け替えはポーラーだけが行う。",
  functional: {
    "FR-001": {
      title: "queued の列挙",
      ears: {
        pattern: "event",
        trigger: "ポーラーが queued の issue の列挙を求めた",
        response:
          "issue-runner.json の repository が指すリポジトリで、担当者が assignee である開いている issue のうち、ラベル agent:queued が付いたものだけを列挙しなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app に、開いている issue 10（担当者 octocat、ラベル agent:queued、タイトル「日付を表示する」、本文「今日の日付を出す」）、開いている issue 11（担当者 octocat、ラベル無し）、開いている issue 13（担当者 octocat、ラベル agent:running のみ）、開いている issue 14（担当者 hubot、ラベル agent:queued）、開いている issue 16（担当者無し、ラベル agent:queued）、閉じている issue 12（担当者 octocat、ラベル agent:queued）がある",
            "other/repo に、開いている issue 99（担当者 octocat、ラベル agent:queued）がある",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: [
            "結果に issue 10 だけが含まれる",
            "その行には番号 10、タイトル「日付を表示する」、本文「今日の日付を出す」が含まれる",
          ],
        },
        {
          id: "AC-002",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app に、ラベル agent:queued が付いた開いている issue が 0 件である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果が 0 件である", "0件を知らせる文言は出さない"],
        },
        {
          id: "AC-023",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app に、開いている issue 12（担当者 octocat、ラベル agent:queued）と、開いている issue 10（担当者 octocat、ラベル agent:queued）がある",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の順は issue 10、issue 12 である"],
        },
        {
          id: "AC-024",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app に、担当者 octocat かつラベル agent:queued の開いている issue が 10、11、12 の 3 件ある",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果に issue 10、11、12 の 3 件がすべて含まれる"],
        },
        {
          id: "AC-025",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 15（担当者 octocat、ラベル agent:queued）のタイトルが空文字である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 15 の行のタイトルは空文字である"],
        },
        {
          id: "AC-026",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 17（担当者 octocat、ラベル agent:queued）のタイトルが「あ」を 300 字繰り返した文字列である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 17 の行のタイトルは、その 300 字そのものであり、省略されない"],
        },
        {
          id: "AC-027",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 18（担当者 octocat、ラベル agent:queued）のタイトルが「1行目」のあと改行して「2行目」である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 18 の行のタイトルは「1行目」のあと改行して「2行目」そのものである"],
        },
        {
          id: "AC-028",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 19（担当者 octocat、ラベル agent:queued）の本文が空文字である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 19 の行の本文は空文字である"],
        },
        {
          id: "AC-029",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 23（担当者 octocat、ラベル agent:queued）の本文が「あ」を 300 字繰り返した文字列である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 23 の行の本文は、その 300 字そのものであり、省略されない"],
        },
        {
          id: "AC-030",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 24（担当者 octocat、ラベル agent:queued）の本文が「1行目」のあと改行して「2行目」である",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: ["結果の issue 24 の行の本文は「1行目」のあと改行して「2行目」そのものである"],
        },
        {
          id: "AC-022",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "issue-runner.json の repository が example/app、assignee が octocat である",
            "example/app の開いている issue 10（担当者 octocat、ラベル agent:queued）がある",
            "GitHub への列挙が失敗する",
          ],
          when: "ポーラーが queued の issue を列挙した",
          then: [
            "列挙は成功しない",
            "issue 10 のラベルは agent:queued のままである",
            "標準エラーに「issue の列挙に失敗しました」の 1 行が出る",
          ],
        },
      ],
      priority: "must",
    },
    "FR-002": {
      title: "起動前のラベル",
      ears: {
        pattern: "event",
        trigger: "ポーラーがエージェントの起動前に対象 issue を running へ進めた",
        response: "その issue の状態ラベルを agent:running ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-003",
          kind: "normal",
          verifiedBy: "human",
          given: ["開いている issue 20 にラベル agent:queued が付いている"],
          when: "ポーラーが issue 20 をエージェントの起動前に running へ進めた",
          then: [
            "GitHub の issue 20 の画面にラベル agent:running が表示される",
            "同じ画面にラベル agent:queued、agent:done、agent:failed は表示されない",
          ],
        },
        {
          id: "AC-004",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["開いている issue 21 にラベル agent:queued と agent:running の両方が付いている"],
          when: "ポーラーが issue 21 をエージェントの起動前に running へ進めた",
          then: [
            "issue 21 にラベル agent:running が付いている",
            "issue 21 にラベル agent:queued、agent:done、agent:failed が付いていない",
          ],
        },
      ],
      notApplicable: {
        error: "ラベルの付け替えが GitHub 上で失敗したときの結果は、失敗の伝え方として別に聞く",
      },
      priority: "must",
    },
    "FR-003": {
      title: "実行 ID のコメント",
      ears: {
        pattern: "event",
        trigger: "ポーラーがエージェントの起動前に対象 issue を running へ進めた",
        response: "起動前に発行した実行 ID だけを本文とするコメントを、その issue に残さなければならない",
      },
      acceptance: [
        {
          id: "AC-005",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "開いている issue 20 にラベル agent:queued が付いている",
            "ポーラーがこの遷移のために発行した実行 ID が 2f1c0c3e-7b4a-4d1e-9a6b-0c5d8e7f1a2b である",
          ],
          when: "ポーラーが issue 20 をエージェントの起動前に running へ進めた",
          then: ["GitHub の issue 20 の画面に、本文が 2f1c0c3e-7b4a-4d1e-9a6b-0c5d8e7f1a2b そのものであるコメントが表示される"],
        },
        {
          id: "AC-006",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 22 にラベル agent:queued が付いている",
            "ポーラーがこの遷移のために発行した実行 ID が 00000000-0000-4000-8000-000000000000 である",
          ],
          when: "ポーラーが issue 22 をエージェントの起動前に running へ進めた",
          then: ["issue 22 に追加されたコメントの本文は 00000000-0000-4000-8000-000000000000 の 36 文字そのものであり、省略されない"],
        },
      ],
      notApplicable: {
        error: "空の実行 ID は発行しない",
      },
      priority: "must",
    },
    "FR-004": {
      title: "完了時のラベル",
      ears: {
        pattern: "event",
        trigger: "対象 issue の実行が完了した",
        response: "その issue の状態ラベルを agent:done ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-007",
          kind: "normal",
          verifiedBy: "automated",
          given: ["開いている issue 30 にラベル agent:running が付いている", "実行結果が完了である"],
          when: "ポーラーがその結果を issue 30 へ反映した",
          then: [
            "issue 30 にラベル agent:done が付いている",
            "issue 30 にラベル agent:queued、agent:running、agent:failed が付いていない",
          ],
        },
      ],
      notApplicable: {
        boundary: "完了は成否の一方であり、件数や回数の境界が無い",
        error: "完了以外の結果は別の要件で扱う",
      },
      priority: "must",
    },
    "FR-005": {
      title: "完了時はコメントしない",
      ears: {
        pattern: "event",
        trigger: "対象 issue の実行が完了した",
        response: "新しいコメントを追加せずに終えなければならない",
      },
      acceptance: [
        {
          id: "AC-008",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 30 にラベル agent:running が付いている",
            "issue 30 のコメントは、起動前に残した実行 ID の 1 件だけである",
            "実行結果が完了であり、PR の URL が https://github.com/example/app/pull/9 である",
          ],
          when: "ポーラーがその結果を issue 30 へ反映した",
          then: ["issue 30 のコメントは反映前と同じ 1 件のままである"],
        },
      ],
      notApplicable: {
        boundary: "コメントを追加しないことには、本文の長さや件数の境界が無い",
        error: "完了コメントの本文はポーラーが書かない。投稿は sdd-finish が行う",
      },
      priority: "must",
    },
    "FR-010": {
      title: "失敗時のコメント",
      ears: {
        pattern: "event",
        trigger:
          "実行中に失敗した、スキルが人の判断を求めて停止した、起動前の CursorAgentError で isRetryable が偽だった、または再キューがすでに 3 回で isRetryable が真だった",
        response: "受け取った失敗理由の文字列そのものを本文とするコメントを1件残さなければならない",
      },
      acceptance: [
        {
          id: "AC-015",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 40 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "実行中に失敗し、失敗理由が「エージェントが異常終了した」である",
          ],
          when: "ポーラーがその結果を issue 40 へ反映した",
          then: ["issue 40 のコメントが 2 件になる", "追加されたコメントの本文は「エージェントが異常終了した」そのものである"],
        },
        {
          id: "AC-016",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 41 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "スキルが人の判断を求めて停止し、失敗理由が「人の判断が必要です」である",
          ],
          when: "ポーラーがその結果を issue 41 へ反映した",
          then: ["issue 41 のコメントが 2 件になる", "追加されたコメントの本文は「人の判断が必要です」そのものである"],
        },
        {
          id: "AC-017",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "開いている issue 42 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "実行中に失敗し、失敗理由が空文字である",
          ],
          when: "ポーラーがその結果を issue 42 へ反映した",
          then: ["issue 42 のコメントが 2 件になる", "追加されたコメントの本文は「予期せぬ失敗が発生しました」そのものである"],
        },
        {
          id: "AC-018",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 43 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "実行中に失敗し、失敗理由が「あ」を 300 字繰り返した文字列である",
          ],
          when: "ポーラーがその結果を issue 43 へ反映した",
          then: ["追加されたコメントの本文は、その 300 字そのものであり、省略されない"],
        },
        {
          id: "AC-019",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 44 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "実行中に失敗し、失敗理由が「1行目」のあと改行して「2行目」である",
          ],
          when: "ポーラーがその結果を issue 44 へ反映した",
          then: ["追加されたコメントの本文は「1行目」のあと改行して「2行目」そのものである"],
        },
        {
          id: "AC-021",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 51 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が偽であり、失敗理由が「起動に失敗した」である",
          ],
          when: "ポーラーがその失敗を issue 51 へ反映した",
          then: ["issue 51 のコメントが 2 件になる", "追加されたコメントの本文は「起動に失敗した」そのものである"],
        },
        {
          id: "AC-033",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 53 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が真である",
            "これまでにこの issue を queued へ戻した回数は 3 回である",
            "失敗理由が「再試行の上限に達しました」である",
          ],
          when: "ポーラーがその失敗を issue 53 へ反映した",
          then: ["issue 53 のコメントが 2 件になる", "追加されたコメントの本文は「再試行の上限に達しました」そのものである"],
        },
      ],
      priority: "must",
    },
    "FR-006": {
      title: "失敗時のラベル",
      ears: {
        pattern: "event",
        trigger: "実行中に失敗した、またはスキルが人の判断を求めて停止した",
        response: "その issue の状態ラベルを agent:failed ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-009",
          kind: "normal",
          verifiedBy: "automated",
          given: ["開いている issue 40 にラベル agent:running が付いている", "実行中に失敗した"],
          when: "ポーラーがその結果を issue 40 へ反映した",
          then: [
            "issue 40 にラベル agent:failed が付いている",
            "issue 40 にラベル agent:queued、agent:running、agent:done が付いていない",
          ],
        },
        {
          id: "AC-010",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["開いている issue 41 にラベル agent:running が付いている", "スキルが人の判断を求めて停止した"],
          when: "ポーラーがその結果を issue 41 へ反映した",
          then: [
            "issue 41 にラベル agent:failed が付いている",
            "issue 41 にラベル agent:queued、agent:running、agent:done が付いていない",
          ],
        },
      ],
      notApplicable: {
        error: "起動前の失敗で isRetryable が偽のときは FR-009 で扱う。実行中の失敗ではない",
      },
      priority: "must",
    },
    "FR-007": {
      title: "失敗時は queued に戻さない",
      ears: {
        pattern: "event",
        trigger: "実行中に失敗した、またはスキルが人の判断を求めて停止した",
        response: "その issue にラベル agent:queued が付いていない状態を保たなければならない",
      },
      acceptance: [
        {
          id: "AC-011",
          kind: "normal",
          verifiedBy: "automated",
          given: ["開いている issue 40 にラベル agent:running が付いており、agent:queued は付いていない", "実行中に失敗した"],
          when: "ポーラーがその結果を issue 40 へ反映した",
          then: ["issue 40 にラベル agent:queued が付いていない"],
        },
        {
          id: "AC-012",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 41 にラベル agent:running が付いており、agent:queued は付いていない",
            "スキルが人の判断を求めて停止した",
          ],
          when: "ポーラーがその結果を issue 41 へ反映した",
          then: ["issue 41 にラベル agent:queued が付いていない"],
        },
      ],
      notApplicable: {
        error: "queued へ戻す例外は、起動前かつ isRetryable が真のときだけであり、FR-008 で扱う",
      },
      priority: "must",
    },
    "FR-008": {
      title: "再試行できる起動前の失敗",
      ears: {
        pattern: "event",
        trigger: "起動前の CursorAgentError で isRetryable が真であり、この issue を queued へ戻した回数が 3 回未満だった",
        response: "その issue の状態ラベルを agent:queued ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-013",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 50 にラベル agent:running が付いている",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が真である",
            "これまでにこの issue を queued へ戻した回数は 0 回である",
          ],
          when: "ポーラーがその失敗を issue 50 へ反映した",
          then: [
            "issue 50 にラベル agent:queued が付いている",
            "issue 50 にラベル agent:running、agent:done、agent:failed が付いていない",
          ],
        },
        {
          id: "AC-031",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "開いている issue 52 にラベル agent:running が付いている",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が真である",
            "これまでにこの issue を queued へ戻した回数は 2 回である",
          ],
          when: "ポーラーがその失敗を issue 52 へ反映した",
          then: [
            "issue 52 にラベル agent:queued が付いている",
            "issue 52 にラベル agent:running、agent:done、agent:failed が付いていない",
          ],
        },
      ],
      notApplicable: {
        error: "isRetryable が偽のときは FR-009、4 回目は FR-012 で agent:failed にする。この要件は 3 回未満の再キューだけを扱う",
      },
      priority: "must",
    },
    "FR-011": {
      title: "再キュー時はコメントしない",
      ears: {
        pattern: "event",
        trigger: "起動前の CursorAgentError で isRetryable が真であり、この issue を queued へ戻した回数が 3 回未満だった",
        response: "新しいコメントを追加せずに終えなければならない",
      },
      acceptance: [
        {
          id: "AC-020",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 50 にラベル agent:running が付いている",
            "コメントは起動前の実行 ID の 1 件だけである",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が真である",
            "これまでにこの issue を queued へ戻した回数は 0 回である",
          ],
          when: "ポーラーがその失敗を issue 50 へ反映した",
          then: ["issue 50 のコメントは反映前と同じ 1 件のままである"],
        },
      ],
      notApplicable: {
        boundary: "コメントを追加しないことには、本文の長さや件数の境界が無い",
        error: "再キューではコメント本文を書かないため、本文の異常は無い",
      },
      priority: "must",
    },
    "FR-012": {
      title: "4回目の再試行",
      ears: {
        pattern: "event",
        trigger: "起動前の CursorAgentError で isRetryable が真であり、この issue を queued へ戻した回数がすでに 3 回だった",
        response: "その issue の状態ラベルを agent:failed ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-032",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 53 にラベル agent:running が付いている",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が真である",
            "これまでにこの issue を queued へ戻した回数は 3 回である",
          ],
          when: "ポーラーがその失敗を issue 53 へ反映した",
          then: [
            "issue 53 にラベル agent:failed が付いている",
            "issue 53 にラベル agent:queued、agent:running、agent:done が付いていない",
          ],
        },
      ],
      notApplicable: {
        boundary: "戻した回数が 3 回のときがこの要件の全体であり、2 回までは FR-008 である",
        error: "4 回目自体を失敗として扱う。ここからさらに分かれる失敗は無い",
      },
      priority: "must",
    },
    "FR-009": {
      title: "再試行できない起動前の失敗",
      ears: {
        pattern: "event",
        trigger: "起動前の CursorAgentError で isRetryable が偽だった",
        response: "その issue の状態ラベルを agent:failed ただ1つにしなければならない",
      },
      acceptance: [
        {
          id: "AC-014",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "開いている issue 51 にラベル agent:running が付いている",
            "エージェントはまだ起動していない",
            "起動前の CursorAgentError であり isRetryable が偽である",
          ],
          when: "ポーラーがその失敗を issue 51 へ反映した",
          then: [
            "issue 51 にラベル agent:failed が付いている",
            "issue 51 にラベル agent:queued、agent:running、agent:done が付いていない",
          ],
        },
      ],
      notApplicable: {
        boundary: "偽は二値の一方であり、件数や回数の境界は無い",
        error: "この遷移自体が失敗の結果であり、ここからさらに分かれる失敗は無い",
      },
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {
    "INV-001": {
      title: "起動と設定と TUI",
      behavior:
        "CURSOR_API_KEY が無く設定が揃っているときは TUI を出さず終了コード 1 になる。設定が揃っているときは起動画面の上段に repository、間隔（分）、model、assignee、中段に状態「待機中」、下段に終了キー q が出る。設定ファイルの項目は repository、interval、model、assignee のままである",
      verification: "src/main/index.test.ts、src/tui/index.test.ts、src/config/index.test.ts が、この issue の変更後も通る",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: {
      decision: "notApplicable",
      reason: "プロセスの再起動と二重起動の防止はポーリングループの issue が扱い、この issue はラベル遷移だけを扱う",
    },
    "性能・拡張性": { decision: "baseline" },
    "運用・保守性": { decision: "baseline" },
    移行性: {
      decision: "notApplicable",
      reason: "既存の設定ファイルや保存データの形式を移す作業は無い",
    },
    セキュリティ: { decision: "baseline" },
    "システム環境・エコロジー": {
      decision: "baseline",
      waived: {
        "BNFR-001": "起動画面の表示と終了キーは変えず、INV-001 の既存テストで足りるため",
      },
    },
  },
  issueCoverage: [
    {
      source: "開いている issue のうち、ラベル `agent:queued` が付いたものを列挙できる",
      coveredBy: ["FR-001", "AC-001", "AC-002"],
    },
    {
      source:
        "エージェントを起動する前に、`agent:queued` を外して `agent:running` を付け、コメントに実行 ID を残す",
      coveredBy: ["FR-002", "FR-003", "AC-003", "AC-005"],
    },
    {
      source: "実行結果に応じて次へ遷移する",
      coveredBy: ["FR-004", "FR-006", "FR-008"],
    },
    {
      source: "完了: `agent:done`。PR の URL を含む結果をコメントする",
      coveredBy: ["FR-004", "FR-005", "AC-007", "AC-008"],
    },
    {
      source:
        "実行中の失敗、またはスキルが人の判断を求めて停止: `agent:failed`。自動では `agent:queued` に戻さない",
      coveredBy: ["FR-006", "FR-007", "FR-010", "AC-009", "AC-011", "AC-015"],
    },
    {
      source: "起動前の `CursorAgentError` で `isRetryable` のときだけ `agent:queued` に戻す",
      coveredBy: ["FR-008", "FR-009", "FR-012", "AC-013", "AC-014", "AC-032"],
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は開発者1人で、権限の種類では振る舞いを分けない。GitHub への列挙失敗は AC-022",
    },
    dataStates: {
      result: "considered",
      note: "0件は AC-002、番号の昇順は AC-023、件数の上限なしは AC-024。閉じた issue と担当者違いは AC-001 で除外する",
    },
    inputValidation: {
      result: "considered",
      note: "実行 ID は小文字 UUID の 36 文字で、本文はそのまま AC-005 と AC-006。完了コメントはポーラーが書かない",
    },
    errorFeedback: {
      result: "considered",
      note: "失敗ラベルは AC-009 と AC-010。失敗コメントは AC-015 と AC-017。列挙失敗の標準エラーは AC-022。再キューと完了ではコメントを増やさない（AC-020、AC-008）",
    },
    existingData: {
      result: "considered",
      note: "既存の起動、設定ファイル、TUI は INV-001。GitHub 上のラベルは、この issue の遷移で付け替わる",
    },
    consistency: {
      result: "considered",
      note: "ラベル名は issue の agent:queued、agent:running、agent:done、agent:failed にそろえた。実行中の失敗とスキル停止はどちらも FR-006 と FR-007 に入れた",
    },
    outOfScope: {
      result: "considered",
      note: "エージェントの起動、ポーリング間隔、spec 名と作業ブランチ、TUI の文言変更、完了時のコメント本文（sdd-finish）を対象外に書いた",
    },
  },
  values: [
    {
      target: "queued の issue 一覧",
      kind: "listDisplay",
      aspects: {
        items: { decidedBy: ["AC-001"], basis: { answer: "ANS-018" } },
        order: { decidedBy: ["AC-023"], basis: { answer: "ANS-019" } },
        tie: {
          notApplicable: "issue 番号は一意なので、等しい場合は無い",
          basis: { answer: "ANS-020" },
        },
        empty: { decidedBy: ["AC-002"], basis: { answer: "ANS-021" } },
        pageSize: { decidedBy: ["AC-024"], basis: { answer: "ANS-022" } },
        rest: {
          notApplicable: "件数の上限が無く、一致したものはすべて出すため、出しきれない分は無い",
          basis: { answer: "ANS-023" },
        },
      },
    },
    {
      target: "一覧の各行のタイトル",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-026"], basis: { answer: "ANS-025" } },
        lineBreak: { decidedBy: ["AC-027"], basis: { answer: "ANS-026" } },
        empty: { decidedBy: ["AC-025"], basis: { answer: "ANS-024" } },
      },
    },
    {
      target: "一覧の各行の本文",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-029"], basis: { answer: "ANS-028" } },
        lineBreak: { decidedBy: ["AC-030"], basis: { answer: "ANS-029" } },
        empty: { decidedBy: ["AC-028"], basis: { answer: "ANS-027" } },
      },
    },
    {
      target: "実行開始のコメント",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-006"], basis: { answer: "ANS-007" } },
        lineBreak: { notApplicable: "小文字の UUID には改行が無い", basis: { answer: "ANS-007" } },
        empty: { notApplicable: "小文字の UUID は空にならない", basis: { answer: "ANS-007" } },
      },
    },
    {
      target: "失敗コメント",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-018"], basis: { answer: "ANS-012" } },
        lineBreak: { decidedBy: ["AC-019"], basis: { answer: "ANS-013" } },
        empty: { decidedBy: ["AC-017"], basis: { answer: "ANS-011" } },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "列挙",
      aspect: "対象リポジトリの決め方",
      answer: "issue-runner.json の repository だけを対象にする",
    },
    "ANS-002": {
      target: "列挙",
      aspect: "担当者による絞り込み",
      answer: "issue-runner.json の assignee が担当の issue だけを列挙する",
    },
    "ANS-003": {
      target: "状態ラベル",
      aspect: "遷移後に前の状態ラベルを外すか",
      answer:
        "状態ラベルは常に1つだけにする。遷移のたびに他の agent:queued、agent:running、agent:done、agent:failed を外し、次の1つだけを付ける",
    },
    "ANS-004": {
      target: "起動前の失敗",
      aspect: "isRetryable が偽のときの遷移先",
      answer: "agent:failed だけにする",
    },
    "ANS-005": {
      target: "実行 ID",
      aspect: "値の出どころ",
      answer: "ポーラーが起動前に一意の ID を発行し、その文字列をコメントに残す",
    },
    "ANS-006": {
      target: "実行開始のコメント",
      aspect: "本文",
      answer: "発行した実行 ID だけを本文にする",
    },
    "ANS-007": {
      target: "実行 ID",
      aspect: "文字の形",
      answer: "小文字の UUID にする。例: 2f1c0c3e-7b4a-4d1e-9a6b-0c5d8e7f1a2b",
    },
    "ANS-008": {
      target: "完了コメント",
      aspect: "投稿者",
      answer: "コメントは sdd-finish が書き、ポーラーは agent:done だけを付ける",
    },
    "ANS-009": {
      target: "失敗",
      aspect: "コメントの有無",
      answer: "失敗理由の短い日本語を1件コメントする",
    },
    "ANS-010": {
      target: "失敗コメント",
      aspect: "本文",
      answer: "受け取った失敗理由の文字列をそのまま本文にする",
    },
    "ANS-011": {
      target: "失敗コメント",
      aspect: "値が空のときの表示",
      answer: "本文を「予期せぬ失敗が発生しました」にして1件コメントする",
    },
    "ANS-012": {
      target: "失敗コメント",
      aspect: "長い値の見せ方",
      answer: "省略せず、受け取った文字列全文を本文にする",
    },
    "ANS-013": {
      target: "失敗コメント",
      aspect: "改行を含む値の見せ方",
      answer: "改行をそのまま本文に残す",
    },
    "ANS-014": {
      target: "再キュー",
      aspect: "コメントの有無",
      answer: "コメントは投稿しない",
    },
    "ANS-015": {
      target: "起動前の失敗",
      aspect: "isRetryable が偽のときのコメント",
      answer: "実行中の失敗と同じく、失敗理由を1件コメントする",
    },
    "ANS-016": {
      target: "列挙の失敗",
      aspect: "結果の形",
      answer: "失敗として終わる。ラベルは変えない。標準エラーに理由を1行出す",
    },
    "ANS-017": {
      target: "列挙の失敗",
      aspect: "標準エラーの文言",
      answer: "「issue の列挙に失敗しました」と出す",
    },
    "ANS-018": {
      target: "queued の issue 一覧",
      aspect: "各行に出す項目",
      answer: "番号とタイトルと本文を出す。実行の優先を考えるために本文が要る",
    },
    "ANS-019": {
      target: "queued の issue 一覧",
      aspect: "並び順",
      answer: "issue 番号の昇順にする",
    },
    "ANS-020": {
      target: "queued の issue 一覧",
      aspect: "並び順を決める値が等しいときの順",
      answer: "関係しない。issue 番号は一意である",
    },
    "ANS-021": {
      target: "queued の issue 一覧",
      aspect: "0件のときの表示",
      answer: "行を出さない。0件の結果にする",
    },
    "ANS-022": {
      target: "queued の issue 一覧",
      aspect: "一度に表示する件数",
      answer: "上限を設けず、一致したものをすべて出す",
    },
    "ANS-023": {
      target: "queued の issue 一覧",
      aspect: "表示しきれない分の見せ方",
      answer: "関係しない。一致したものはすべて出す",
    },
    "ANS-024": {
      target: "一覧の各行のタイトル",
      aspect: "値が空のときの表示",
      answer: "空文字のまま出す",
    },
    "ANS-025": {
      target: "一覧の各行のタイトル",
      aspect: "長い値の見せ方",
      answer: "省略せず、タイトル全文を出す",
    },
    "ANS-026": {
      target: "一覧の各行のタイトル",
      aspect: "改行を含む値の見せ方",
      answer: "改行をそのまま出す",
    },
    "ANS-027": {
      target: "一覧の各行の本文",
      aspect: "値が空のときの表示",
      answer: "空文字のまま出す",
    },
    "ANS-028": {
      target: "一覧の各行の本文",
      aspect: "長い値の見せ方",
      answer: "省略せず、本文全文を出す",
    },
    "ANS-029": {
      target: "一覧の各行の本文",
      aspect: "改行を含む値の見せ方",
      answer: "改行をそのまま出す",
    },
    "ANS-030": {
      target: "再キュー",
      aspect: "回数の上限",
      answer: "再キューは 3 回までとする。4 回目は agent:failed にする",
    },
    "ANS-031": {
      target: "4回目の再試行",
      aspect: "コメントの有無",
      answer: "他の failed と同じく、失敗理由を1件コメントする",
    },
  },
  assumptions: [
    "GitHub の操作は実行環境の gh に任せ、資格情報はアプリが読まない（ADR-0003）",
    "ラベル名は agent:queued、agent:running、agent:done、agent:failed の4つであり、これ以外の状態ラベルは足さない",
  ],
  openQuestions: [],
  outOfScope: [
    "エージェントの起動と /sdd-impl、/sdd-finish の実行",
    "ポーリング間隔で列挙から遷移までをつなぐループ",
    "issue 番号から spec 名と作業ブランチを決めること",
    "起動画面と設定画面の文言や操作の変更",
    "完了時の issue コメント本文。投稿は sdd-finish が行う",
  ],
});
