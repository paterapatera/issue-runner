import { defineRequirements } from "../../sdd/schema/mod.ts";

export default defineRequirements({
  issue: "GH-3",
  summary:
    "issue-runner は、切り替える前の起動ディレクトリの issueIdPrefix と issue 番号から spec 名を決め、origin の該当ブランチが1つのときだけチェックアウトする。agent:failed にしたときは終了コード 1 で、標準エラーに失敗の理由を1行出す。",
  functional: {
    "FR-001": {
      title: "spec 名",
      ears: {
        pattern: "complex",
        state: "切り替える前の設定に issueIdPrefix がある",
        trigger: "その issue の spec 名を決めた",
        response:
          "spec 名を、前後の空白を除いた issueIdPrefix、ハイフン、その issue 番号を、この順につないだ文字列にしなければならない",
      },
      acceptance: [
        {
          id: "AC-001",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "issue 番号が 3 である",
            "ブランチを切り替える前の対象チェックアウトの docs/sdd/config.ts の issueIdPrefix が GH である",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が GH-3 である"],
        },
        {
          id: "AC-014",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue 番号が 3 である",
            "ブランチを切り替える前の docs/sdd/config.ts の issueIdPrefix が GH である",
            "リモートブランチ gh-3-print-date の docs/sdd/config.ts の issueIdPrefix が AB である",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が GH-3 である"],
        },
        {
          id: "AC-020",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue 番号が 3 である",
            "ブランチを切り替える前の docs/sdd/config.ts の issueIdPrefix が、前後にスペースを付けた GH である",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が GH-3 である"],
        },
        {
          id: "AC-022",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue 番号が 3 である",
            "issue-runner を起動したディレクトリ repo の issueIdPrefix が GH である",
            "別のディレクトリ other の issueIdPrefix が AB である",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が GH-3 である"],
        },
      ],
      notApplicable: {
        error: "issueIdPrefix が無いときの扱いは FR-002 と FR-003 で決める。この要件は接頭辞があるときの名前だけを決める",
      },
      priority: "must",
    },
    "FR-002": {
      title: "接頭辞が無いときの spec 名",
      ears: {
        pattern: "complex",
        state: "切り替える前の設定の issueIdPrefix が無い、または空文字である、または空白だけである",
        trigger: "その issue の spec 名を決めた",
        response: "spec 名を、その issue 番号だけにしなければならない",
      },
      acceptance: [
        {
          id: "AC-002",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "issue 番号が 111 である",
            "ブランチを切り替える前の docs/sdd/config.ts に issueIdPrefix の定義が無い",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が 111 である"],
        },
        {
          id: "AC-016",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 番号が 3 である", "ブランチを切り替える前の docs/sdd/config.ts に issueIdPrefix の定義が無い"],
          when: "その issue の spec 名を決める",
          then: ["spec 名が 3 である"],
        },
        {
          id: "AC-018",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["issue 番号が 111 である", "ブランチを切り替える前の docs/sdd/config.ts の issueIdPrefix が空文字である"],
          when: "その issue の spec 名を決める",
          then: ["spec 名が 111 である"],
        },
        {
          id: "AC-019",
          kind: "boundary",
          verifiedBy: "automated",
          given: [
            "issue 番号が 111 である",
            "ブランチを切り替える前の docs/sdd/config.ts の issueIdPrefix がスペース 3 文字である",
          ],
          when: "その issue の spec 名を決める",
          then: ["spec 名が 111 である"],
        },
      ],
      notApplicable: {
        error: "接頭辞が無いことは失敗にしない。issue 番号は GitHub の番号として渡される",
      },
      priority: "must",
    },
    "FR-003": {
      title: "接頭辞が無いことを理由に failed にしない",
      ears: {
        pattern: "complex",
        state: "切り替える前の設定の issueIdPrefix が無い、または空文字である、または空白だけである",
        trigger: "該当するリモートブランチがちょうど1つあり、作業ブランチを準備した",
        response: "その GitHub issue の状態ラベルを、準備の前のままに保たなければならない",
      },
      acceptance: [
        {
          id: "AC-003",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "issue 番号が 111 である",
            "GitHub のその issue にラベル agent:queued だけが付いている",
            "ブランチを切り替える前の docs/sdd/config.ts に issueIdPrefix の定義が無い",
            "リモートブランチが 111-hogehoge と main である",
          ],
          when: "その issue の作業ブランチを準備する",
          then: ["GitHub のその issue のラベルは agent:queued のままである", "agent:failed は付いていない"],
        },
      ],
      notApplicable: {
        boundary: "番号の桁数では、ラベルを変えるかどうかは変わらない",
        error: "接頭辞が無いことは失敗にしない。該当ブランチが1つでないときの失敗は FR-006 で決める",
      },
      priority: "must",
    },
    "FR-004": {
      title: "該当ブランチが1つのときはチェックアウトする",
      ears: {
        pattern: "event",
        trigger: "小文字にした spec 名の直後にハイフンを付けた文字列で始まる origin のブランチがちょうど1つあった",
        response: "issue-runner を起動したディレクトリを、そのブランチにチェックアウトしなければならない",
      },
      acceptance: [
        {
          id: "AC-004",
          kind: "normal",
          verifiedBy: "human",
          given: ["spec 名が GH-3 である", "リモートブランチが gh-3-print-date と main である"],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が gh-3-print-date と表示される"],
        },
        {
          id: "AC-005",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "リモートブランチが gh-3-print-date と gh-30-other である",
          ],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が gh-3-print-date と表示される"],
        },
        {
          id: "AC-017",
          kind: "boundary",
          verifiedBy: "human",
          given: ["spec 名が 111 である", "リモートブランチが 111-hogehoge と main である"],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が 111-hogehoge と表示される"],
        },
        {
          id: "AC-021",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "issue-runner を起動したディレクトリが repo である",
            "別のディレクトリ other がある",
            "spec 名が GH-3 である",
            "repo のリモートブランチが gh-3-print-date と main である",
          ],
          when: "作業ブランチをチェックアウトする",
          then: [
            "repo の現在のブランチ名が gh-3-print-date と表示される",
            "other のブランチ名は変わらない",
          ],
        },
        {
          id: "AC-023",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "origin のブランチが gh-3-print-date と main である",
            "upstream のブランチに gh-3-other がある",
          ],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が gh-3-print-date と表示される"],
        },
      ],
      notApplicable: {
        error: "該当が1つでないときはチェックアウトしない。その結果は FR-005 と FR-006 で決める",
      },
      priority: "must",
    },
    "FR-008": {
      title: "チェックアウト成功時はラベルを変えない",
      ears: {
        pattern: "event",
        trigger: "作業ブランチのチェックアウトに成功した",
        response: "その GitHub issue の状態ラベルを変えてはならない",
      },
      acceptance: [
        {
          id: "AC-015",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "GitHub の issue にラベル agent:queued だけが付いている",
            "spec 名が GH-3 である",
            "リモートブランチが gh-3-print-date と main である",
          ],
          when: "作業ブランチをチェックアウトする",
          then: [
            "GitHub のその issue のラベルは agent:queued のままである",
            "agent:running、agent:done、agent:failed は付いていない",
          ],
        },
      ],
      notApplicable: {
        boundary: "成功したときに変えないラベルの種類に、件数の境目は無い",
        error: "チェックアウトできないときのラベルは FR-003 と FR-006 で決める",
      },
      priority: "must",
    },
    "FR-005": {
      title: "該当ブランチが1つでないときは起動しない",
      ears: {
        pattern: "unwanted",
        condition: "小文字にした spec 名の直後にハイフンを付けた文字列で始まる origin のブランチが0件である、または2件以上である",
        response: "エージェントを起動してはならない",
      },
      acceptance: [
        {
          id: "AC-006",
          kind: "normal",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "リモートブランチが main だけである"],
          when: "作業ブランチを準備する",
          then: ["エージェントを起動する処理は呼ばれない"],
        },
        {
          id: "AC-007",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "リモートブランチに gh-3-a と gh-3-b がある"],
          when: "作業ブランチを準備する",
          then: ["エージェントを起動する処理は呼ばれない"],
        },
        {
          id: "AC-008",
          kind: "error",
          verifiedBy: "automated",
          given: [
            "spec 名が GH-3 である",
            "ローカルブランチ gh-3-local がある",
            "リモートブランチは main だけである",
          ],
          when: "作業ブランチを準備する",
          then: ["エージェントを起動する処理は呼ばれない"],
        },
      ],
      priority: "must",
    },
    "FR-006": {
      title: "該当ブランチが1つでないときは failed にする",
      ears: {
        pattern: "unwanted",
        condition: "小文字にした spec 名の直後にハイフンを付けた文字列で始まる origin のブランチが0件である、または2件以上である",
        response: "その GitHub issue の状態ラベルを agent:failed だけにしなければならない",
      },
      acceptance: [
        {
          id: "AC-009",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "GitHub のその issue にラベル agent:queued が付いている",
            "リモートブランチが main だけである",
          ],
          when: "作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
          ],
        },
        {
          id: "AC-010",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "GitHub のその issue にラベル agent:queued が付いている",
            "リモートブランチに gh-3-a と gh-3-b がある",
          ],
          when: "作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
          ],
        },
        {
          id: "AC-011",
          kind: "error",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "GitHub のその issue にラベル agent:queued が付いている",
            "ローカルブランチ gh-3-local がある",
            "リモートブランチは main だけである",
          ],
          when: "作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
          ],
        },
        {
          id: "AC-024",
          kind: "error",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "GitHub のその issue にラベル agent:queued が付いている",
            "origin のブランチは main だけである",
            "upstream のブランチに gh-3-print-date がある",
          ],
          when: "作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
          ],
        },
      ],
      priority: "must",
    },
    "FR-007": {
      title: "slug は issue から読まない",
      ears: {
        pattern: "ubiquitous",
        response: "作業ブランチを、issue のタイトルや本文に書かれた slug から選んではならない",
      },
      acceptance: [
        {
          id: "AC-012",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "issue の本文に feature-from-issue と書かれている",
            "リモートブランチが gh-3-print-date と feature-from-issue である",
          ],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が gh-3-print-date と表示される"],
        },
        {
          id: "AC-013",
          kind: "boundary",
          verifiedBy: "human",
          given: ["spec 名が GH-3 である", "issue のタイトルと本文が空である", "リモートブランチが gh-3-print-date と main である"],
          when: "作業ブランチをチェックアウトする",
          then: ["対象チェックアウトの現在のブランチ名が gh-3-print-date と表示される"],
        },
      ],
      notApplicable: {
        error: "本文の内容は失敗の条件にしない。該当ブランチが1つでないときの失敗は FR-005 と FR-006 で決める",
      },
      priority: "must",
    },
    "FR-009": {
      title: "設定ファイルが無いときは起動しない",
      ears: {
        pattern: "unwanted",
        condition: "起動したディレクトリに docs/sdd/config.ts が無い",
        response: "エージェントを起動してはならない",
      },
      acceptance: [
        {
          id: "AC-025",
          kind: "normal",
          verifiedBy: "automated",
          given: [
            "issue 番号が 111 である",
            "起動したディレクトリに docs/sdd/config.ts が無い",
            "origin のブランチに 111-hogehoge がある",
          ],
          when: "その issue の作業ブランチを準備する",
          then: ["エージェントを起動する処理は呼ばれない"],
        },
      ],
      notApplicable: {
        boundary: "ファイルがあるかないかは二値で、件数の境目は無い",
        error: "この要件が求めるのは起動しないことだけである",
      },
      priority: "must",
    },
    "FR-010": {
      title: "設定ファイルが無いときは failed にする",
      ears: {
        pattern: "unwanted",
        condition: "起動したディレクトリに docs/sdd/config.ts が無い",
        response: "その GitHub issue の状態ラベルを agent:failed だけにしなければならない",
      },
      acceptance: [
        {
          id: "AC-026",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "issue 番号が 111 である",
            "GitHub のその issue にラベル agent:queued が付いている",
            "起動したディレクトリの現在のブランチが main である",
            "起動したディレクトリに docs/sdd/config.ts が無い",
            "origin のブランチに 111-hogehoge がある",
          ],
          when: "その issue の作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
            "現在のブランチ名は main のままである",
          ],
        },
      ],
      notApplicable: {
        boundary: "ファイルがあるかないかは二値で、件数の境目は無い",
        error: "ラベルを更新できないときは FR-015 と FR-016 でプロセスを終了する",
      },
      priority: "must",
    },
    "FR-011": {
      title: "設定ファイルが無いときのコメント",
      ears: {
        pattern: "unwanted",
        condition: "起動したディレクトリに docs/sdd/config.ts が無い",
        response:
          "GitHub のその issue に、本文が docs/sdd/config.ts がありません であるコメントを1件付けなければならない",
      },
      acceptance: [
        {
          id: "AC-027",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "issue 番号が 111 である",
            "起動したディレクトリに docs/sdd/config.ts が無い",
            "その issue のコメントが 0 件である",
          ],
          when: "その issue の作業ブランチを準備する",
          then: ["GitHub のその issue のコメントが 1 件である", "コメントの本文が docs/sdd/config.ts がありません である"],
        },
      ],
      notApplicable: {
        boundary: "本文はこの1文で、長さの境目は無い",
        error: "コメントを付けられないときは FR-017 と FR-018 でプロセスを終了する",
      },
      priority: "must",
    },
    "FR-012": {
      title: "該当ブランチが0件のときのコメント",
      ears: {
        pattern: "unwanted",
        condition: "小文字にした spec 名の直後にハイフンを付けた文字列で始まる origin のブランチが0件である",
        response:
          "GitHub のその issue に、本文が 該当する作業ブランチがありません であるコメントを1件付けなければならない",
      },
      acceptance: [
        {
          id: "AC-028",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "origin のブランチが main だけである",
            "その issue のコメントが 0 件である",
          ],
          when: "作業ブランチを準備する",
          then: ["GitHub のその issue のコメントが 1 件である", "コメントの本文が 該当する作業ブランチがありません である"],
        },
      ],
      notApplicable: {
        boundary: "本文はこの1文で、長さの境目は無い",
        error: "コメントを付けられないときは FR-017 と FR-018 でプロセスを終了する",
      },
      priority: "must",
    },
    "FR-013": {
      title: "該当ブランチが複数のときのコメント",
      ears: {
        pattern: "unwanted",
        condition: "小文字にした spec 名の直後にハイフンを付けた文字列で始まる origin のブランチが2件以上である",
        response:
          "GitHub のその issue に、本文が 該当する作業ブランチが複数あります であるコメントを1件付けなければならない",
      },
      acceptance: [
        {
          id: "AC-029",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "origin のブランチに gh-3-a と gh-3-b がある",
            "その issue のコメントが 0 件である",
          ],
          when: "作業ブランチを準備する",
          then: ["GitHub のその issue のコメントが 1 件である", "コメントの本文が 該当する作業ブランチが複数あります である"],
        },
      ],
      notApplicable: {
        boundary: "本文はこの1文で、長さの境目は無い",
        error: "コメントを付けられないときは FR-017 と FR-018 でプロセスを終了する",
      },
      priority: "must",
    },
    "FR-014": {
      title: "チェックアウト成功時はコメントを付けない",
      ears: {
        pattern: "event",
        trigger: "作業ブランチのチェックアウトに成功した",
        response: "その GitHub issue のコメント件数を、準備の前のままに保たなければならない",
      },
      acceptance: [
        {
          id: "AC-030",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "GitHub の issue のコメントが 0 件である",
            "spec 名が GH-3 である",
            "origin のブランチが gh-3-print-date と main である",
          ],
          when: "作業ブランチをチェックアウトする",
          then: ["GitHub のその issue のコメントは 0 件のままである"],
        },
      ],
      notApplicable: {
        boundary: "成功したときに増やすコメントの件数に、境目は無い",
        error: "チェックアウトできないときのコメントは FR-011、FR-012、FR-013 で決める",
      },
      priority: "must",
    },
    "FR-015": {
      title: "ラベルを更新できないときは終了する",
      ears: {
        pattern: "unwanted",
        condition: "GitHub issue のラベルを agent:failed に更新できない",
        response: "プロセスを終了コード 1 で終えなければならない",
      },
      acceptance: [
        {
          id: "AC-031",
          kind: "normal",
          verifiedBy: "automated",
          given: ["ラベルを agent:failed に更新する操作が失敗する", "起動したディレクトリの現在のブランチが main である"],
          when: "作業ブランチを準備する",
          then: ["プロセスの終了コードが 1 である", "エージェントを起動する処理は呼ばれない"],
        },
      ],
      notApplicable: {
        boundary: "更新の失敗に件数の境目は無い",
        error: "この要件が求めるのは、更新できないときにプロセスを終了することである",
      },
      priority: "must",
    },
    "FR-016": {
      title: "ラベル更新失敗のエラーメッセージ",
      ears: {
        pattern: "unwanted",
        condition: "GitHub issue のラベルを agent:failed に更新できない",
        response: "標準エラーに、ラベルを更新できませんでした という1行を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-032",
          kind: "normal",
          verifiedBy: "automated",
          given: ["ラベルを agent:failed に更新する操作が失敗する", "その失敗の文に secret-token が含まれる"],
          when: "作業ブランチを準備する",
          then: ["標準エラーの出力が ラベルを更新できませんでした の1行である", "標準エラーに secret-token は含まれない"],
        },
      ],
      notApplicable: {
        boundary: "文面はこの1行で、長さの境目は無い",
        error: "標準エラーへ出せない環境は、この要件の対象外である",
      },
      priority: "must",
    },
    "FR-017": {
      title: "失敗コメントを付けられないときは終了する",
      ears: {
        pattern: "unwanted",
        condition: "失敗のコメントを GitHub に付けられない",
        response: "プロセスを終了コード 1 で終えなければならない",
      },
      acceptance: [
        {
          id: "AC-033",
          kind: "normal",
          verifiedBy: "automated",
          given: ["失敗のコメントを付ける操作が失敗する"],
          when: "作業ブランチを準備する",
          then: ["プロセスの終了コードが 1 である", "エージェントを起動する処理は呼ばれない"],
        },
      ],
      notApplicable: {
        boundary: "コメントの失敗に件数の境目は無い",
        error: "この要件が求めるのは、コメントを付けられないときにプロセスを終了することである",
      },
      priority: "must",
    },
    "FR-018": {
      title: "失敗コメントを付けられないときのエラーメッセージ",
      ears: {
        pattern: "unwanted",
        condition: "失敗のコメントを GitHub に付けられない",
        response: "標準エラーに、コメントを付けられませんでした という1行を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-034",
          kind: "normal",
          verifiedBy: "automated",
          given: ["失敗のコメントを付ける操作が失敗する", "その失敗の文に secret-token が含まれる"],
          when: "作業ブランチを準備する",
          then: ["標準エラーの出力が コメントを付けられませんでした の1行である", "標準エラーに secret-token は含まれない"],
        },
      ],
      notApplicable: {
        boundary: "文面はこの1行で、長さの境目は無い",
        error: "標準エラーへ出せない環境は、この要件の対象外である",
      },
      priority: "must",
    },
    "FR-019": {
      title: "failed のときは終了コード 1 と標準エラー",
      ears: {
        pattern: "event",
        trigger: "作業ブランチの準備が agent:failed と失敗コメントを残して終わった",
        response:
          "プロセスを終了コード 1 で終え、標準エラーにそのコメントと同じ1行を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-035",
          kind: "normal",
          verifiedBy: "automated",
          given: ["issue 番号が 111 である", "起動したディレクトリに docs/sdd/config.ts が無い"],
          when: "その issue の作業ブランチを準備する",
          then: ["プロセスの終了コードが 1 である", "標準エラーの出力が docs/sdd/config.ts がありません の1行である"],
        },
        {
          id: "AC-036",
          kind: "boundary",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "origin のブランチが main だけである"],
          when: "作業ブランチを準備する",
          then: ["プロセスの終了コードが 1 である", "標準エラーの出力が 該当する作業ブランチがありません の1行である"],
        },
        {
          id: "AC-037",
          kind: "error",
          verifiedBy: "automated",
          given: ["spec 名が GH-3 である", "origin のブランチに gh-3-a と gh-3-b がある"],
          when: "作業ブランチを準備する",
          then: ["プロセスの終了コードが 1 である", "標準エラーの出力が 該当する作業ブランチが複数あります の1行である"],
        },
      ],
      priority: "must",
    },
    "FR-020": {
      title: "git の失敗は failed にする",
      ears: {
        pattern: "unwanted",
        condition: "origin のブランチ一覧の取得、またはチェックアウトが失敗した",
        response:
          "ブランチを切り替えず、その GitHub issue の状態ラベルを agent:failed だけにしなければならない",
      },
      acceptance: [
        {
          id: "AC-038",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "GitHub の issue にラベル agent:queued が付いている",
            "起動したディレクトリの現在のブランチが main である",
            "origin のブランチ一覧の取得が失敗する",
          ],
          when: "作業ブランチを準備する",
          then: [
            "GitHub のその issue にラベル agent:failed が付いている",
            "agent:queued、agent:running、agent:done は付いていない",
            "現在のブランチ名は main のままである",
          ],
        },
        {
          id: "AC-039",
          kind: "boundary",
          verifiedBy: "human",
          given: [
            "spec 名が GH-3 である",
            "origin のブランチが gh-3-print-date だけ該当する",
            "起動したディレクトリの現在のブランチが main である",
            "そのブランチへのチェックアウトが失敗する",
          ],
          when: "作業ブランチを準備する",
          then: ["現在のブランチ名は main のままである", "GitHub のその issue にラベル agent:failed が付いている"],
        },
      ],
      notApplicable: {
        error: "git の失敗は、この要件では失敗として扱う。起動処理自身の失敗は起きない",
      },
      priority: "must",
    },
    "FR-021": {
      title: "git の失敗のコメントと標準エラー",
      ears: {
        pattern: "unwanted",
        condition: "origin のブランチ一覧の取得、またはチェックアウトが失敗した",
        response:
          "GitHub のコメントと標準エラーの両方に、作業ブランチを用意できませんでした という1行を出さなければならない",
      },
      acceptance: [
        {
          id: "AC-040",
          kind: "normal",
          verifiedBy: "human",
          given: [
            "origin のブランチ一覧の取得が失敗する",
            "その失敗の文に secret-token が含まれる",
            "その issue のコメントが 0 件である",
          ],
          when: "作業ブランチを準備する",
          then: ["コメントの本文が 作業ブランチを用意できませんでした である"],
        },
        {
          id: "AC-041",
          kind: "error",
          verifiedBy: "automated",
          given: ["origin のブランチ一覧の取得が失敗する", "その失敗の文に secret-token が含まれる"],
          when: "作業ブランチを準備する",
          then: [
            "プロセスの終了コードが 1 である",
            "標準エラーの出力が 作業ブランチを用意できませんでした の1行である",
            "標準エラーに secret-token は含まれない",
          ],
        },
      ],
      notApplicable: {
        boundary: "文面はこの1行で、長さの境目は無い",
      },
      priority: "must",
    },
  },
  nonFunctional: {},
  invariants: {
    "INV-001": {
      title: "起動と設定と TUI の表示",
      behavior:
        "CURSOR_API_KEY が無いときは終了コード 1 で止まり、TUI を出さない。設定が揃っているときは、起動画面にリポジトリ、間隔の分、モデル、担当者、状態 待機中、終了キー q を表示する。issue-runner.json のキーは repository、interval、model、assignee のままである",
      verification: "src/main/index.test.ts と src/config/index.test.ts と src/tui/index.test.ts が、変更なしで通る",
      verifiedBy: "automated",
    },
  },
  nfrReview: {
    可用性: {
      decision: "notApplicable",
      reason: "プロセスを起動し続けることではなく、1件の issue を準備するときの成功と失敗を決めるため",
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
      source: "issue 番号 `3`、`issueIdPrefix` が `GH` のとき、spec 名は `GH-3` になる",
      coveredBy: ["FR-001", "AC-001", "AC-014"],
    },
    {
      source: "`issueIdPrefix` が無い場合はエージェントを起動せず、`agent:failed` にする",
      excluded: "完了条件が誤っている。接頭辞が無くても 111-hogehoge のようなブランチで動かす。ANS-005",
    },
    {
      source:
        "リモートブランチのうち、`<IDを小文字にしたもの>-` で始まるものがちょうど1つあるとき、そのブランチをチェックアウトする（例: `gh-3-print-date`）",
      coveredBy: ["FR-004", "AC-004", "AC-017", "FR-008", "AC-015"],
    },
    {
      source: "該当ブランチが0件、または複数件のときはエージェントを起動せず、`agent:failed` にする",
      coveredBy: ["FR-005", "AC-006", "AC-007", "FR-006", "AC-009", "AC-010"],
    },
    {
      source: "slug は issue からは読まない",
      coveredBy: ["FR-007", "AC-012"],
    },
  ],
  checklist: {
    actors: {
      result: "considered",
      note: "使うのは自分のマシンで動かす開発者1人である。権限の種類では振る舞いを変えない",
    },
    dataStates: {
      result: "considered",
      note: "該当ブランチ1件は AC-004、0件は AC-006 と AC-009、2件は AC-007 と AC-010、ローカルだけのブランチは AC-008 と AC-011",
    },
    inputValidation: {
      result: "considered",
      note: "定義が無いとき、空文字、スペース 3 文字は spec 名を番号だけにする（AC-002、AC-018、AC-019）。前後の空白は除いてから接頭辞にする（AC-020、ANS-008）。設定ファイルが無いときは AC-025 と AC-026 で agent:failed にする",
    },
    errorFeedback: {
      result: "considered",
      note: "失敗時のラベルは AC-003、AC-009、AC-010、AC-011、AC-026、AC-038。コメント本文は AC-027、AC-028、AC-029、AC-040。agent:failed の終了コードと標準エラーは AC-035、AC-036、AC-037、AC-041。ラベル更新の失敗は AC-031 と AC-032。コメントを付けられないときは AC-033 と AC-034",
    },
    existingData: {
      result: "considered",
      note: "起動画面と issue-runner.json のキーは INV-001。成功時のラベルは AC-015 で変えない。失敗した issue のラベルは agent:failed になる",
    },
    consistency: {
      result: "considered",
      note: "spec 名は切り替える前の issueIdPrefix から決める（AC-001、AC-014、ANS-001）。小文字にハイフンを足した文字列でリモートブランチを探す",
    },
    outOfScope: {
      result: "considered",
      note: "エージェントの起動、作業ブランチの新規作成、slug の生成を対象外に書いた",
    },
  },
  values: [
    {
      target: "設定ファイルが無いときのコメント",
      kind: "textDisplay",
      aspects: {
        long: {
          decidedBy: ["AC-027"],
          basis: { answer: "ANS-012" },
        },
        lineBreak: {
          decidedBy: ["AC-027"],
          basis: { answer: "ANS-012" },
        },
        empty: {
          decidedBy: ["AC-027"],
          basis: { answer: "ANS-012" },
        },
      },
    },
    {
      target: "該当ブランチが0件のときのコメント",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-028"], basis: { answer: "ANS-013" } },
        lineBreak: { decidedBy: ["AC-028"], basis: { answer: "ANS-013" } },
        empty: { decidedBy: ["AC-028"], basis: { answer: "ANS-013" } },
      },
    },
    {
      target: "該当ブランチが複数のときのコメント",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-029"], basis: { answer: "ANS-014" } },
        lineBreak: { decidedBy: ["AC-029"], basis: { answer: "ANS-014" } },
        empty: { decidedBy: ["AC-029"], basis: { answer: "ANS-014" } },
      },
    },
    {
      target: "ラベル更新失敗の標準エラー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-032"], basis: { answer: "ANS-017" } },
        lineBreak: { decidedBy: ["AC-032"], basis: { answer: "ANS-017" } },
        empty: { decidedBy: ["AC-032"], basis: { answer: "ANS-017" } },
      },
    },
    {
      target: "失敗コメントを付けられないときの標準エラー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-034"], basis: { answer: "ANS-018" } },
        lineBreak: { decidedBy: ["AC-034"], basis: { answer: "ANS-018" } },
        empty: { decidedBy: ["AC-034"], basis: { answer: "ANS-018" } },
      },
    },
    {
      target: "git の失敗のコメント",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-040"], basis: { answer: "ANS-019" } },
        lineBreak: { decidedBy: ["AC-040"], basis: { answer: "ANS-019" } },
        empty: { decidedBy: ["AC-040"], basis: { answer: "ANS-019" } },
      },
    },
    {
      target: "git の失敗の標準エラー",
      kind: "textDisplay",
      aspects: {
        long: { decidedBy: ["AC-041"], basis: { answer: "ANS-019" } },
        lineBreak: { decidedBy: ["AC-041"], basis: { answer: "ANS-019" } },
        empty: { decidedBy: ["AC-041"], basis: { answer: "ANS-019" } },
      },
    },
  ],
  answers: {
    "ANS-001": {
      target: "issueIdPrefix の読み取り",
      aspect: "読む時点",
      answer: "ブランチを切り替える前の対象チェックアウトから読む",
    },
    "ANS-002": {
      target: "チェックアウト成功",
      aspect: "状態ラベル",
      answer: "ラベルは変えない",
    },
    "ANS-003": {
      target: "agent:failed",
      aspect: "ほかの状態ラベル",
      answer: "ほかの状態ラベルを外し、agent:failed だけにする。GH-2 と同じ",
    },
    "ANS-004": {
      target: "準備の失敗",
      aspect: "伝える文言",
      answer: "失敗の種類ごとに違う文を、GitHub のコメントとして1件残す",
    },
    "ANS-005": {
      target: "issueIdPrefix が無いとき",
      aspect: "結果",
      answer: "完了条件は誤り。接頭辞が無くても 111-hogehoge のようなブランチで動かす。spec 名は issue 番号だけにする",
    },
    "ANS-006": {
      target: "issueIdPrefix",
      aspect: "空文字",
      answer: "定義が無いときと同じ。spec 名は issue 番号だけにする",
    },
    "ANS-007": {
      target: "issueIdPrefix",
      aspect: "空白だけ",
      answer: "空文字と同じ。spec 名は issue 番号だけにする",
    },
    "ANS-008": {
      target: "issueIdPrefix",
      aspect: "前後の空白",
      answer: "前後の空白を除いてから接頭辞にする",
    },
    "ANS-009": {
      target: "対象チェックアウト",
      aspect: "置くディレクトリ",
      answer: "issue-runner を起動したディレクトリを対象にする",
    },
    "ANS-010": {
      target: "リモートブランチ",
      aspect: "数えるリモート",
      answer: "origin のブランチだけを数える",
    },
    "ANS-011": {
      target: "docs/sdd/config.ts",
      aspect: "ファイルが無いとき",
      answer: "agent:failed にする",
    },
    "ANS-012": {
      target: "設定ファイルが無い失敗",
      aspect: "コメント本文",
      answer: "docs/sdd/config.ts がありません",
    },
    "ANS-013": {
      target: "該当ブランチが0件の失敗",
      aspect: "コメント本文",
      answer: "該当する作業ブランチがありません",
    },
    "ANS-014": {
      target: "該当ブランチが複数の失敗",
      aspect: "コメント本文",
      answer: "該当する作業ブランチが複数あります",
    },
    "ANS-015": {
      target: "チェックアウト成功",
      aspect: "コメント",
      answer: "コメントは付けない",
    },
    "ANS-016": {
      target: "ラベル更新",
      aspect: "更新できないとき",
      answer: "プロセスを終了コード 1 で止める。エラーメッセージも残す",
    },
    "ANS-017": {
      target: "ラベル更新の失敗",
      aspect: "エラーメッセージ",
      answer: "標準エラーに「ラベルを更新できませんでした」と1行出す。GitHub の失敗文は出さない",
    },
    "ANS-018": {
      target: "失敗コメント",
      aspect: "付けられないとき",
      answer: "終了コード 1。標準エラーに「コメントを付けられませんでした」と1行出す。GitHub の失敗文は出さない",
    },
    "ANS-019": {
      target: "git の失敗",
      aspect: "結果",
      answer:
        "agent:failed にする。終了コード 1。標準エラーとコメントは「作業ブランチを用意できませんでした」。agent:failed のときは常に終了コード 1 で、標準エラーに失敗の理由を出す",
    },
  },
  assumptions: [
    "agent:failed というラベルは、ラベルで状態を遷移する issue が用意する",
    "sdd-impl の実行は、この issue が作業ブランチへ切り替えたあとである",
  ],
  openQuestions: [],
  outOfScope: [
    "エージェントの起動と sdd-impl の実行",
    "作業ブランチを新しく作ること",
    "issue の本文から slug を決めること",
    "起動画面の表示と issue-runner.json のキー",
  ],
});
