import { defineRequirements } from "../../sdd/schema/mod.ts";

export default defineRequirements({
  issue: "GH-8",
  summary:
    "終了コード 1 のときは標準エラーに理由を出す。API キーが空でも SDK 認証があれば起動を続け、キーも SDK 認証も無いときと、設定ファイルが JSON として読めないときは、決めた日本語を出して終了する。",
  functional: {
    "FR-001": {
      title: "認証が無いときの起動終了",
      ears: {
        pattern: "unwanted",
        condition: "CURSOR_API_KEY が trim 後に空で、かつ SDK の保存済み認証も無い",
        response:
          "終了コード 1 で止め、標準エラーに「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が未設定である", "SDK の保存済み認証が無い"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行である",
          ],
        },
        {
          id: "AC-002",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が半角空白3文字である", "SDK の保存済み認証が無い"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行である",
            "標準エラーに半角空白3文字だけは出ない",
          ],
        },
        {
          id: "AC-003",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "CURSOR_API_KEY が未設定である",
            "SDK の保存済み認証が無い",
            "プロセスの環境に秘密の文字列 sk-live-secret は無い",
          ],
          when: "プロセスを起動した",
          then: ["標準エラーに sk-live-secret も CURSOR_API_KEY の値も含まれない"],
        },
        {
          id: "AC-004",
          kind: "normal",
          verifiedBy: "human",
          given: ["CURSOR_API_KEY が未設定である", "SDK の保存済み認証が無い"],
          when: "プロセスを起動した",
          then: ["設定画面も起動画面も出ずにプロセスが終わる"],
        },
      ],
      priority: "must",
    },
    "FR-002": {
      title: "設定ファイルが JSON として読めないときの終了",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json が JSON として読めない、またはオブジェクトでない",
        response:
          "終了コード 1 で止め、標準エラーに「設定ファイルを読めません: issue-runner.json」を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-005",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue-runner.json の中身が { である", "CURSOR_API_KEY が sk-live-secret である"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」の1行である",
            "標準エラーに sk-live-secret が含まれない",
          ],
        },
        {
          id: "AC-006",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue-runner.json が空のファイルである"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」の1行である",
          ],
        },
        {
          id: "AC-011",
          kind: "error",
          verifiedBy: "automated",
          given: ["issue-runner.json の中身が [] である"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」の1行である",
          ],
        },
        {
          id: "AC-012",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue-runner.json の中身が null である"],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」の1行である",
          ],
        },
      ],
      priority: "must",
    },
    "FR-003": {
      title: "終了コード 1 では理由を出す",
      ears: {
        pattern: "unwanted",
        condition: "プロセスが終了コード 1 で終わる",
        response: "標準エラーに1文字以上の理由を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-007",
          kind: "normal",
          verifiedBy: "automated",
          given: ["ログイン処理が失敗する"],
          when: "ログインを実行した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「Cursor へのログインに失敗しました」の1行である",
          ],
        },
        {
          id: "AC-008",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["エージェントの実行結果が error で、失敗理由の文字列が無い"],
          when: "その issue を1件処理した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「予期せぬ失敗が発生しました」の1行である",
          ],
        },
        {
          id: "AC-010",
          kind: "normal",
          verifiedBy: "automated",
          given: ["エージェントの失敗理由が tool failed である"],
          when: "その issue を1件処理した",
          then: [
            "終了コードが 1 である",
            "標準エラーが tool failed の1行である",
            "標準エラーを日本語に置き換えない",
          ],
        },
        {
          id: "AC-009",
          kind: "error",
          verifiedBy: "automated",
          given: ["設定画面が保存成功として終わり、保存された設定が残っていない"],
          when: "設定フローが戻った",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定を保存できないため終了します」の1行である",
          ],
        },
      ],
      priority: "must",
    },
  },
  nonFunctional: {
    "NFR-001": {
      title: "終了理由に秘密を出さない",
      category: "セキュリティ",
      metric: "この issue が定める固定の終了理由に、API キーの値とトークンが含まれる件数",
      target: "0件",
      condition: "AC-001、AC-002、AC-005、AC-006 の終了理由",
      verification: "標準エラーの文字列に、与えた秘密の値とトークンが含まれないことを自動テストで確かめる",
    },
  },
  invariants: {
    "INV-001": {
      title: "SDK 認証があればキー無しで起動する",
      behavior:
        "CURSOR_API_KEY が trim 後に空でも、SDK の保存済み認証があれば、終了コード 1 にせず設定画面または起動画面へ進む",
      verification: "キーが空で SDK 認証があるときの既存の起動テストが、終了せずに画面へ進むことを確かめる",
      verifiedBy: "automated",
    },
    "INV-002": {
      title: "設定のキャンセルは終了コード 0",
      behavior: "設定画面をキャンセルしたときは終了コード 0 で終わり、標準エラーに終了理由を出さない",
      verification: "キャンセルで戻る既存のテストが終了コード 0 のままであることを確かめる",
      verifiedBy: "automated",
    },
    "INV-003": {
      title: "画面内の入力エラーでは終了しない",
      behavior:
        "設定画面の入力エラーは画面内のメッセージのままで、プロセスは終了コード 1 にならない",
      verification: "不正な repository を保存しようとした既存のテストが、プロセスを終了させないことを確かめる",
      verifiedBy: "automated",
    },
    "INV-004": {
      title: "設定ファイルの形式は変えない",
      behavior: "issue-runner.json の保存項目と読み取りに成功したときの形は変えない",
      verification: "設定の保存と読み取りの既存テストが、同じ JSON の形で通ることを確かめる",
      verifiedBy: "automated",
    },
    "INV-005": {
      title: "設定ファイルが無いときは設定画面へ進む",
      behavior: "issue-runner.json が無いときは終了コード 1 にせず、設定画面へ進む",
      verification: "設定ファイルが無いときの既存の起動テストが、設定画面へ進むことを確かめる",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: { decision: "baseline" },
    "性能・拡張性": { decision: "baseline" },
    "運用・保守性": { decision: "baseline" },
    移行性: { decision: "notApplicable", reason: "保存データの移し替えは行わない" },
    セキュリティ: { decision: "added", ids: ["NFR-001"] },
    "システム環境・エコロジー": {
      decision: "baseline",
      waived: {
        "BNFR-001": "画面の起動操作は変えず、終了時の標準エラーだけを扱うため",
      },
    },
  },
  issueCoverage: [
    {
      source: "API キー無しで起動 → 終了 1、stderr に原因と対処の短文（キー値は含まない）",
      coveredBy: ["FR-001", "AC-001", "AC-002", "AC-003", "NFR-001"],
    },
    {
      source: "壊れた JSON → 終了 1、既存の読み取りエラー文言",
      coveredBy: ["FR-002", "AC-005", "AC-006", "AC-011", "AC-012"],
    },
    {
      source: "既存の AC-004（TUI 非表示・終了 1）は維持",
      coveredBy: ["FR-001", "AC-001", "AC-004"],
    },
    {
      source: "ドキュメント／ADR が必要なら API キー周りのみ最小更新",
      excluded: "ADR-0014 が同じ終了条件と案内文を既に決めているため、文書は更新しない",
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は開発者本人だけである。権限の違いによる分岐は無い",
    },
    dataStates: {
      result: "considered",
      note: "設定ファイルが空のときの終了を AC-006 で扱った。ファイルが無いときは INV の対象で、設定画面へ進む",
    },
    inputValidation: {
      result: "considered",
      note: "API キーの未設定と空白だけを AC-001 と AC-002 で扱った。画面内の入力エラーは INV-003 で終了させない",
    },
    errorFeedback: {
      result: "considered",
      note: "認証不足は AC-001、壊れた JSON とオブジェクトでないファイルは AC-005 と AC-011、ログイン失敗は AC-007、理由が空のときは AC-008、設定が残らない終了は AC-009、SDK の英語の理由はそのまま AC-010 で決めた",
    },
    existingData: {
      result: "considered",
      note: "issue-runner.json の形は INV-004 で維持する。SDK 認証がある起動は INV-001 で維持する",
    },
    consistency: {
      result: "considered",
      note: "終了コード 1 の理由は標準エラーに限る。画面内メッセージとは INV-003 で分けた",
    },
    outOfScope: {
      result: "considered",
      note: "終了コード 0、終了コードが 1 以外、画面内エラー、列挙失敗でプロセスを終了しない経路を対象外にした",
    },
  },
  values: [
    {
      target: "認証不足の終了理由",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-001"],
          basis: { answer: "ANS-001" },
        },
        lineBreak: {
          decidedBy: ["AC-001"],
          basis: { answer: "ANS-001" },
        },
        empty: {
          decidedBy: ["AC-001"],
          basis: { answer: "ANS-001" },
        },
      },
    },
    {
      target: "設定ファイル読み取り失敗の終了理由",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-005"],
          basis: { issue: "「設定ファイルを読めません: issue-runner.json」" },
        },
        lineBreak: {
          decidedBy: ["AC-005"],
          basis: { code: "src/config/index.ts" },
        },
        empty: {
          decidedBy: ["AC-005"],
          basis: { issue: "壊れた JSON → 終了 1、既存の読み取りエラー文言" },
        },
      },
    },
    {
      target: "理由が空の終了コード 1",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-008"],
          basis: { answer: "ANS-007" },
        },
        lineBreak: {
          decidedBy: ["AC-008"],
          basis: { answer: "ANS-008" },
        },
        empty: {
          decidedBy: ["AC-008"],
          basis: { answer: "ANS-004" },
        },
      },
    },
    {
      target: "設定が残っていない終了理由",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-009"],
          basis: { answer: "ANS-009" },
        },
        lineBreak: {
          decidedBy: ["AC-009"],
          basis: { answer: "ANS-010" },
        },
        empty: {
          decidedBy: ["AC-009"],
          basis: { answer: "ANS-005" },
        },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "CURSOR_API_KEY が未設定・空・空白だけのときの起動",
      aspect: "終了コード 1 にする条件",
      answer:
        "キーが空で、かつ SDK 認証も無いときだけ終了 1。既存の「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」を stderr に出す。SDK 認証があれば起動を続ける。",
    },
    "ANS-002": {
      target: "終了コード 1 の経路",
      aspect: "stderr の有無",
      answer: "ログインとポーリングを含め、終了コード 1 の全経路で stderr に理由を出す。",
    },
    "ANS-003": {
      target: "SDK が返した失敗理由",
      aspect: "日本語への言い換え",
      answer: "1文字以上あれば英語のまま出す。空のときだけ、別に決める日本語を出す。",
    },
    "ANS-004": {
      target: "理由が空の終了コード 1",
      aspect: "値が空のときの表示",
      answer: "予期せぬ失敗が発生しました",
    },
    "ANS-005": {
      target: "設定が残っていない終了理由",
      aspect: "値が空のときの表示",
      answer: "設定を保存できないため終了します",
    },
    "ANS-006": {
      target: "オブジェクトでない設定ファイル",
      aspect: "終了時の文言",
      answer: "設定ファイルを読めません: issue-runner.json を出して終了 1 にする",
    },
    "ANS-007": {
      target: "理由が空の終了コード 1",
      aspect: "長い値の見せ方",
      answer: "省略しない。決めた文をすべて出す",
    },
    "ANS-008": {
      target: "理由が空の終了コード 1",
      aspect: "改行を含む値の見せ方",
      answer: "文の途中では改行しない。1行として出す",
    },
    "ANS-009": {
      target: "設定が残っていない終了理由",
      aspect: "長い値の見せ方",
      answer: "省略しない。決めた文をすべて出す",
    },
    "ANS-010": {
      target: "設定が残っていない終了理由",
      aspect: "改行を含む値の見せ方",
      answer: "文の途中では改行しない。1行として出す",
    },
  },
  assumptions: [
    "SDK の保存済み認証が使えるかは、認証ファイルのサイズが 1 バイト以上かで判定する",
  ],
  openQuestions: [],
  outOfScope: [
    "終了コード 0 の終了",
    "終了コードが 1 以外の終了",
    "設定画面の入力エラー（画面内のメッセージのまま、プロセスは終了しない）",
    "issue の列挙失敗（標準エラーには出すが、プロセスは終了コード 1 にしない）",
    "API キー周りのドキュメントと ADR の更新",
  ],
});
