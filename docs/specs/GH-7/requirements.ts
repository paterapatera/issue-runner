import { defineRequirements } from "../../sdd/schema/mod.ts";

export default defineRequirements({
  issue: "GH-7",
  summary:
    "起動前の認証を、trim 後に空でない CURSOR_API_KEY を優先し、無いときは ~/.cursor/sdk/auth.json が存在し中身が1バイト以上のときだけ TUI に進める。ログイン用の bun サブコマンドを用意し、キー値は画面と標準エラーに出さない。",
  functional: {
    "FR-001": {
      title: "SDK ログイン手順",
      ears: {
        pattern: "ubiquitous",
        response:
          "@cursor/sdk 1.0.37 の Cursor.auth.login() を、bun src/main/login.ts として実行できなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "human",
          given: ["CURSOR_API_KEY を設定していない", "ホームの .cursor/sdk/auth.json が無い"],
          when: "bun src/main/login.ts を引数なしで1回実行した",
          then: ["ホームの .cursor/sdk/auth.json が存在する"],
        },
        {
          id: "AC-012",
          kind: "error",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY を設定していない", "ホームの .cursor/sdk/auth.json が無い", "Cursor.auth.login() が失敗する"],
          when: "bun src/main/login.ts を引数なしで実行した",
          then: [
            "終了コードは 1 である",
            "標準エラーは「Cursor へのログインに失敗しました」の1行である",
            "その行に API キーの値は含まれない",
          ],
        },
        {
          id: "AC-014",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "Cursor.auth.login() が失敗する",
            "端末の幅が「Cursor へのログインに失敗しました」より狭い",
          ],
          when: "bun src/main/login.ts を引数なしで実行した",
          then: ["標準エラーに「Cursor へのログインに失敗しました」の全文が出る", "文の途中で切れていない"],
        },
      ],
      priority: "must",
    },
    "FR-002": {
      title: "環境変数の API キーを優先する",
      ears: {
        pattern: "event",
        trigger: "CURSOR_API_KEY を trim した値が空でない状態で起動した",
        response:
          "認証ファイルの有無にかかわらず TUI に進み、その trim 後の値をエージェント実行時の API キーとして使わなければならない",
      },
      acceptance: [
        {
          id: "AC-002",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "CURSOR_API_KEY が sk-example である",
            "ホームの .cursor/sdk/auth.json が無い",
            "起動ディレクトリに有効な issue-runner.json がある",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "画面に sk-example は出ない"],
        },
        {
          id: "AC-003",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が半角空白1文字、sk-example、半角空白1文字の順である", "有効な issue-runner.json がある"],
          when: "起動判定を行った",
          then: ["API キー無しとは判定しない", "エージェントへ渡す API キーは sk-example である"],
        },
        {
          id: "AC-004",
          kind: "error",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が空文字である", "ホームの .cursor/sdk/auth.json が無い"],
          when: "起動判定を行った",
          then: [
            "終了コードは 1 である",
            "TUI は出さない",
            "標準エラーは「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行である",
          ],
        },
      ],
      priority: "must",
    },
    "FR-003": {
      title: "SDK の認証ファイルで起動する",
      ears: {
        pattern: "complex",
        state: "CURSOR_API_KEY を trim した値が空である",
        trigger: "ホームの .cursor/sdk/auth.json が存在し、中身が1バイト以上の状態で起動した",
        response:
          "TUI に進み、エージェント実行時の API キー引数は渡さず SDK の保存済み認証を使わせなければならない",
      },
      acceptance: [
        {
          id: "AC-005",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "CURSOR_API_KEY が未設定である",
            "ホームの .cursor/sdk/auth.json の中身が半角 x の1バイトである",
            "起動ディレクトリに有効な issue-runner.json がある",
          ],
          when: "プロセスを起動した",
          then: ["起動画面が表示される", "画面に API キーの値は出ない"],
        },
        {
          id: "AC-006",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "CURSOR_API_KEY が半角空白だけである",
            "ホームの .cursor/sdk/auth.json の中身が半角 x の1バイトである",
            "有効な issue-runner.json がある",
          ],
          when: "起動判定を行った",
          then: ["環境変数のキーは使わない", "TUI に進む判定になる", "エージェントへ渡す API キー引数は無い"],
        },
        {
          id: "AC-011",
          kind: "error",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が未設定である", "ホームの .cursor/sdk/auth.json が存在し、中身が0バイトである"],
          when: "起動判定を行った",
          then: [
            "終了コードは 1 である",
            "TUI は出さない",
            "標準エラーは「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行である",
          ],
        },
      ],
      priority: "must",
    },
    "FR-004": {
      title: "認証が無いときは起動しない",
      ears: {
        pattern: "unwanted",
        condition: "CURSOR_API_KEY を trim した値が空であり、かつホームの .cursor/sdk/auth.json が無いか中身が0バイトである",
        response:
          "終了コード 1 で止まり、TUI を出さず、標準エラーに「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」と1行だけ出し、API キーの値は出してはならない",
      },
      acceptance: [
        {
          id: "AC-007",
          kind: "normal",
          verifiedBy: "human",
          given: ["CURSOR_API_KEY が未設定である", "ホームの .cursor/sdk/auth.json が無い"],
          when: "プロセスを起動した",
          then: [
            "起動画面も設定画面も出ない",
            "プロセスはすぐに終わる",
            "標準エラーに「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」と1行出る",
            "その行に API キーの値は含まれない",
          ],
        },
        {
          id: "AC-008",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["CURSOR_API_KEY が半角空白だけである", "ホームの .cursor/sdk/auth.json が無い"],
          when: "起動判定を行った",
          then: [
            "終了コードは 1 である",
            "TUI は出さない",
            "標準エラーは「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の1行である",
          ],
        },
        {
          id: "AC-013",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "CURSOR_API_KEY が未設定である",
            "ホームの .cursor/sdk/auth.json が無い",
            "端末の幅が「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」より狭い",
          ],
          when: "プロセスを起動した",
          then: [
            "標準エラーに「Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください」の全文が出る",
            "文の途中で切れていない",
          ],
        },
      ],
      notApplicable: {
        error: "空の認証ファイルは AC-011 で扱う。この要件に別の異常入力は無い",
      },
      priority: "must",
    },
    "FR-005": {
      title: "GitHub は gh 認証のまま",
      ears: {
        pattern: "ubiquitous",
        response:
          "SDK でログイン済みであっても GitHub の認証は gh のログインだけを使い、GitHub トークンの入力欄を出してはならない",
      },
      acceptance: [
        {
          id: "AC-009",
          kind: "normal",
          verifiedBy: "human",
          given: [
        "ホームの .cursor/sdk/auth.json の中身が半角 x の1バイトである",
        "CURSOR_API_KEY は未設定である",
        "gh は未ログインである",
      ],
          when: "プロセスを起動した",
          then: ["GitHub トークンを入れる欄は出ない"],
        },
      ],
      notApplicable: {
        boundary: "トークン入力欄の有無は件数や文字数の境界を持たない",
        error: "gh が失敗してもトークン入力は出さない、という失敗の具体例は AC-009 の未ログインで足り、別の異常入力は無い",
      },
      priority: "must",
    },
    "FR-006": {
      title: "ログインのみの受け入れ手順",
      ears: {
        pattern: "ubiquitous",
        response:
          "受け入れ手順に、ログインだけを済ませて CURSOR_API_KEY が無い状態で起動できるケースを書かなければならない",
      },
      acceptance: [
        {
          id: "AC-010",
          kind: "normal",
          verifiedBy: "human",
          given: ["受け入れ手順がリポジトリにある"],
          when: "受け入れ手順を読んだ",
          then: ["login だけ済ませて環境変数 CURSOR_API_KEY が無い状態で起動するケースが書いてある"],
        },
      ],
      notApplicable: {
        boundary: "手順の文章に件数や文字数の境界は無い",
        error: "手順書の欠落は正常系の不在であり、別の異常入力は無い",
      },
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {
    "INV-001": {
      title: "設定ファイルの読み取り失敗",
      behavior:
        "issue-runner.json が JSON として読めないとき、または JSON の値がオブジェクトでないときは、終了コード 1 とし、標準エラーに「設定ファイルを読めません: issue-runner.json」と出す",
      verification: "src/config/index.test.ts の読み取りエラーのテストが、文言を変えずに通る",
      verifiedBy: "automated",
    },
    "INV-002": {
      title: "設定項目と GitHub トークン UI",
      behavior:
        "設定画面の項目は repository、interval、model、assignee のままであり、GitHub トークンの入力欄は足さない",
      verification: "設定画面の既存テストが、項目を増やさずに通る",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: { decision: "baseline" },
    "性能・拡張性": { decision: "baseline" },
    "運用・保守性": { decision: "baseline" },
    移行性: { decision: "notApplicable", reason: "issue-runner.json の形は変えず、認証の保存先は SDK の既存ファイルである" },
    セキュリティ: { decision: "baseline", note: "API キーを出さないことは FR-002 と FR-004 の受け入れ条件で扱う" },
    "システム環境・エコロジー": { decision: "baseline" },
  },
  issueCoverage: [
    {
      source:
        "`@cursor/sdk`（ADR-0002 の版に合わせる）で `Cursor.auth.login()` 相当のログイン手順を用意できる（例: `bun …/login.ts` のようなサブコマンド、または README に明記した1回限りの手順）",
      coveredBy: ["FR-001", "AC-001"],
    },
    {
      source:
        "起動時の認証判定は `CURSOR_API_KEY`（trim 後非空）を優先し、無い場合は SDK が使う認証ファイルが存在し有効なときだけ TUI に進める（sdd-orc の `eval/auto.ts` と同趣旨: env または `~/.cursor/sdk/auth.json` の存在チェック＋SDK 側の利用）",
      coveredBy: ["FR-002", "FR-003", "AC-002", "AC-005"],
    },
    {
      source: "認証がどちらも無いときは GH-1 と同様に終了コード 1・TUI なし・キー値は画面にも標準エラーにも出さない",
      coveredBy: ["FR-004", "AC-007"],
    },
    {
      source: "ログイン済みでも GitHub は引き続き `gh` 認証のみ（GitHub トークンの入力 UI は出さない）",
      coveredBy: ["FR-005", "AC-009"],
    },
    {
      source: "`bun test` と `bun docs/sdd/scripts/gate.ts` が通る",
      excluded: "品質ゲートの成否は受け入れ条件にしない。sdd-impl と finish-report が gate を実行する",
    },
    {
      source: "受け入れ手順に「login だけ済ませて env 無しで起動できる」ケースを書く",
      coveredBy: ["FR-006", "AC-010"],
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "利用者は開発者本人のみ。GitHub トークン入力を出さないことを AC-009 で扱った",
    },
    dataStates: {
      result: "considered",
      note: "認証ファイルが無い場合は AC-004 と AC-007。中身が1バイトの場合は AC-005。0バイトは AC-011（ANS-002）",
    },
    inputValidation: {
      result: "considered",
      note: "CURSOR_API_KEY の空と前後空白は AC-003 と AC-006 と AC-008。ログインコマンドは bun src/main/login.ts（ANS-004）",
    },
    errorFeedback: {
      result: "considered",
      note: "認証不足の標準エラーは AC-007（ANS-003）。ログイン失敗は AC-012（ANS-005）。設定ファイルの失敗文言は INV-001 のまま",
    },
    existingData: {
      result: "considered",
      note: "設定ファイルの失敗文言は INV-001。trim 後に空でない CURSOR_API_KEY のときは従来どおり TUI に進む（AC-002）",
    },
    consistency: {
      result: "considered",
      note: "認証ファイルは ~/.cursor/sdk/auth.json に用語をそろえた。CLI の ~/.config/cursor/auth.json は対象外",
    },
    outOfScope: {
      result: "considered",
      note: "ポーリングとラベル更新、CLI 認証ファイルの独自パース、品質ゲートそのものを対象外にした",
    },
  },
  values: [
    {
      target: "認証不足のときの標準エラー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-013"], basis: { answer: "ANS-007" } },
        lineBreak: { decidedBy: ["AC-007"], basis: { answer: "ANS-003" } },
        empty: {
          notApplicable: "この失敗では常に決めた1行を出す。空の文の別表示は持たない",
          basis: { answer: "ANS-006" },
        },
      },
    },
    {
      target: "ログイン失敗のときの標準エラー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-014"], basis: { answer: "ANS-009" } },
        lineBreak: { decidedBy: ["AC-012"], basis: { answer: "ANS-005" } },
        empty: {
          notApplicable: "失敗時は常に決めた1行を出す。空の文の別表示は持たない",
          basis: { answer: "ANS-008" },
        },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "ログイン手順",
      aspect: "起動のしかた",
      answer: "bun で実行するサブコマンドを用意する",
    },
    "ANS-002": {
      target: "認証ファイル",
      aspect: "有効とみなす条件",
      answer: "存在し、中身が1バイト以上のときだけ有効。中身の形式は見ない",
    },
    "ANS-003": {
      target: "認証がどちらも無いときの終了",
      aspect: "標準エラーに出す文言",
      answer: "Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください",
    },
    "ANS-004": {
      target: "ログイン用サブコマンド",
      aspect: "実行するコマンドの形",
      answer: "bun src/main/login.ts",
    },
    "ANS-005": {
      target: "ログイン用サブコマンド",
      aspect: "失敗したときに利用者が見ること",
      answer: "終了コード 1 とし、標準エラーに「Cursor へのログインに失敗しました」と1行出す",
    },
    "ANS-006": {
      target: "認証不足のときの標準エラー",
      aspect: "値が空のときの表示",
      answer: "空にはならないので、空のときの別表示は関係しない",
    },
    "ANS-007": {
      target: "認証不足のときの標準エラー",
      aspect: "長い値の見せ方",
      answer: "端末幅で折り返して全文を出す",
    },
    "ANS-008": {
      target: "ログイン失敗のときの標準エラー",
      aspect: "値が空のときの表示",
      answer: "空にはならないので、空のときの別表示は関係しない",
    },
    "ANS-009": {
      target: "ログイン失敗のときの標準エラー",
      aspect: "長い値の見せ方",
      answer: "端末幅で折り返して全文を出す",
    },
  },
  assumptions: [
    "使う SDK は ADR-0002 の @cursor/sdk 1.0.37 である",
    "認証ファイルのパスはホームディレクトリの .cursor/sdk/auth.json である",
    "この issue で起動認証を env または SDK ログインに広げるため、ADR-0002 の「API キーは環境変数から読む」を更新する",
  ],
  openQuestions: [],
  outOfScope: [
    "エージェントのポーリング、issue 取得、ラベル更新",
    "Cursor CLI の ~/.config/cursor/auth.json だけを独自にパースする実装",
    "bun test と gate が通ること自体",
  ],
});
