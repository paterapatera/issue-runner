import { defineRequirements } from "../../sdd/schema/mod.ts";

// 要件（docs/specs/GH-1/requirements.ts）。
// 書き方: docs/sdd/guides/writing-requirements.md
export default defineRequirements({
  issue: "GH-1",
  summary:
    "開発者が手元で issue-runner を起動すると、設定ファイルを読んで TUI を表示する。CURSOR_API_KEY が無いときは起動しない。issue の取得、ラベル更新、エージェントの実行はしない。",
  functional: {
    "FR-001": {
      title: "起動時の画面構成",
      ears: {
        pattern: "event",
        trigger: "開発者がプロセスを起動した",
        response:
          "カレントディレクトリの issue-runner.json の repository、interval、model、assignee を上段に、状態を中段に、終了キーを下段に、端末の既定色と太字だけの強調で表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が設定されている",
          ],
          when: "プロセスを起動した",
          then: [
            "画面の上段に acme/widgets と 2分 と composer-2.5 と octocat が表示される",
            "画面の中段に「待機中」と表示される",
            "画面の下段に終了キー q が表示される",
            "色のついた文字は無く、強調は太字だけである",
          ],
        },
      ],
      notApplicable: {
        boundary: "三つの領域を出す規則には、件数や回数の境界が無い。値の長さの見せ方は各表示の観点で扱う",
        error: "起動の前提が欠けた失敗は、API キーが無いときの FR-003 と、まだ決めていない入力の拒否で扱う",
      },
      priority: "must",
    },
    "FR-002": {
      title: "モデルの既定",
      ears: {
        pattern: "event",
        trigger: "モデルを指定せずにプロセスを起動した",
        response: "モデルを composer-2.5 として扱わなければならない",
      },
      acceptance: [
        {
          id: "AC-002",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json に model の項目が無い",
            "環境変数 CURSOR_API_KEY が設定されている",
          ],
          when: "プロセスを起動した",
          then: ["画面の上段のモデルが composer-2.5 と表示される"],
        },
        {
          id: "AC-003",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が other-model である",
            "環境変数 CURSOR_API_KEY が設定されている",
          ],
          when: "プロセスを起動した",
          then: ["画面の上段のモデルが other-model と表示される"],
        },
      ],
      notApplicable: {
        error: "モデルの指定が無いときに既定値を入れる規則は、失敗で止めない。途中の改行の拒否は AC-068 である",
      },
      priority: "must",
    },
    "FR-003": {
      title: "API キーが無いときの起動失敗",
      ears: {
        pattern: "unwanted",
        condition: "環境変数 CURSOR_API_KEY が無い",
        response: "終了コード 1 で起動を失敗させなければならない",
      },
      acceptance: [
        {
          id: "AC-004",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が無い",
          ],
          when: "プロセスを起動した",
          then: ["終了コードが 1 である", "TUI を表示しない"],
        },
        {
          id: "AC-005",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される"],
        },
        {
          id: "AC-051",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が空文字である",
          ],
          when: "プロセスを起動した",
          then: ["終了コードが 1 である", "TUI を表示しない", "設定画面を表示しない"],
        },
        {
          id: "AC-052",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が半角スペース3個である",
          ],
          when: "プロセスを起動した",
          then: ["終了コードが 1 である", "TUI を表示しない", "設定画面を表示しない"],
        },
      ],
      priority: "must",
    },
    "FR-004": {
      title: "API キーの値を出さない",
      ears: {
        pattern: "ubiquitous",
        response: "API キーの値を画面に出してはならない",
      },
      acceptance: [
        {
          id: "AC-006",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
          ],
          when: "プロセスを起動した",
          then: ["画面のどの段にも sk-test-123 という文字列が無い"],
        },
      ],
      notApplicable: {
        boundary: "キーの値は長さによらず画面に出さない。長さで結果が変わらない",
        error: "値を出さない規則には、失敗して別の結果になる分岐が無い。キーが無いときの起動失敗は FR-003 である",
      },
      priority: "must",
    },
    "FR-005": {
      title: "GitHub の資格情報を扱わない",
      ears: {
        pattern: "ubiquitous",
        response: "GitHub のトークンを設定として読まず、起動時にトークンの入力を求めてはならない",
      },
      acceptance: [
        {
          id: "AC-007",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "GitHub のトークンは環境変数にも設定ファイルにも無い",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される", "GitHub のトークンを入力する問いかけが画面に出ない"],
        },
      ],
      notApplicable: {
        boundary: "トークンを受け取らないため、トークンの長さや個数の境界は無い",
        error: "この issue は GitHub の操作を行わない。gh の認証失敗はこの起動では起きない",
      },
      priority: "must",
    },
    "FR-006": {
      title: "設定ファイルが無いときの設定画面",
      ears: {
        pattern: "event",
        trigger: "カレントディレクトリに issue-runner.json が無い状態で開発者がプロセスを起動した",
        response: "設定画面を表示し、確定の操作で設定ファイルを作成できなければならない",
      },
      acceptance: [
        {
          id: "AC-008",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["issue-runner.json を作るための設定画面が表示される"],
        },
        {
          id: "AC-009",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が無い",
          ],
          when: "プロセスを起動した",
          then: ["終了コードが 1 である", "設定画面を表示しない"],
        },
        {
          id: "AC-010",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面の repository が acme/widgets である",
            "設定画面の interval が 2 分である",
            "設定画面の model が composer-2.5 である",
            "設定画面の assignee が octocat である",
          ],
          when: "Enter を押した",
          then: [
            "カレントディレクトリに issue-runner.json が書かれる",
            "repository が acme/widgets である",
            "interval が 2 分である",
            "model が composer-2.5 である",
            "assignee が octocat である",
          ],
        },
      ],
      notApplicable: {
        boundary: "ファイルが無いことがこの要件の条件であり、件数や回数の境界は無い",
      },
      priority: "must",
    },
    "FR-007": {
      title: "設定を書いたあとの起動画面",
      ears: {
        pattern: "event",
        trigger: "設定画面で Enter を押し issue-runner.json を書いた",
        response: "上段にその設定、中段に状態、下段に終了キーを表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-011",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面の repository が acme/widgets である",
            "設定画面の interval が 2 分である",
            "設定画面の model が composer-2.5 である",
            "設定画面の assignee が octocat である",
          ],
          when: "Enter を押した",
          then: [
            "起動画面の上段に acme/widgets と 2分 と composer-2.5 と octocat が表示される",
            "中段に「待機中」と表示される",
            "下段に終了キー q が表示される",
          ],
        },
      ],
      notApplicable: {
        boundary: "ファイルを書いたあとに起動画面を出す規則には、件数や回数の境界が無い",
        error: "ファイルを書けたあとの画面遷移であり、書けなかったときはこの遷移をしない。書き込み失敗は別の観点である",
      },
      priority: "must",
    },
    "FR-008": {
      title: "起動画面の終了",
      ears: {
        pattern: "event",
        trigger: "起動画面で q を押した",
        response: "終了コード 0 でプロセスを終わらせなければならない",
      },
      acceptance: [
        {
          id: "AC-012",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "起動画面が表示されている",
          ],
          when: "q を押した",
          then: ["終了コードが 0 である"],
        },
      ],
      notApplicable: {
        boundary: "起動画面で q を1回押して終わる操作に、件数や回数の境界は無い",
        error: "この操作は終了コード 0 で終わり、失敗して別の結果になる分岐は無い",
      },
      priority: "must",
    },
    "FR-009": {
      title: "設定画面での q",
      ears: {
        pattern: "complex",
        state: "設定画面を表示している",
        trigger: "q を押した",
        response: "q を終了ではなく入力中の項目の文字として入れなければならない",
      },
      acceptance: [
        {
          id: "AC-013",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "入力中の項目が assignee で、その時点の文字が octoca である",
          ],
          when: "q を押した",
          then: ["assignee が octocat と表示される", "設定画面のままである"],
        },
      ],
      notApplicable: {
        boundary: "q を1文字入れる操作に、件数や回数の境界は無い。長さの上限は各項目の観点である",
        error: "文字として入れる操作に、失敗して別の結果になる分岐は無い",
      },
      priority: "must",
    },
    "FR-010": {
      title: "設定画面の中断",
      ears: {
        pattern: "complex",
        state: "設定画面を表示している",
        trigger: "Ctrl+C を押した",
        response: "ファイルを書かずに終了コード 0 でプロセスを終わらせなければならない",
      },
      acceptance: [
        {
          id: "AC-014",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "入力中の assignee が octoca である",
          ],
          when: "Ctrl+C を押した",
          then: ["終了コードが 0 である", "issue-runner.json が無い"],
        },
      ],
      notApplicable: {
        boundary: "Ctrl+C を1回押して終わる操作に、件数や回数の境界は無い",
        error: "この操作は終了コード 0 で終わり、失敗して別の結果になる分岐は無い",
      },
      priority: "must",
    },
    "FR-011": {
      title: "起動画面の中断",
      ears: {
        pattern: "event",
        trigger: "起動画面で Ctrl+C を押した",
        response: "終了コード 0 でプロセスを終わらせなければならない",
      },
      acceptance: [
        {
          id: "AC-015",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "起動画面が表示されている",
          ],
          when: "Ctrl+C を押した",
          then: ["終了コードが 0 である"],
        },
      ],
      notApplicable: {
        boundary: "起動画面で Ctrl+C を1回押して終わる操作に、件数や回数の境界は無い",
        error: "この操作は終了コード 0 で終わり、失敗して別の結果になる分岐は無い",
      },
      priority: "must",
    },
    "FR-012": {
      title: "読めない設定ファイル",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json が JSON として読めない",
        response:
          "終了コード 1 で起動を失敗させ、標準エラーに「設定ファイルを読めません: issue-runner.json」と出さなければならない",
      },
      acceptance: [
        {
          id: "AC-016",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: [
            "起動画面が表示される",
            "「設定ファイルを読めません: issue-runner.json」は表示されない",
          ],
        },
        {
          id: "AC-017",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json が 0 バイトである",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」である",
            "起動画面を表示しない",
            "設定画面を表示しない",
          ],
        },
        {
          id: "AC-018",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json の内容が { である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: [
            "終了コードが 1 である",
            "標準エラーが「設定ファイルを読めません: issue-runner.json」である",
            "起動画面を表示しない",
            "設定画面を表示しない",
          ],
        },
      ],
      priority: "must",
    },
    "FR-013": {
      title: "リポジトリが無いときの設定画面",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json に repository が無い",
        response: "設定画面を表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-019",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json に repository の項目が無い",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "起動画面は表示されない"],
        },
        {
          id: "AC-020",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリの issue-runner.json に repository の項目が無い",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が無い",
          ],
          when: "プロセスを起動した",
          then: ["終了コードが 1 である", "設定画面を表示しない"],
        },
        {
          id: "AC-055",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が半角スペース3個である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "起動画面は表示されない"],
        },
      ],
      priority: "must",
    },
    "FR-014": {
      title: "空の repository で確定しない",
      ears: {
        pattern: "complex",
        state: "設定画面で repository が空である",
        trigger: "Enter を押した",
        response:
          "ファイルを書かず設定画面に留まり、「repository を入力してください」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-021",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["「repository を入力してください」は表示されない"],
        },
        {
          id: "AC-022",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が空である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「repository を入力してください」と表示される",
          ],
        },
        {
          id: "AC-054",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が半角スペース3個である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「repository を入力してください」と表示される",
          ],
        },
      ],
      priority: "must",
    },
    "FR-015": {
      title: "間隔とモデルの既定を入力する",
      ears: {
        pattern: "event",
        trigger: "未入力の interval か model がある状態で設定画面を表示した",
        response: "未入力の interval には 1、未入力の model には composer-2.5 を入れておかなければならない",
      },
      acceptance: [
        {
          id: "AC-023",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面の interval が 1分 と表示される", "設定画面の model が composer-2.5 と表示される"],
        },
        {
          id: "AC-024",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json に repository の項目が無い",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が other-model である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面の interval が 2分 と表示される", "設定画面の model が other-model と表示される"],
        },
        {
          id: "AC-025",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json に interval の項目が無い",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段の間隔が 1分 と表示される"],
        },
      ],
      notApplicable: {
        error: "未入力へ既定を入れる規則は、失敗で止めない",
      },
      priority: "must",
    },
    "FR-016": {
      title: "assignee の既定",
      ears: {
        pattern: "event",
        trigger: "assignee が未入力のまま設定画面を表示した",
        response: "gh が返すログイン名を assignee に入れておかなければならない",
      },
      notes:
        "ログイン名は、実行環境の gh が認証しているユーザーの login である。入力された assignee は GitHub のユーザー名と同じ規則にする。英数字とハイフンだけで、1文字以上39文字以下、先頭と末尾はハイフンにせず、ハイフンは連続させない。",
      acceptance: [
        {
          id: "AC-026",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "gh が返すログイン名が octocat である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面の assignee が octocat と表示される"],
        },
        {
          id: "AC-027",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json に repository の項目が無い",
            "カレントディレクトリの issue-runner.json の assignee が other-user である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が other-model である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "gh が返すログイン名が octocat である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面の assignee が other-user と表示される"],
        },
        {
          id: "AC-040",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が a を39個並べた文字列である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される"],
        },
        {
          id: "AC-041",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "gh がログイン名を返せない",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "assignee は空である"],
        },
      ],
      priority: "must",
    },
    "FR-021": {
      title: "空の assignee で確定しない",
      ears: {
        pattern: "complex",
        state: "設定画面で assignee が空である",
        trigger: "Enter を押した",
        response:
          "ファイルを書かず設定画面に留まり、「assignee を入力してください」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-042",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "gh がログイン名を返せない",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が空である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["設定画面のままである", "「assignee を入力してください」と表示される"],
        },
        {
          id: "AC-043",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["「assignee を入力してください」は表示されない"],
        },
      ],
      notApplicable: {
        boundary: "空であることがこの操作の条件である。空白だけの値は別の観点であり、件数の境界は無い",
      },
      priority: "must",
    },
    "FR-022": {
      title: "無効な assignee で確定しない",
      ears: {
        pattern: "unwanted",
        condition: "assignee が GitHub のユーザー名として認められない",
        response:
          "ファイルを書かず設定画面に留まり、「assignee は GitHub のユーザー名で入力してください」と表示しなければならない",
      },
      notes:
        "空は FR-021 で扱う。それ以外で、英数字とハイフン以外を含む、先頭か末尾がハイフン、ハイフンが連続する、40文字以上、のときはこの文言にする。",
      acceptance: [
        {
          id: "AC-044",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["「assignee は GitHub のユーザー名で入力してください」は表示されない"],
        },
        {
          id: "AC-045",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が -octo である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「assignee は GitHub のユーザー名で入力してください」と表示される",
          ],
        },
      ],
      notApplicable: {
        boundary: "39文字の有効な名前は AC-040 で受け付ける。40文字は無効な名前としてこの異常系と同じ文言にする",
      },
      priority: "must",
    },
    "FR-017": {
      title: "間隔の最小",
      ears: {
        pattern: "unwanted",
        condition: "設定画面の interval が 1分 未満である",
        response:
          "ファイルを書かず設定画面に留まり、「interval は 1分 以上にしてください」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-028",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段の間隔が 1分 と表示される"],
        },
        {
          id: "AC-029",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 0 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["設定画面のままである", "「interval は 1分 以上にしてください」と表示される"],
        },
        {
          id: "AC-030",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段の間隔が 2分 と表示される"],
        },
        {
          id: "AC-048",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 100000 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段の間隔が 100000分 と表示される"],
        },
      ],
      priority: "must",
    },
    "FR-018": {
      title: "間隔は整数",
      ears: {
        pattern: "unwanted",
        condition: "設定画面の interval に小数が含まれる",
        response:
          "ファイルを書かず設定画面に留まり、「interval は整数で入力してください」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-031",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段の間隔が 2分 と表示される"],
        },
        {
          id: "AC-032",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1.5 である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["設定画面のままである", "「interval は整数で入力してください」と表示される"],
        },
      ],
      notApplicable: {
        boundary: "1 は整数として最小値の要件で受け付ける。小数の失敗は 1.5 で確かめる",
      },
      priority: "must",
    },
    "FR-019": {
      title: "リポジトリ名は gh と同じ",
      ears: {
        pattern: "unwanted",
        condition: "repository が GitHub の owner/repo として認められない",
        response:
          "ファイルを書かず設定画面に留まり、「repository は owner/repo の形で入力してください」と表示しなければならない",
      },
      notes:
        "gh で指定できる owner/repo に合わせる。owner は英数字とハイフンだけで、1文字以上39文字以下、先頭と末尾はハイフンにせず、ハイフンは連続させない。repo は英数字とピリオド、ハイフン、アンダースコアだけで、1文字以上100文字以下、末尾は .git でない。スラッシュは owner と repo のあいだに1つだけ。GitHub 上に実在するかは見ない。",
      acceptance: [
        {
          id: "AC-033",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が a/b である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に a/b と表示される"],
        },
        {
          id: "AC-034",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "設定画面が表示されている",
            "repository の owner が a を39個並べた文字列で、repo が b を100個並べた文字列である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される"],
        },
        {
          id: "AC-035",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「repository は owner/repo の形で入力してください」と表示される",
          ],
        },
        {
          id: "AC-053",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が 半角スペース、acme/widgets、半角スペース の順である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に acme/widgets と表示される"],
        },
      ],
      priority: "must",
    },
    "FR-023": {
      title: "設定ファイルを書けない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json をディスクに書けない",
        response:
          "設定画面に留まり、「設定ファイルを書けません: issue-runner.json」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-046",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json を書ける",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["「設定ファイルを書けません: issue-runner.json」は表示されない"],
        },
        {
          id: "AC-047",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "カレントディレクトリに issue-runner.json を書けない",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「設定ファイルを書けません: issue-runner.json」と表示される",
            "プロセスは終了しない",
          ],
        },
      ],
      notApplicable: {
        boundary: "書けるか書けないかの二値であり、件数や回数の境界は無い",
      },
      priority: "must",
    },
    "FR-024": {
      title: "間隔は半角数字",
      ears: {
        pattern: "unwanted",
        condition: "interval に半角数字以外が含まれる",
        response:
          "ファイルを書かず設定画面に留まり、「interval は半角数字で入力してください」と表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-049",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 2 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段の間隔が 2分 と表示される"],
        },
        {
          id: "AC-050",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリに issue-runner.json が無い",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval の入力が １ である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["設定画面のままである", "「interval は半角数字で入力してください」と表示される"],
        },
      ],
      notApplicable: {
        boundary: "1 は半角数字として最小値の要件で受け付ける。全角の １ を異常系にする",
      },
      priority: "must",
    },
    "FR-025": {
      title: "リポジトリの改行",
      ears: {
        pattern: "event",
        trigger: "repository の前後の空白を除いた",
        response: "末尾の改行は除き、途中の改行は owner/repo として拒否しなければならない",
      },
      acceptance: [
        {
          id: "AC-075",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に acme/widgets と表示される"],
        },
        {
          id: "AC-056",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets の直後に改行がある",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に acme/widgets と表示される"],
        },
        {
          id: "AC-057",
          kind: "error",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme、改行、/widgets の順である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「repository は owner/repo の形で入力してください」と表示される",
          ],
        },
      ],
      priority: "must",
    },
    "FR-026": {
      title: "assignee の空白と1文字",
      ears: {
        pattern: "event",
        trigger: "assignee を確定した",
        response:
          "前後の空白と末尾の改行を除き、空白だけは未入力とし、1文字のユーザー名は受け付けなければならない",
      },
      acceptance: [
        {
          id: "AC-058",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が半角スペース、octocat、半角スペース の順である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に octocat と表示される"],
        },
        {
          id: "AC-059",
          kind: "error",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が半角スペース3個である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「assignee を入力してください」と表示される",
          ],
        },
        {
          id: "AC-060",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が a である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["issue-runner.json の assignee が a である"],
        },
        {
          id: "AC-061",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat の直後に改行がある",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に octocat と表示される"],
        },
        {
          id: "AC-062",
          kind: "error",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octo、改行、cat の順である",
            "interval が 1 分である",
            "model が composer-2.5 である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "「assignee は GitHub のユーザー名で入力してください」と表示される",
          ],
        },
      ],
      priority: "must",
    },
    "FR-027": {
      title: "モデルは空でなければ受け付ける",
      ears: {
        pattern: "event",
        trigger: "model を確定した",
        response:
          "前後の空白を除き、空なら composer-2.5 とし、途中の改行は受け付けず、それ以外は上限なしで受け付けなければならない",
      },
      acceptance: [
        {
          id: "AC-063",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が半角スペース、composer-2.5、半角スペース の順である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に composer-2.5 と表示される"],
        },
        {
          id: "AC-064",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が半角スペース3個である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に composer-2.5 と表示される"],
        },
        {
          id: "AC-065",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が あ である",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に あ と表示される"],
        },
        {
          id: "AC-066",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が m を1000個並べた文字列である",
          ],
          when: "Enter を押した",
          then: ["issue-runner.json の model が m を1000個並べた文字列である"],
        },
        {
          id: "AC-067",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が composer-2.5 の直後に改行がある",
          ],
          when: "Enter を押した",
          then: ["起動画面が表示される", "上段に composer-2.5 と表示される"],
        },
        {
          id: "AC-068",
          kind: "error",
          verifiedBy: "human",
          given: [
            "設定画面が表示されている",
            "repository が acme/widgets である",
            "assignee が octocat である",
            "interval が 1 分である",
            "model が a、改行、b の順である",
          ],
          when: "Enter を押した",
          then: [
            "設定画面のままである",
            "起動画面は表示されない",
            "「model に改行は使えません」と表示される",
          ],
        },
      ],
      priority: "must",
    },
    "FR-028": {
      title: "API キーは空白を除いて空でなければ起動する",
      ears: {
        pattern: "event",
        trigger: "環境変数 CURSOR_API_KEY の前後の空白を除いた",
        response: "空でなければ TUI を表示し、キーの値は出してはならない",
      },
      acceptance: [
        {
          id: "AC-069",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が x である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される"],
        },
        {
          id: "AC-070",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が x を1000個並べた文字列である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される", "画面に x を1000個並べた文字列は出ない"],
        },
        {
          id: "AC-071",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が半角スペース、sk-test-123、半角スペース の順である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される", "画面に sk-test-123 は出ない"],
        },
        {
          id: "AC-072",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 の直後に改行がある",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される"],
        },
        {
          id: "AC-073",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が あ である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される", "画面に あ は出ない"],
        },
        {
          id: "AC-074",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk、改行、123 の順である",
          ],
          when: "プロセスを起動した",
          then: ["TUI が表示される"],
        },
      ],
      notApplicable: {
        error: "空と空白だけは AC-051 と AC-052 で起動に失敗する。それ以外の文字列は拒否しない",
      },
      priority: "must",
    },
    "FR-029": {
      title: "長いリポジトリ名は折り返す",
      ears: {
        pattern: "ubiquitous",
        response: "上段の監視リポジトリは、端末の幅を超えても全体を折り返して見せなければならない",
      },
      acceptance: [
        {
          id: "AC-076",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository の owner が a を39個並べた文字列で、repo が b を100個並べた文字列である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "端末の幅が80文字である",
          ],
          when: "プロセスを起動した",
          then: ["上段に owner の39文字と repo の100文字がすべて見える"],
        },
        {
          id: "AC-077",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["上段に acme/widgets と表示される"],
        },
      ],
      notApplicable: {
        error: "長いことの境界であり、表示そのものが失敗する操作は無い",
      },
      priority: "must",
    },
    "FR-030": {
      title: "改行を含むリポジトリは起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の repository に改行が含まれる",
        response: "起動画面を出さず、設定画面を表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-078",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme、改行、/widgets の順である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "起動画面は表示されない"],
        },
        {
          id: "AC-079",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に acme/widgets と表示される"],
        },
      ],
      notApplicable: {
        boundary: "改行が1つあることがこの要件の条件である。改行の個数による境目は無い",
      },
      priority: "must",
    },
    "FR-031": {
      title: "空のリポジトリは起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の repository が空文字である",
        response: "起動画面を出さず、設定画面を表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-080",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が空文字である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "起動画面は表示されない"],
        },
        {
          id: "AC-081",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に acme/widgets と表示される"],
        },
      ],
      notApplicable: {
        boundary: "空文字であることがこの要件の条件である。空白だけは AC-055 で扱う",
      },
      priority: "must",
    },
    "FR-032": {
      title: "長い assignee は折り返す",
      ears: {
        pattern: "ubiquitous",
        response: "上段の assignee は、端末の幅を超えても全体を折り返して見せなければならない",
      },
      acceptance: [
        {
          id: "AC-082",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が a を39個並べた文字列である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "端末の幅が20文字である",
          ],
          when: "プロセスを起動した",
          then: ["上段に a を39個並べた文字列がすべて見える"],
        },
        {
          id: "AC-083",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["上段に octocat と表示される"],
        },
      ],
      notApplicable: {
        error: "長いことの境界であり、表示そのものが失敗する操作は無い",
      },
      priority: "must",
    },
    "FR-033": {
      title: "改行を含む assignee は起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の assignee に改行が含まれる",
        response: "起動画面を出さず、設定画面を表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-084",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octo、改行、cat の順である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["設定画面が表示される", "起動画面は表示されない"],
        },
        {
          id: "AC-085",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に octocat と表示される"],
        },
      ],
      notApplicable: {
        boundary: "改行が1つあることがこの要件の条件である。改行の個数による境目は無い",
      },
      priority: "must",
    },
    "FR-034": {
      title: "空の assignee は起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の assignee が空文字である",
        response: "起動画面を出さず、設定画面を表示しなければならない",
      },
      notes:
        "設定画面では、空の項目に既定値があるとき、その既定値を入力欄へ出す。assignee の既定値は gh が返すログイン名である。",
      acceptance: [
        {
          id: "AC-086",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が空文字である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "gh が返すログイン名が octocat である",
          ],
          when: "プロセスを起動した",
          then: [
            "設定画面が表示される",
            "起動画面は表示されない",
            "設定画面の assignee が octocat と表示される",
          ],
        },
        {
          id: "AC-087",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に octocat と表示される"],
        },
      ],
      notApplicable: {
        boundary: "空文字であることがこの要件の条件である。空白だけは AC-059 で扱う",
      },
      priority: "must",
    },
    "FR-035": {
      title: "長いモデル名は折り返す",
      ears: {
        pattern: "ubiquitous",
        response: "上段のモデルは、端末の幅を超えても全体を折り返して見せなければならない",
      },
      acceptance: [
        {
          id: "AC-088",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が m を40個並べた文字列である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "端末の幅が20文字である",
          ],
          when: "プロセスを起動した",
          then: ["上段に m を40個並べた文字列がすべて見える"],
        },
        {
          id: "AC-089",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["上段に composer-2.5 と表示される"],
        },
      ],
      notApplicable: {
        error: "長いことの境界であり、表示そのものが失敗する操作は無い",
      },
      priority: "must",
    },
    "FR-036": {
      title: "改行を含むモデルは起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の model の途中に改行が含まれる",
        response: "起動画面を出さず、設定画面を表示しなければならない",
      },
      acceptance: [
        {
          id: "AC-090",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が a、改行、b の順である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: [
            "設定画面が表示される",
            "起動画面は表示されない",
            "「model に改行は使えません」と表示される",
          ],
        },
        {
          id: "AC-091",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に composer-2.5 と表示される"],
        },
      ],
      notApplicable: {
        boundary: "途中の改行が1つあることがこの要件の条件である。末尾の改行は AC-067 で除く",
      },
      priority: "must",
    },
    "FR-037": {
      title: "空のモデルは起動画面に出さない",
      ears: {
        pattern: "unwanted",
        condition: "issue-runner.json の model が空文字である",
        response: "起動画面を出さず、設定画面の入力欄に composer-2.5 を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-092",
          kind: "error",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が空文字である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: [
            "設定画面が表示される",
            "起動画面は表示されない",
            "設定画面の model が composer-2.5 と表示される",
          ],
        },
        {
          id: "AC-093",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "上段に composer-2.5 と表示される"],
        },
      ],
      notApplicable: {
        boundary: "空文字であることがこの要件の条件である。項目が無いときは AC-002 で起動画面に composer-2.5 を出す",
      },
      priority: "must",
    },
    "FR-038": {
      title: "長い状態は折り返す",
      ears: {
        pattern: "ubiquitous",
        response: "中段の状態は、端末の幅を超えても全体を折り返して見せなければならない",
      },
      acceptance: [
        {
          id: "AC-094",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "端末の幅が2文字である",
          ],
          when: "プロセスを起動した",
          then: ["中段に 待機中 の3文字がすべて見える"],
        },
        {
          id: "AC-095",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["中段に 待機中 と表示される"],
        },
        {
          id: "AC-096",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["中段に出す文字列が 待、改行、機中 の順である"],
          when: "起動画面の中段を描画した",
          then: ["1行目が 待 である", "2行目が 機中 である"],
        },
      ],
      notApplicable: {
        error: "長いことの境界であり、表示そのものが失敗する操作は無い",
      },
      priority: "must",
      notes: "状態に改行が含まれるときは、その位置で行を分ける。この issue が出す状態は「待機中」だけで、改行は含まない",
    },
    "FR-039": {
      title: "長い終了キーは折り返す",
      ears: {
        pattern: "ubiquitous",
        response: "下段の終了キーは、端末の幅を超えても全体を折り返して見せなければならない",
      },
      acceptance: [
        {
          id: "AC-097",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
            "端末の幅が1文字である",
          ],
          when: "プロセスを起動した",
          then: ["下段に q が見える"],
        },
        {
          id: "AC-098",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["下段に q と表示される"],
        },
      ],
      notApplicable: {
        error: "長いことの境界であり、表示そのものが失敗する操作は無い",
      },
      priority: "must",
    },
    "FR-040": {
      title: "終了キーの改行は行を分ける",
      ears: {
        pattern: "event",
        trigger: "下段の終了キーに改行が含まれる",
        response: "その位置で行を分けて見せなければならない",
      },
      acceptance: [
        {
          id: "AC-099",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["下段に出す文字列が q、改行、q の順である"],
          when: "起動画面の下段を描画した",
          then: ["1行目が q である", "2行目が q である"],
        },
        {
          id: "AC-100",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "カレントディレクトリの issue-runner.json の repository が acme/widgets である",
            "カレントディレクトリの issue-runner.json の assignee が octocat である",
            "カレントディレクトリの issue-runner.json の interval が 2 分である",
            "カレントディレクトリの issue-runner.json の model が composer-2.5 である",
            "環境変数 CURSOR_API_KEY が sk-test-123 である",
          ],
          when: "プロセスを起動した",
          then: ["下段に q と1行で表示される"],
        },
      ],
      notApplicable: {
        error: "改行の見せ方であり、失敗して別の結果になる分岐は無い",
      },
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {},
  noInvariantsReason: "新規のプロセスであり、既存の呼び出し元、公開API、保存データが無いため",
  nfrReview: {
    可用性: {
      decision: "notApplicable",
      reason: "常時稼働するサービスではなく、開発者が起動して終了する手元のプロセスの土台であるため",
    },
    "性能・拡張性": {
      decision: "notApplicable",
      reason: "応答時間や同時利用の目標は issue に無く、ポーリングとエージェントの実行は対象外であるため",
    },
    "運用・保守性": { decision: "baseline" },
    移行性: {
      decision: "notApplicable",
      reason: "既存の保存データが無く、移行が無いため",
    },
    セキュリティ: { decision: "baseline" },
    "システム環境・エコロジー": { decision: "baseline" },
  },
  issueCoverage: [
    {
      source: "`src/main.ts`、`src/config.ts`、`src/tui.ts` を置き、依存は architecture.ts のとおりにする",
      excluded:
        "ファイルの配置とモジュールの依存は受け入れ条件にしない。規約を gate で強制し、sdd-impl と finish-report が gate.ts で確かめる",
    },
    {
      source:
        "設定で、監視するリポジトリ（owner/repo）、ローカルのチェックアウト、ポーリング間隔、モデル（既定は composer-2.5）を渡せる",
      coveredBy: ["FR-001", "FR-002", "AC-001", "AC-002", "AC-003"],
    },
    {
      source: "`CURSOR_API_KEY` が無いときは終了コード 1 で起動に失敗する。API キーの値は出さない",
      coveredBy: ["FR-003", "FR-004", "FR-006", "AC-004", "AC-006", "AC-009"],
    },
    {
      source: "GitHub の操作は実行環境の `gh` 認証を使う",
      coveredBy: ["FR-005", "AC-007"],
    },
    {
      source:
        "TUI は @opentui/core 0.6.6 で、上段に設定、中段に状態、下段に終了キーを出す。色は端末の既定、強調は太字だけ",
      coveredBy: ["FR-001", "AC-001"],
    },
    {
      source:
        "Biome 2.5.15、dependency-cruiser 18.6.0（parser は swc）、@swc/core 1.16.18、Knip 6.41.0、jscpd 5.4.1、TypeScript 7.0.2 を導入する",
      excluded:
        "ツールの導入そのものは受け入れ条件にしない。品質ゲートの実行は sdd-impl と finish-report が gate.ts で確かめる",
    },
    {
      source:
        "`docs/sdd/config.ts` の commands に format、check、test を登録する。package.json の script 名は check にしない。型検査は `bun --check`",
      excluded:
        "品質ゲートの登録そのものは受け入れ条件にしない。sdd-impl と finish-report が gate.ts で確かめる",
    },
    {
      source: "閾値は認知的複雑度 12、関数本体 60 行、引数 4、jscpd 0%（5 行または 50 トークン未満は見ない）",
      excluded: "閾値の設定そのものは受け入れ条件にしない。規約を gate で強制する",
    },
    {
      source: "`bun test` で、設定のテストが1件、TUI のフレーム比較が1件動く",
      excluded:
        "テストの本数は受け入れ条件にしない。設定の読み取りと TUI の表示は FR-001 と FR-002 の受け入れ条件で確かめ、テストの実装はタスクで行う",
    },
    {
      source: "導入したツールで強制できる規約は、conventions.ts の enforcedBy を gate に変える",
      excluded: "規約の強制方法は受け入れ条件にしない。gate の設定としてタスクで行う",
    },
    {
      source: "`bun docs/sdd/scripts/gate.ts` が通る",
      excluded: "品質ゲートが通ることは受け入れ条件にしない。sdd-impl と finish-report が gate.ts で確かめる",
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は手元で起動する開発者本人だけである。権限の違いによる分岐は無く、AC-001 と AC-007 でその利用者の起動を扱う",
    },
    dataStates: {
      result: "considered",
      note: "モデルの指定が無い状態は AC-002、指定がある状態は AC-003、API キーが無い状態は AC-004 で扱う。一覧データは無い",
    },
    inputValidation: {
      result: "considered",
      note: "モデルの省略は AC-002、空文字は AC-092、CURSOR_API_KEY の欠如と空文字と空白だけは AC-004、AC-051、AC-052 で扱う。repository、assignee、interval の形式と上限は各受け入れ条件で扱う",
    },
    errorFeedback: {
      result: "considered",
      note: "API キーが無いときの終了コードは AC-004、設定の拒否文言は AC-022、AC-029、AC-032、AC-035、AC-042、AC-045、AC-047、AC-050、AC-068 で扱う",
    },
    existingData: {
      result: "notApplicable",
      note: "既存の保存データと既存の画面が無く、移行も無い",
    },
    consistency: {
      result: "considered",
      note: "設定、状態、終了キー、CURSOR_API_KEY、モデルの既定 composer-2.5 は issue の語にそろえた",
    },
    outOfScope: {
      result: "considered",
      note: "issue の取得、ラベル更新、エージェントの実行、発火、Web の画面、ブラウザの E2E、品質ゲートそのものの成否を対象外にした。assignee は設定として AC-001 で出す",
    },
  },
  values: [
    {
      target: "監視するリポジトリ",
      kind: "textInput",
      aspects: {
        required: { decidedBy: ["AC-019"], basis: { answer: "ANS-021" } },
        minLength: { decidedBy: ["AC-033"], basis: { answer: "ANS-033" } },
        maxLength: { decidedBy: ["AC-034"], basis: { answer: "ANS-033" } },
        blankOnly: { decidedBy: ["AC-054", "AC-055"], basis: { answer: "ANS-046" } },
        surroundingSpace: { decidedBy: ["AC-053"], basis: { answer: "ANS-045" } },
        lineBreak: { decidedBy: ["AC-056", "AC-057"], basis: { answer: "ANS-047" } },
        characters: { decidedBy: ["AC-033", "AC-035"], basis: { answer: "ANS-033" } },
        unique: { notApplicable: "重複の確認はしない", basis: { answer: "ANS-048" } },
        relation: { notApplicable: "他の項目とは連動させない", basis: { answer: "ANS-049" } },
        rejection: { decidedBy: ["AC-022", "AC-035"], basis: { answer: "ANS-034" } },
      },
    },
    {
      target: "ローカルのチェックアウト",
      kind: "textInput",
      aspects: {
        required: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        minLength: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        maxLength: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        blankOnly: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        surroundingSpace: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        lineBreak: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        characters: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        unique: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        relation: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        rejection: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
      },
    },
    {
      target: "ポーリング間隔",
      kind: "numberInput",
      aspects: {
        required: { decidedBy: ["AC-023", "AC-025"], basis: { answer: "ANS-029" } },
        min: { decidedBy: ["AC-028", "AC-029"], basis: { answer: "ANS-029" } },
        max: { decidedBy: ["AC-048"], basis: { answer: "ANS-040" } },
        fraction: { decidedBy: ["AC-032"], basis: { answer: "ANS-031" } },
        notation: { decidedBy: ["AC-050"], basis: { answer: "ANS-041" } },
        relation: { notApplicable: "他の項目とは連動させない", basis: { answer: "ANS-056" } },
        rejection: { decidedBy: ["AC-029"], basis: { answer: "ANS-030" } },
      },
    },
    {
      target: "assignee",
      kind: "textInput",
      aspects: {
        required: { decidedBy: ["AC-026"], basis: { answer: "ANS-035" } },
        minLength: { decidedBy: ["AC-060"], basis: { answer: "ANS-035" } },
        maxLength: { decidedBy: ["AC-040"], basis: { answer: "ANS-035" } },
        blankOnly: { decidedBy: ["AC-059"], basis: { answer: "ANS-047" } },
        surroundingSpace: { decidedBy: ["AC-058"], basis: { answer: "ANS-047" } },
        lineBreak: { decidedBy: ["AC-061", "AC-062"], basis: { answer: "ANS-047" } },
        characters: { decidedBy: ["AC-026"], basis: { answer: "ANS-035" } },
        unique: { notApplicable: "重複の確認はしない", basis: { answer: "ANS-050" } },
        relation: { notApplicable: "他の項目とは連動させない", basis: { answer: "ANS-051" } },
        rejection: { decidedBy: ["AC-042", "AC-045"], basis: { answer: "ANS-038" } },
      },
    },
    {
      target: "モデル",
      kind: "textInput",
      aspects: {
        required: {
          decidedBy: ["AC-002"],
          basis: { issue: "モデル（既定は composer-2.5）" },
        },
        minLength: { decidedBy: ["AC-065"], basis: { answer: "ANS-047" } },
        maxLength: { decidedBy: ["AC-066"], basis: { answer: "ANS-047" } },
        blankOnly: { decidedBy: ["AC-064"], basis: { answer: "ANS-047" } },
        surroundingSpace: { decidedBy: ["AC-063"], basis: { answer: "ANS-047" } },
        lineBreak: { decidedBy: ["AC-067", "AC-068"], basis: { answer: "ANS-064" } },
        characters: { decidedBy: ["AC-065"], basis: { answer: "ANS-047" } },
        unique: { notApplicable: "重複の確認はしない", basis: { answer: "ANS-052" } },
        relation: { notApplicable: "他の項目とは連動させない", basis: { answer: "ANS-053" } },
        rejection: { decidedBy: ["AC-068"], basis: { answer: "ANS-065" } },
      },
    },
    {
      target: "CURSOR_API_KEY",
      kind: "textInput",
      aspects: {
        required: {
          decidedBy: ["AC-004", "AC-051"],
          basis: { answer: "ANS-043" },
        },
        minLength: { decidedBy: ["AC-069"], basis: { answer: "ANS-047" } },
        maxLength: { decidedBy: ["AC-070"], basis: { answer: "ANS-047" } },
        blankOnly: { decidedBy: ["AC-052"], basis: { answer: "ANS-044" } },
        surroundingSpace: { decidedBy: ["AC-071"], basis: { answer: "ANS-047" } },
        lineBreak: { decidedBy: ["AC-072", "AC-074"], basis: { answer: "ANS-047" } },
        characters: { decidedBy: ["AC-073", "AC-074"], basis: { answer: "ANS-047" } },
        unique: { notApplicable: "重複の確認はしない", basis: { answer: "ANS-054" } },
        relation: { notApplicable: "設定項目とは連動させない", basis: { answer: "ANS-055" } },
        rejection: { decidedBy: ["AC-004", "AC-051", "AC-052"], basis: { answer: "ANS-044" } },
      },
    },
    {
      target: "上段の監視リポジトリ",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-076"], basis: { answer: "ANS-057" } },
        lineBreak: { decidedBy: ["AC-078"], basis: { answer: "ANS-058" } },
        empty: { decidedBy: ["AC-080"], basis: { answer: "ANS-059" } },
      },
    },
    {
      target: "上段のチェックアウト",
      kind: "textDisplay",
      aspects: {
        long: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        lineBreak: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
        empty: { notApplicable: "設定にも画面にも置かない", basis: { answer: "ANS-024" } },
      },
    },
    {
      target: "上段のポーリング間隔",
      kind: "numberDisplay",
      aspects: {
        format: { decidedBy: ["AC-001"], basis: { answer: "ANS-029" } },
        unit: { decidedBy: ["AC-023"], basis: { answer: "ANS-029" } },
        empty: { decidedBy: ["AC-025"], basis: { answer: "ANS-029" } },
      },
    },
    {
      target: "上段の assignee",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-082"], basis: { answer: "ANS-060" } },
        lineBreak: { decidedBy: ["AC-084"], basis: { answer: "ANS-061" } },
        empty: { decidedBy: ["AC-086"], basis: { answer: "ANS-062" } },
      },
    },
    {
      target: "上段のモデル",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-088"], basis: { answer: "ANS-063" } },
        lineBreak: { decidedBy: ["AC-090"], basis: { answer: "ANS-064" } },
        empty: { decidedBy: ["AC-092"], basis: { answer: "ANS-066" } },
      },
    },
    {
      target: "中段の状態",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-094"], basis: { answer: "ANS-067" } },
        lineBreak: { decidedBy: ["AC-096"], basis: { answer: "ANS-068" } },
        empty: { decidedBy: ["AC-001"], basis: { answer: "ANS-012" } },
      },
    },
    {
      target: "下段の終了キー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-097"], basis: { answer: "ANS-069" } },
        lineBreak: { decidedBy: ["AC-099"], basis: { answer: "ANS-070" } },
        empty: { decidedBy: ["AC-098"], basis: { answer: "ANS-071" } },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "監視設定",
      aspect: "渡し方",
      answer: "設定ファイルで渡す",
    },
    "ANS-002": {
      target: "設定ファイル",
      aspect: "形式",
      answer: "JSON",
    },
    "ANS-003": {
      target: "設定ファイル",
      aspect: "パス",
      answer: "起動時のカレントディレクトリの issue-runner.json",
    },
    "ANS-004": {
      target: "設定ファイル",
      aspect: "項目名",
      answer:
        "repository、checkout、interval、model に、ユーザー名の項目も加える。アサインされたユーザーとラベルがどちらも一致したときに発火させたい",
    },
    "ANS-005": {
      target: "ユーザー名",
      aspect: "JSONのキー",
      answer: "assignee",
    },
    "ANS-006": {
      target: "発火",
      aspect: "このissueの範囲",
      answer: "この issue では作らない。発火は後の issue",
    },
    "ANS-007": {
      target: "設定ファイル",
      aspect: "ファイルが無いときの結果",
      answer: "設定画面を表示して作成する",
    },
    "ANS-008": {
      target: "設定画面",
      aspect: "APIキーが無いときの順",
      answer: "先に終了コード 1。設定画面は出さない",
    },
    "ANS-009": {
      target: "設定画面",
      aspect: "ファイルを書く操作",
      answer: "確定の操作をしたときに、その時点の入力を書く",
    },
    "ANS-010": {
      target: "設定画面",
      aspect: "確定のキー",
      answer: "Enter",
    },
    "ANS-011": {
      target: "設定画面",
      aspect: "確定後の画面",
      answer: "起動画面（上段が設定、中段が状態、下段が終了キー）にする",
    },
    "ANS-012": {
      target: "中段の状態",
      aspect: "起動直後の文言",
      answer: "待機中",
    },
    "ANS-013": {
      target: "終了キー",
      aspect: "表示するキー名",
      answer: "q",
    },
    "ANS-014": {
      target: "終了キー",
      aspect: "押したときの結果",
      answer: "起動画面では終了コード 0 でプロセスが終わる",
    },
    "ANS-015": {
      target: "設定画面",
      aspect: "qを押したときの結果",
      answer: "文字として入力する。終了には使わない",
    },
    "ANS-016": {
      target: "設定画面",
      aspect: "保存せずに閉じる操作",
      answer: "Ctrl+C でファイルを書かず終了コード 0 で終わる",
    },
    "ANS-017": {
      target: "起動画面",
      aspect: "Ctrl+Cを押したときの結果",
      answer: "終了コード 0 でプロセスが終わる",
    },
    "ANS-018": {
      target: "設定ファイル",
      aspect: "JSONとして読めないときの結果",
      answer:
        "終了コード 1、起動画面も設定画面も出さない。標準エラーに「設定ファイルを読めません: issue-runner.json」と出す",
    },
    "ANS-019": {
      target: "上段のポーリング間隔",
      aspect: "単位",
      answer: "秒",
    },
    "ANS-020": {
      target: "上段のポーリング間隔",
      aspect: "表示の形式",
      answer: "30秒",
    },
    "ANS-021": {
      target: "監視するリポジトリ",
      aspect: "未入力のときに受け付けるか",
      answer: "未入力では起動画面に進まず、設定画面を開く",
    },
    "ANS-022": {
      target: "設定画面",
      aspect: "repositoryが空のEnter",
      answer:
        "書かずに留まり「repository を入力してください」と出す。他の必須項目やバリデーションに引っかかるときも、エラーメッセージを出して留まる",
    },
    "ANS-023": {
      target: "ローカルのチェックアウト",
      aspect: "指すもの",
      answer: "パスもブランチも保つ必要がない",
    },
    "ANS-024": {
      target: "ローカルのチェックアウト",
      aspect: "設定項目として置くか",
      answer: "設定にも画面にも置かない",
    },
    "ANS-025": {
      target: "ポーリング間隔",
      aspect: "未入力のときに受け付けるか",
      answer: "未入力のときはデフォルトを入力する。interval のデフォルトは 60秒。モデルも同様",
    },
    "ANS-026": {
      target: "assignee",
      aspect: "未入力のときに受け付けるか",
      answer: "未入力は受け付けない",
    },
    "ANS-027": {
      target: "assignee",
      aspect: "受け付けないときに利用者へ返す結果",
      answer: "ファイルを書かず設定画面に留まり、「assignee を入力してください」と表示する",
    },
    "ANS-028": {
      target: "ポーリング間隔",
      aspect: "最小値",
      answer: "60秒",
    },
    "ANS-029": {
      target: "ポーリング間隔",
      aspect: "単位",
      answer: "分にする。既定と最小は 1分、画面は 1分",
    },
    "ANS-030": {
      target: "ポーリング間隔",
      aspect: "受け付けないときに利用者へ返す結果",
      answer: "ファイルを書かず設定画面に留まり、「interval は 1分 以上にしてください」と表示する",
    },
    "ANS-031": {
      target: "ポーリング間隔",
      aspect: "小数を受け付けるか",
      answer: "小数は受け付けない",
    },
    "ANS-032": {
      target: "ポーリング間隔",
      aspect: "小数のときの文言",
      answer: "ファイルを書かず設定画面に留まり、「interval は整数で入力してください」と表示する",
    },
    "ANS-033": {
      target: "監視するリポジトリ",
      aspect: "受け付ける文字の種類",
      answer: "gh で指定できるのと同じ仕様",
    },
    "ANS-034": {
      target: "監視するリポジトリ",
      aspect: "受け付けないときに利用者へ返す結果",
      answer:
        "空のときは「repository を入力してください」。owner/repo として認められないときは「repository は owner/repo の形で入力してください」。どちらもファイルを書かず設定画面に留まる",
    },
    "ANS-035": {
      target: "assignee",
      aspect: "受け付ける文字の種類",
      answer: "GitHub のユーザー名と同じ。デフォルトは自身のユーザー名",
    },
    "ANS-036": {
      target: "assignee",
      aspect: "ghがログイン名を返せないとき",
      answer: "assignee を空のまま設定画面を出す",
    },
    "ANS-037": {
      target: "設定画面",
      aspect: "空のassigneeでEnter",
      answer: "書かずに留まり「assignee を入力してください」と出す",
    },
    "ANS-038": {
      target: "assignee",
      aspect: "受け付けないときに利用者へ返す結果",
      answer:
        "空のときは「assignee を入力してください」。ユーザー名として認められないときは「assignee は GitHub のユーザー名で入力してください」。どちらもファイルを書かず設定画面に留まる",
    },
    "ANS-039": {
      target: "設定画面",
      aspect: "書き込み失敗の結果",
      answer: "設定画面に留まり「設定ファイルを書けません: issue-runner.json」と出す。プロセスは終了しない",
    },
    "ANS-040": {
      target: "ポーリング間隔",
      aspect: "最大値",
      answer: "上限は設けない",
    },
    "ANS-041": {
      target: "ポーリング間隔",
      aspect: "数字以外の書き方",
      answer: "半角数字だけ",
    },
    "ANS-042": {
      target: "ポーリング間隔",
      aspect: "半角数字以外のときの文言",
      answer: "ファイルを書かず設定画面に留まり、「interval は半角数字で入力してください」と表示する",
    },
    "ANS-043": {
      target: "CURSOR_API_KEY",
      aspect: "空文字",
      answer: "無いときと同じ。終了コード 1。画面は出さない",
    },
    "ANS-044": {
      target: "CURSOR_API_KEY",
      aspect: "空白だけの値",
      answer: "無いときと同じ。終了コード 1。画面は出さない",
    },
    "ANS-045": {
      target: "監視するリポジトリ",
      aspect: "前後の空白",
      answer: "前後の空白を除いてから owner/repo として判定する",
    },
    "ANS-046": {
      target: "監視するリポジトリ",
      aspect: "空白だけの値",
      answer:
        "未入力と同じに扱う。バリデーションは zod を使い、その仕様に沿う",
    },
    "ANS-047": {
      target: "バリデーション",
      aspect: "zod に合わせる範囲",
      answer:
        "判定は zod の文字列に合わせる。前後の空白は除く。空でなければ上限なしで受け付ける。文言と画面の動きは今まで決めたものを使う",
    },
    "ANS-048": {
      target: "監視するリポジトリ",
      aspect: "重複",
      answer: "重複の確認はしない",
    },
    "ANS-049": {
      target: "監視するリポジトリ",
      aspect: "他の項目との関係",
      answer: "他の項目とは連動させない",
    },
    "ANS-050": {
      target: "assignee",
      aspect: "重複",
      answer: "重複の確認はしない",
    },
    "ANS-051": {
      target: "assignee",
      aspect: "他の項目との関係",
      answer: "他の項目とは連動させない",
    },
    "ANS-052": {
      target: "モデル",
      aspect: "重複",
      answer: "重複の確認はしない",
    },
    "ANS-053": {
      target: "モデル",
      aspect: "他の項目との関係",
      answer: "他の項目とは連動させない",
    },
    "ANS-054": {
      target: "CURSOR_API_KEY",
      aspect: "重複",
      answer: "重複の確認はしない",
    },
    "ANS-055": {
      target: "CURSOR_API_KEY",
      aspect: "他の項目との関係",
      answer: "設定項目とは連動させない",
    },
    "ANS-056": {
      target: "ポーリング間隔",
      aspect: "他の項目との関係",
      answer: "他の項目とは連動させない",
    },
    "ANS-057": {
      target: "上段の監視リポジトリ",
      aspect: "長い値の見せ方",
      answer: "全部を折り返して見せる",
    },
    "ANS-058": {
      target: "上段の監視リポジトリ",
      aspect: "改行を含む値の見せ方",
      answer: "上段に出さず、設定画面を開く",
    },
    "ANS-059": {
      target: "上段の監視リポジトリ",
      aspect: "値が空のときの表示",
      answer: "起動画面に出さず、設定画面を開く",
    },
    "ANS-060": {
      target: "上段の assignee",
      aspect: "長い値の見せ方",
      answer: "全部を折り返して見せる",
    },
    "ANS-061": {
      target: "上段の assignee",
      aspect: "改行を含む値の見せ方",
      answer: "上段に出さず、設定画面を開く",
    },
    "ANS-062": {
      target: "上段の assignee",
      aspect: "値が空のときの表示",
      answer:
        "設定画面を開く。空は許さない。設定画面で空の項目は、既定値があれば入力欄にその既定値を出す",
    },
    "ANS-063": {
      target: "上段のモデル",
      aspect: "長い値の見せ方",
      answer: "全部を折り返して見せる",
    },
    "ANS-064": {
      target: "モデル",
      aspect: "改行",
      answer: "モデルは改行を許容しない",
    },
    "ANS-065": {
      target: "モデル",
      aspect: "改行を拒否するときの文言",
      answer: "設定画面に留まり、「model に改行は使えません」と表示する",
    },
    "ANS-066": {
      target: "上段のモデル",
      aspect: "値が空のときの表示",
      answer: "設定画面を開き、入力欄に composer-2.5 を出す",
    },
    "ANS-067": {
      target: "中段の状態",
      aspect: "長い値の見せ方",
      answer: "全部を折り返して見せる",
    },
    "ANS-068": {
      target: "中段の状態",
      aspect: "改行を含む値の見せ方",
      answer: "改行の位置で行を分けて見せる",
    },
    "ANS-069": {
      target: "下段の終了キー",
      aspect: "長い値の見せ方",
      answer: "全部を折り返して見せる",
    },
    "ANS-070": {
      target: "下段の終了キー",
      aspect: "改行を含む値の見せ方",
      answer: "改行の位置で行を分けて見せる",
    },
    "ANS-071": {
      target: "下段の終了キー",
      aspect: "値が空のときの表示",
      answer: "空にはしない。下段は常に q を出す",
    },
  },
  assumptions: [
    "この issue では issue の取得、ラベル更新、エージェントの実行、ポーリングの繰り返しをしない",
    "Web の画面は無く、ブラウザの E2E は行わない",
    "入力の判定は zod の文字列に合わせる。前後の空白は除く。モデルは途中の改行を受け付けず、それ以外は空でなければ上限なしで受け付ける。API キーは空でなければ上限なしで受け付ける。画面の文言と遷移は受け入れ条件に書いたものを使う",
  ],
  openQuestions: [
  ],
  outOfScope: [
    "issue の取得、ラベル更新、エージェントの実行",
    "アサインされたユーザーとラベルが一致したときの発火。assignee は設定として読み、上段に出す",
    "ローカルのチェックアウトのパスとブランチ。この issue の設定にも画面にも置かない",
    "Web の画面とブラウザの E2E",
    "品質ゲートが通ること、ツールの導入、規約の gate 化、テストの本数",
  ],
});
