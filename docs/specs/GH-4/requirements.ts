import { defineRequirements } from "../../sdd/schema/mod.ts";

export default defineRequirements({
  issue: "GH-4",
  summary:
    "対象チェックアウトで Cursor SDK の local agent を1件だけ動かし、/sdd-impl を実行する。/sdd-finish は実行せず、PR の URL も返さない。",
  functional: {
    "FR-001": {
      title: "実行ディレクトリ",
      ears: {
        pattern: "event",
        trigger: "local agent を起動した",
        response: "local.cwd を、渡された対象リポジトリのチェックアウトにしなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "automated",
          given: ["対象チェックアウトが /home/dev/widgets である"],
          when: "local agent を起動する",
          then: ["local.cwd が /home/dev/widgets である"],
        },
        {
          id: "AC-002",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["対象チェックアウトが /home/dev/widgets である", "issue-runner を起動したディレクトリは /home/dev/runner である"],
          when: "local agent を起動する",
          then: ["local.cwd が /home/dev/widgets である"],
        },
      ],
      notApplicable: {
        error: "ディレクトリが読めないときは、起動前の失敗として AC-034 と同じく終了コード 1 と失敗の文を出す",
      },
      priority: "must",
    },
    "FR-002": {
      title: "設定の読み込み元",
      ears: {
        pattern: "ubiquitous",
        response: "local.settingSources を [\"project\"] にしなければならない",
      },
      acceptance: [
        {
          id: "AC-003",
          kind: "normal",
          verifiedBy: "automated",
          given: ["対象チェックアウトが /home/dev/widgets である"],
          when: "local agent を起動する",
          then: ["local.settingSources が [\"project\"] である"],
        },
        {
          id: "AC-004",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["対象チェックアウトの外に、利用者の設定がある"],
          when: "local agent を起動する",
          then: ["local.settingSources が [\"project\"] だけである"],
        },
      ],
      notApplicable: {
        error: "settingSources は固定値で、呼び出しごとの不正な入力が無い",
      },
      priority: "must",
    },
    "FR-003": {
      title: "モデル",
      ears: {
        pattern: "ubiquitous",
        response: "local agent のモデルを composer-2.5 にしなければならない",
      },
      acceptance: [
        {
          id: "AC-005",
          kind: "normal",
          verifiedBy: "automated",
          given: ["対象チェックアウトが /home/dev/widgets である"],
          when: "local agent を起動する",
          then: ["モデルが composer-2.5 である"],
        },
        {
          id: "AC-006",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue-runner.json の model が gpt である"],
          when: "local agent を起動する",
          then: ["モデルが composer-2.5 である"],
        },
      ],
      notApplicable: {
        error: "モデルは composer-2.5 に固定され、別のモデル名を受け取らない",
      },
      priority: "must",
    },
    "FR-004": {
      title: "同時実行は1件",
      ears: {
        pattern: "state",
        state: "local agent を1件実行している",
        response: "issue のポーリングを停止し、別の local agent を起動してはならない",
      },
      acceptance: [
        {
          id: "AC-007",
          kind: "normal",
          verifiedBy: "automated",
          given: ["実行中の local agent が0件である", "spec 名が GH-3 である"],
          when: "local agent の実行を1件始める",
          then: ["実行中の local agent が1件である"],
        },
        {
          id: "AC-008",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 3 の local agent を1件実行している", "issue 4 が agent:queued である"],
          when: "ポーリングの時刻になる",
          then: ["issue 4 の local agent は起動しない"],
        },
        {
          id: "AC-031",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 3 の実行が成功して終わった", "issue 4 が agent:queued である"],
          when: "次のポーリングを行う",
          then: ["issue 4 の local agent を1件起動できる"],
        },
        {
          id: "AC-032",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue 3 の run の result.status が error で終わった", "その文が tool failed である", "issue 4 が agent:queued である"],
          when: "その失敗を伝える",
          then: ["issue-runner のプロセスが終了コード 1 で終わる", "標準エラーが tool failed である", "issue 4 の local agent は起動しない"],
        },
        {
          id: "AC-033",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue 3 の起動が CursorAgentError で終わった", "その文が missing CURSOR_API_KEY である", "issue 4 が agent:queued である"],
          when: "その失敗を伝える",
          then: ["issue-runner のプロセスが終了コード 1 で終わる", "issue 4 の local agent は起動しない"],
        },
      ],
      priority: "must",
    },
    "FR-005": {
      title: "最初のプロンプト",
      ears: {
        pattern: "event",
        trigger: "local agent の最初の run を送った",
        response: "プロンプトを /sdd-impl だけにしなければならない",
      },
      acceptance: [
        {
          id: "AC-009",
          kind: "normal",
          verifiedBy: "automated",
          given: ["対象チェックアウトが /home/dev/widgets である"],
          when: "最初の run を送る",
          then: ["プロンプトが /sdd-impl である"],
        },
        {
          id: "AC-010",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である"],
          when: "最初の run を送る",
          then: ["プロンプトが /sdd-impl である"],
        },
        {
          id: "AC-036",
          kind: "error",
          verifiedBy: "automated",
          given: ["spec 名が空である"],
          when: "最初の run を送る",
          then: ["プロンプトが /sdd-impl である"],
        },
      ],
      priority: "must",
    },
    "FR-008": {
      title: "wait の呼び出し",
      ears: {
        pattern: "ubiquitous",
        response: "各 run で wait() を呼ばなければならない",
      },
      acceptance: [
        {
          id: "AC-013",
          kind: "normal",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "最初の run が完了する"],
          when: "その run の結果を受け取る",
          then: ["その run で wait() を1回呼ぶ"],
        },
        {
          id: "AC-014",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "最初の run の result.status が error である"],
          when: "その run の結果を受け取る",
          then: ["その run で wait() を1回呼ぶ"],
        },
      ],
      notApplicable: {
        error: "wait() が起動前に失敗した場合の区別は FR-009 で扱う",
      },
      priority: "must",
    },
    "FR-009": {
      title: "失敗の区別",
      ears: {
        pattern: "unwanted",
        condition: "起動前の失敗と実行中の失敗が起きた",
        response: "CursorAgentError と result.status が error である結果を、別の結果として返さなければならない",
      },
      acceptance: [
        {
          id: "AC-015",
          kind: "normal",
          verifiedBy: "automated",
          given: ["起動が CursorAgentError で失敗する"],
          when: "local agent を起動する",
          then: ["結果が、実行中の失敗の結果と異なる"],
        },
        {
          id: "AC-034",
          kind: "error",
          verifiedBy: "automated",
          given: ["起動が CursorAgentError で失敗する", "その文が missing CURSOR_API_KEY である"],
          when: "local agent を起動する",
          then: ["終了コードが 1 である", "標準エラーが missing CURSOR_API_KEY である"],
        },
        {
          id: "AC-016",
          kind: "error",
          verifiedBy: "automated",
          given: ["run が完了し、result.status が error である"],
          when: "その run の wait() の結果を受け取る",
          then: ["結果が、CursorAgentError の結果と異なる"],
        },
      ],
      notApplicable: {
        boundary: "区別する失敗は起動前と実行中の2種類で、3種類目の境界が無い",
      },
      priority: "must",
    },
    "FR-010": {
      title: "人の判断は AI が答える",
      ears: {
        pattern: "unwanted",
        condition: "スキルが人の判断を求めて停止した",
        response: "失敗として終えず、fast ではない composer-2.5 がその質問に答えなければならない",
      },
      acceptance: [
        {
          id: "AC-017",
          kind: "normal",
          verifiedBy: "automated",
          given: ["最初の run が、未コミット変更の扱いを尋ねて停止した"],
          when: "その質問に答える",
          then: ["プロセスは終了コード 1 で終わらない", "回答を出すモデルが composer-2.5 であり fast ではない", "その回答を同じエージェントへ送る"],
        },
        {
          id: "AC-018",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["最初の run が、質問を1件だけ出して停止した"],
          when: "その質問に答える",
          then: ["回答が1件である"],
        },
        {
          id: "AC-035",
          kind: "error",
          verifiedBy: "automated",
          given: ["最初の run が、未コミット変更の扱いを尋ねて停止した", "回答の生成が失敗し、その文が model unavailable である"],
          when: "その質問に答える",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーが model unavailable である", "同じエージェントへ回答を送らない"],
        },
        {
          id: "AC-037",
          kind: "normal",
          verifiedBy: "automated",
          given: ["判断の JSON が {\"kind\":\"question\",\"text\":\"未コミット変更をどうしますか\"} である"],
          when: "その判断を受け取る",
          then: ["同じエージェントへ未コミット変更をどうしますかを送る", "プロセスは終了コード 1 で終わらない"],
        },
        {
          id: "AC-039",
          kind: "error",
          verifiedBy: "automated",
          given: ["判断の返答が not-json である"],
          when: "その判断を受け取る",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーが判断の JSON を読めませんでしたである", "追加のプロンプトを送らない"],
        },
        {
          id: "AC-040",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["判断の JSON が {\"kind\":\"question\",\"text\":\"\"} である"],
          when: "その判断を受け取る",
          then: ["プロセスが終了コード 1 で終わる", "標準エラーが判断の JSON を読めませんでしたである"],
        },
      ],
      priority: "must",
    },
    "FR-011": {
      title: "確認を失敗にしない",
      ears: {
        pattern: "unwanted",
        condition: "スキルが PR 作成以外の確認を求めて停止した",
        response: "その確認を失敗として返してはならない",
      },
      acceptance: [
        {
          id: "AC-019",
          kind: "normal",
          verifiedBy: "automated",
          given: ["最初の run が、未コミット変更の扱いを尋ねて停止した"],
          when: "その質問に答える",
          then: ["標準エラーに失敗の文を出さない"],
        },
        {
          id: "AC-020",
          kind: "error",
          verifiedBy: "automated",
          given: ["最初の run が、ブランチ名の確認を尋ねて停止した"],
          when: "その質問に答える",
          then: ["プロセスは終了コード 1 で終わらない"],
        },
      ],
      notApplicable: {
        boundary: "確認の件数に上限が無い",
      },
      priority: "must",
    },
    "FR-013": {
      title: "追加のプロンプトを送らない",
      ears: {
        pattern: "ubiquitous",
        response: "受け入れテストは合格。PRを作成する。と /sdd-finish を送ってはならない",
      },
      acceptance: [
        {
          id: "AC-028",
          kind: "normal",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "最初の run が完了した"],
          when: "実行結果を受け取る",
          then: ["受け入れテストは合格。PRを作成する。を送らない", "/sdd-finish を送らない"],
        },
        {
          id: "AC-029",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "最初の run の result.status が error である"],
          when: "その run の結果を受け取る",
          then: ["受け入れテストは合格。PRを作成する。を送らない", "/sdd-finish を送らない"],
        },
        {
          id: "AC-030",
          kind: "error",
          verifiedBy: "automated",
          given: ["起動が CursorAgentError で失敗する"],
          when: "local agent を起動する",
          then: ["受け入れテストは合格。PRを作成する。を送らない", "/sdd-finish を送らない"],
        },
        {
          id: "AC-038",
          kind: "normal",
          verifiedBy: "automated",
          given: ["判断の JSON が {\"kind\":\"done\"} である"],
          when: "その判断を受け取る",
          then: ["追加のプロンプトを送らない"],
        },
      ],
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {
    "INV-001": {
      title: "起動と設定と TUI とラベル遷移",
      behavior:
        "CURSOR_API_KEY が無いときは終了コード 1 で止まり、TUI を出さない。設定が揃っているときは、起動画面にリポジトリ、間隔の分、モデル、担当者、状態 待機中、終了キー q を表示する。issue-runner.json のキーは repository、interval、model、assignee のままである。ラベルの付け替えとコメントは、この実行の結果では変えない",
      verification:
        "src/main/index.test.ts と src/config/index.test.ts と src/tui/index.test.ts と src/github のテストが、変更なしで通る",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: {
      decision: "notApplicable",
      reason: "プロセスを起動し続けることではなく、1件の local agent の成功と失敗を決めるため",
    },
    "性能・拡張性": { decision: "baseline" },
    "運用・保守性": { decision: "baseline" },
    移行性: {
      decision: "notApplicable",
      reason: "保存済みの設定や issue のデータを移さないため",
    },
    セキュリティ: { decision: "baseline" },
    "システム環境・エコロジー": {
      decision: "baseline",
      waived: { "BNFR-001": "起動画面の表示と終了は変えず、INV-001 の既存テストで確かめるため" },
    },
  },
  issueCoverage: [
    {
      source:
        "`local.cwd` は対象リポジトリのチェックアウト、`local.settingSources` は `[\"project\"]`、モデルは `composer-2.5`",
      coveredBy: ["FR-001", "AC-001", "FR-002", "AC-003", "FR-003", "AC-005"],
    },
    {
      source: "同時に実行するのは1件まで",
      coveredBy: ["FR-004", "AC-007", "AC-008"],
    },
    {
      source: "最初のプロンプトは `/sdd-impl {spec名}`（例: `/sdd-impl GH-3`）",
      excluded: "spec 名は付けない。プロンプトは /sdd-impl だけである。ANS-012",
    },
    {
      source:
        "それが完了したら、同じエージェントへ「受け入れテストは合格。PRを作成する。」と送り、`/sdd-finish` を実行する",
      excluded: "/sdd-finish は実行しない。やりたいことは実装と MR 作成である。ANS-002",
    },
    {
      source:
        "各 run で `wait()` を呼び、起動前の失敗（`CursorAgentError`）と実行中の失敗（`result.status === \"error\"`）を区別する",
      coveredBy: ["FR-008", "AC-013", "FR-009", "AC-015", "AC-016"],
    },
    {
      source:
        "スキルが人の判断を求めて停止した場合は失敗として返し、未コミット変更の扱いなど、PR 作成以外の確認には答えない",
      excluded: "失敗にしない。質問には fast ではない composer-2.5 が答える。ANS-008",
    },
    {
      source: "作成された PR の URL を結果として返す",
      excluded: "返す必要は無い。/sdd-finish を実行する想定の名残である。ANS-011",
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は開発者本人だけである。権限の違いによる分岐は無く、API キーが無いときの起動は INV-001 のままである",
    },
    dataStates: {
      result: "considered",
      note: "実行中が0件のときを AC-007、実行中はポーリングを止めることを AC-008、成功のあとの再開を AC-031、起動前の失敗でプロセスが終わることを AC-033、実行中の失敗でプロセスが終わることを AC-032 で扱う",
    },
    inputValidation: {
      result: "considered",
      note: "プロンプトは常に /sdd-impl である。空の spec 名でも変えないことを AC-036、spec 名があっても付けないことを AC-010 で扱う",
    },
    errorFeedback: {
      result: "considered",
      note: "失敗の種類が異なることは AC-015 と AC-016 で扱う。起動前は AC-034、実行中は AC-032、回答の生成失敗は AC-035 で伝える",
    },
    existingData: {
      result: "considered",
      note: "起動画面、issue-runner.json のキー、ラベル遷移は INV-001 で変えない",
    },
    consistency: {
      result: "considered",
      note: "プロンプトは /sdd-impl だけである。spec 名、合格の文、/sdd-finish は付けない。ANS-002、ANS-003、ANS-012",
    },
    outOfScope: {
      result: "considered",
      note: "spec 名と作業ブランチの解決、ラベルの付け替え、起動画面、/sdd-finish は対象外である。実行中のポーリング停止と終了後の再開は AC-008、AC-031、AC-032 で扱う",
    },
  },
  values: [
    {
      target: "最初のプロンプト",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-009"], basis: { answer: "ANS-012" } },
        lineBreak: { decidedBy: ["AC-009"], basis: { answer: "ANS-012" } },
        empty: { decidedBy: ["AC-036"], basis: { answer: "ANS-012" } },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "続きの送信",
      aspect: "最初の run が成功以外のとき",
      answer: "送らない。失敗として返す。",
    },
    "ANS-002": {
      target: "続きの送信",
      aspect: "sdd-finish",
      answer: "実行しない。完了条件が間違っている。やりたいことは実装と MR 作成である。",
    },
    "ANS-003": {
      target: "続きの送信",
      aspect: "固定文を送るか",
      answer: "/sdd-impl だけ送る。合格の文は送らない。",
    },
    "ANS-004": {
      target: "同時実行",
      aspect: "2件目の結果",
      answer: "実行中の1件が終わるまでポーリングは停止する。完了後にポーリングが再開する。",
    },
    "ANS-005": {
      target: "失敗の結果",
      aspect: "起動前の失敗の伝え方",
      answer: "終了コード 1。標準エラーに CursorAgentError の文を出す。",
    },
    "ANS-006": {
      target: "起動前の失敗",
      aspect: "プロセスを終えるか",
      answer: "issue-runner のプロセスを終了コード 1 で終える。",
    },
    "ANS-007": {
      target: "失敗の結果",
      aspect: "実行中の失敗の伝え方",
      answer: "プロセスを終了コード 1 で終える。標準エラーに実行中のエラー文を出す。",
    },
    "ANS-008": {
      target: "失敗の結果",
      aspect: "人の判断で止まったときの伝え方",
      answer: "失敗として伝えない。質問には fast ではない composer-2.5 が答える。",
    },
    "ANS-009": {
      target: "人の判断",
      aspect: "回答の送り先",
      answer: "同じエージェントへ送り、実行を続ける。",
    },
    "ANS-010": {
      target: "人の判断",
      aspect: "回答の生成に失敗したとき",
      answer: "プロセスを終了コード 1 で終える。標準エラーに生成の失敗文を出す。",
    },
    "ANS-011": {
      target: "PR の URL",
      aspect: "出す場所",
      answer: "返さない。/sdd-finish を実行する想定の名残なので、必要なくなった。",
    },
    "ANS-012": {
      target: "最初のプロンプト",
      aspect: "値が空のとき",
      answer: "最初から /sdd-impl だけでよい。spec 名は付けない。",
    },
    "ANS-013": {
      target: "判断の JSON",
      aspect: "形",
      answer: "質問は {\"kind\":\"question\",\"text\":\"...\"}、完了は {\"kind\":\"done\"}。",
    },
    "ANS-014": {
      target: "判断の JSON",
      aspect: "読めないとき",
      answer: "終了コード 1。標準エラーは「判断の JSON を読めませんでした」。",
    },
  },
  assumptions: [
    "対象チェックアウトは、作業ブランチを解決する issue の結果として渡される",
    "API キーは環境変数 CURSOR_API_KEY から読む",
  ],
  openQuestions: [],
  outOfScope: [
    "spec 名の決定と作業ブランチのチェックアウト",
    "agent ラベルの付け替え",
    "起動画面と issue-runner.json のキー",
    "クラウド上のエージェント実行",
    "/sdd-finish の実行",
    "PR の URL を結果として返すこと",
  ],
});
