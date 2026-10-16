import { defineRequirements } from "../../sdd/schema/mod.ts";

export default defineRequirements({
  issue: "GH-5",
  summary:
    "設定した間隔で開いている agent:queued の issue を1件ずつ、spec 名の解決からラベル更新までつなぐ。agent:running は新規に起動せず、再起動後はコメントの実行 ID から結末を反映する。",
  functional: {
    "FR-001": {
      title: "間隔ごとに queued を処理する",
      ears: {
        pattern: "event",
        trigger: "設定した間隔が経過した",
        response:
          "開いている agent:queued のうち、AI が issue の内容から最も優先すると判断した1件だけを処理しなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "automated",
          given: ["間隔が2分である", "設定の assignee が octocat である", "issue 7 は octocat の agent:queued である", "issue 9 は別の担当者の agent:queued である"],
          when: "2分が経過する",
          then: ["issue 7 の処理が始まる", "issue 9 の処理は始まらない"],
        },
        {
          id: "AC-002",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["間隔が2分である", "開いている agent:queued の issue が0件である"],
          when: "2分が経過する",
          then: ["どの issue の処理も始まらない"],
        },
        {
          id: "AC-017",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "間隔が2分である",
            "issue 7 と issue 9 が agent:queued である",
            "優先順位の判断が失敗し、その文が model unavailable である",
          ],
          when: "2分が経過する",
          then: [
            "プロセスが終了コード 1 で終わる",
            "標準エラーが model unavailable である",
            "issue 7 の処理は始まらない",
            "issue 9 の処理は始まらない",
          ],
        },
      ],
      priority: "must",
    },
    "FR-002": {
      title: "1件を決めた順で進める",
      ears: {
        pattern: "event",
        trigger: "1件の issue の処理を始めた",
        response:
          "処理の前に実行 ID のコメントと agent:running にし、そのあと spec 名の解決、ブランチのチェックアウト、/sdd-impl、/sdd-finish、agent:done の順で進めなければならない",
      },
      acceptance: [
        {
          id: "AC-003",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 7 が agent:queued である", "チェックアウトできる作業ブランチが1件である"],
          when: "issue 7 の処理を終える",
          then: [
            "spec 名の解決より前に、実行 ID のコメントと agent:running が付く",
            "spec 名の解決のあとでブランチをチェックアウトする",
            "チェックアウトのあとで /sdd-impl を送る",
            "/sdd-impl のあとで /sdd-finish を送る",
            "/sdd-finish のあとでラベルが agent:done になる",
          ],
        },
        {
          id: "AC-004",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 7 が agent:queued である", "送るプロンプトが /sdd-impl の1件だけである"],
          when: "その /sdd-impl がまだ終わっていない",
          then: ["/sdd-finish を送らない"],
        },
        {
          id: "AC-005",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue 7 が agent:queued である", "作業ブランチの準備が失敗する"],
          when: "issue 7 の処理を進める",
          then: ["/sdd-impl を送らない", "/sdd-finish を送らない", "issue 7 のラベルが agent:failed になる"],
        },
      ],
      priority: "must",
    },
    "FR-003": {
      title: "running は新規起動しない",
      ears: {
        pattern: "state",
        state: "issue が agent:running である",
        response: "その issue の新しい実行を始めないようにしなければならない",
      },
      acceptance: [
        {
          id: "AC-006",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 8 が agent:running である", "開いている agent:queued は無い"],
          when: "設定した間隔が経過する",
          then: ["issue 8 へ /sdd-impl を送らない"],
        },
        {
          id: "AC-007",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["開いている issue が 8 だけである", "issue 8 が agent:running である"],
          when: "設定した間隔が経過する",
          then: ["どの issue の処理も始まらない"],
        },
      ],
      notApplicable: {
        error: "この規則は新しい実行を始めないことで、失敗の文言は持たない",
      },
      priority: "must",
    },
    "FR-004": {
      title: "再起動後に結末を反映する",
      ears: {
        pattern: "event",
        trigger: "プロセスを再起動した",
        response: "agent:running の issue のラベルを agent:failed にしなければならない",
      },
      acceptance: [
        {
          id: "AC-008",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "issue 8 が agent:running である",
            "そのコメントの実行 ID が aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee である",
          ],
          when: "プロセスを起動する",
          then: ["issue 8 のラベルが agent:failed になる", "issue 8 のラベルは agent:done にならない", "issue 8 へ /sdd-impl を送らない"],
        },
        {
          id: "AC-009",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue 8 が agent:running である",
            "その実行は、落ちる前に完了していた",
          ],
          when: "プロセスを起動する",
          then: ["issue 8 のラベルが agent:failed になる", "issue 8 のラベルは agent:done にならない"],
        },
        {
          id: "AC-018",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue 8 が agent:running である", "実行 ID のコメントが無い"],
          when: "プロセスを起動する",
          then: [
            "issue 8 のラベルが agent:failed になる",
            "プロセスが終了コード 1 で終わる",
            "標準エラーが予期せぬ失敗が発生しましたである",
          ],
        },
      ],
      priority: "must",
    },
    "FR-005": {
      title: "実行は同時に1件まで",
      ears: {
        pattern: "state",
        state: "1件の実行が進んでいる",
        response: "実行中の issue を1件だけに保たなければならない",
      },
      acceptance: [
        {
          id: "AC-010",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 7 の実行が進んでいる", "issue 9 が agent:queued である"],
          when: "設定した間隔が経過する",
          then: ["issue 9 の実行は始まらない"],
        },
        {
          id: "AC-011",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "実行中の issue は無い",
            "間隔が2分である",
            "issue 7 の本文は優先度は低いである",
            "issue 9 の本文は優先度は高いである",
            "AI は issue 9 のほうを優先すると判断する",
          ],
          when: "2分が経過する",
          then: ["issue 9 の実行が始まる", "issue 7 は、さらに2分が経過するまで始まらない", "優先順位を判断するモデルが composer-2.5 であり fast ではない"],
        },
        {
          id: "AC-019",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "実行中の issue は無い",
            "間隔が2分である",
            "issue 7 と issue 9 が agent:queued である",
            "AI は issue 7 と issue 9 の優先順位が同じだと判断する",
          ],
          when: "2分が経過する",
          then: ["issue 7 の実行が始まる", "issue 9 は、さらに2分が経過するまで始まらない"],
        },
      ],
      notApplicable: {
        error: "この規則は2件目を始めないことで、失敗の文言は持たない",
      },
      priority: "must",
    },
    "FR-006": {
      title: "途中の失敗は failed にする",
      ears: {
        pattern: "unwanted",
        condition: "処理の途中で失敗した",
        response: "その issue のラベルを agent:failed にしなければならない",
      },
      acceptance: [
        {
          id: "AC-012",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 7 が agent:running である", "作業ブランチの準備が失敗する"],
          when: "issue 7 の処理を進める",
          then: ["issue 7 のラベルが agent:failed になる", "/sdd-impl を送らない"],
        },
        {
          id: "AC-013",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 7 が agent:running である", "/sdd-impl の実行中にエラーになる"],
          when: "そのエラーを受け取る",
          then: ["issue 7 のラベルが agent:failed になる", "/sdd-finish を送らない"],
        },
      ],
      notApplicable: {
        error: "ラベルを付けられないときの終了は FR-007 で扱う。この規則は付いたラベルを確かめる",
      },
      priority: "must",
    },
    "FR-007": {
      title: "途中の失敗でプロセスを終える",
      ears: {
        pattern: "unwanted",
        condition: "処理の途中で失敗した",
        response: "プロセスを終了コード 1 で終え、標準エラーに失敗の理由を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-014",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 7 の処理中である", "失敗の理由が該当する作業ブランチがありませんである"],
          when: "その失敗を受け取る",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーが該当する作業ブランチがありませんである"],
        },
        {
          id: "AC-015",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 7 の /sdd-impl の実行中である", "失敗の理由が tool failed である"],
          when: "その失敗を受け取る",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーが tool failed である"],
        },
        {
          id: "AC-016",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue 7 を agent:failed にしようとして、ラベルの更新に失敗する"],
          when: "その失敗を受け取る",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーがラベルを更新できませんでしたである"],
        },
      ],
      priority: "must",
    },
    "FR-008": {
      title: "処理中の状態を表示する",
      ears: {
        pattern: "state",
        state: "issue の処理が進んでいる",
        response: "起動画面の状態に実行中と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-020",
          kind: "normal",
          verifiedBy: "human",
          given: ["起動画面が出ている", "issue 7 の処理が進んでいる"],
          when: "起動画面を見る",
          then: ["状態に実行中と、省略せず1行で表示される", "上段に設定、下段に終了キー q が表示される"],
        },
        {
          id: "AC-021",
          kind: "boundary",
          verifiedBy: "human",
          given: ["起動画面が出ている", "処理中の issue が無い", "agent:queued が0件である"],
          when: "起動画面を見る",
          then: ["状態に待機中と表示される"],
        },
      ],
      notApplicable: {
        error: "失敗するとプロセスが終わるため、起動画面に失敗の状態は出さない",
      },
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {
    "INV-001": {
      title: "設定ファイルと設定画面",
      behavior:
        "issue-runner.json のキーは repository、interval、model、assignee のままである。CURSOR_API_KEY が無いときは終了コード 1 で止まり、TUI を出さない。設定画面の項目は repository、interval、model、assignee のままである",
      verification: "src/config/index.test.ts と src/tui/index.test.ts と src/main/index.test.ts の、設定と API キー不足のテストが変更なしで通る",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: { decision: "baseline" },
    "性能・拡張性": { decision: "baseline" },
    "運用・保守性": { decision: "baseline" },
    移行性: {
      decision: "notApplicable",
      reason: "保存済みの設定やコメントの形を移さないため",
    },
    セキュリティ: { decision: "baseline" },
    "システム環境・エコロジー": {
      decision: "baseline",
      waived: {
        "BNFR-001":
          "画面の構成と終了キーは変えない。状態の文言だけが待機中と実行中になる。OS ごとの操作は既存の起動で確かめる",
      },
    },
  },
  issueCoverage: [
    {
      source: "開いている `agent:queued` の issue を間隔ごとに処理する",
      coveredBy: ["FR-001", "AC-001", "AC-002", "AC-011", "AC-017"],
    },
    {
      source: "各 issue は、spec 名の解決、ブランチのチェックアウト、`/sdd-impl`、`/sdd-finish`、ラベル更新の順で進む",
      coveredBy: ["FR-002", "AC-003", "AC-004", "AC-005"],
    },
    {
      source: "`agent:running` の issue は新規起動しない",
      coveredBy: ["FR-003", "AC-006", "AC-007"],
    },
    {
      source:
        "再起動後、`agent:running` のコメントに残した実行 ID から結末を調べ、`agent:done` または `agent:failed` へ反映する",
      coveredBy: ["FR-004", "AC-008", "AC-009", "AC-018"],
    },
    {
      source: "実行は同時に1件まで",
      coveredBy: ["FR-005", "AC-010", "AC-011"],
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は開発者本人だけである。権限の違いは無い。処理する issue は ADR-0008 のとおり、設定の repository と assignee に合うものだけである。AC-001 で確かめる",
    },
    dataStates: {
      result: "considered",
      note: "処理中は AC-020 で実行中、処理が無いときは AC-021 で待機中と表示する。失敗の画面は出さない",
    },
    inputValidation: {
      result: "considered",
      note: "実行 ID が無いときは AC-018 で agent:failed にし、終了コード 1、標準エラーは予期せぬ失敗が発生しましたである",
    },
    errorFeedback: {
      result: "considered",
      note: "作業ブランチの準備の失敗は AC-005 と AC-012、実行中のエラーは AC-013 で agent:failed にする。プロセスは AC-014、AC-015、AC-016 で終了コード 1 になり、標準エラーは失敗の理由である",
    },
    existingData: {
      result: "considered",
      note: "設定ファイルのキーは INV-001 のままである。再起動時の running は AC-008 と AC-009 で agent:failed にする",
    },
    consistency: {
      result: "considered",
      note: "成功時の最後のラベルは、既存の完了ラベルである agent:done にする。AC-003 で確かめる。付け替え規則そのものは対象外である",
    },
    outOfScope: {
      result: "considered",
      note: "spec 名の決め方、ラベル付け替えの規則、local agent の質問への回答は既存の issue のままにする",
    },
  },
  values: [
    {
      target: "起動画面の状態",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-020"],
          basis: { answer: "ANS-009" },
        },
        lineBreak: {
          decidedBy: ["AC-020"],
          basis: { answer: "ANS-009" },
        },
        empty: {
          decidedBy: ["AC-021"],
          basis: { answer: "ANS-009" },
        },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "再起動後の agent:running",
      aspect: "結末の決め方",
      answer: "再起動時は常に agent:failed にする。",
    },
    "ANS-002": {
      target: "agent:running",
      aspect: "ラベルを付ける時点",
      answer: "処理を始める前に実行 ID をコメントし、agent:running にする。",
    },
    "ANS-003": {
      target: "間隔",
      aspect: "1回で処理する件数",
      answer: "1件だけ処理し、次の issue は次の間隔まで待つ。",
    },
    "ANS-004": {
      target: "手順の失敗",
      aspect: "途中のラベル",
      answer: "その場で agent:failed にする。",
    },
    "ANS-005": {
      target: "手順の失敗",
      aspect: "プロセスを終えるか",
      answer: "終了コード 1 でプロセスを終え、標準エラーに失敗の理由を出す。",
    },
    "ANS-006": {
      target: "queued の issue",
      aspect: "処理する順",
      answer: "AIがissueの内容から優先順位を判断して決める。",
    },
    "ANS-007": {
      target: "同じ優先順位",
      aspect: "取る issue",
      answer: "issue 番号の小さいほうを取る。",
    },
    "ANS-008": {
      target: "実行 ID のコメント",
      aspect: "無いときの結果",
      answer: "agent:failed にし、終了コード 1、標準エラーは「予期せぬ失敗が発生しました」。",
    },
    "ANS-009": {
      target: "起動画面",
      aspect: "ポーリング中の表示",
      answer: "起動画面は残し、処理中は状態を「実行中」にする。処理中でなければ「待機中」のままである。",
    },
  },
  assumptions: [
    "間隔の分数は、既存の issue-runner.json の interval である",
    "実行 ID は、agent:running にするときにコメントへ残す小文字の UUID である",
  ],
  openQuestions: [],
  outOfScope: [
    "spec 名の決め方と、作業ブランチが0件または複数のときのコメント文",
    "agent:queued、agent:running、agent:done、agent:failed の付け替え規則そのもの",
    "local agent が人の判断を求めたときの回答",
  ],
});
