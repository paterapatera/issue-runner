import { defineConventions } from "./schema/mod.ts";

// 規約。ツールの設定はまだ無いので、強制はすべて manual。
// 基盤 issue でツールを導入したあと、強制できるものを gate に変える。
export default defineConventions({
  "CONV-001": {
    topic: "命名",
    rule: "ファイル名は小文字にする。関数と変数は camelCase、型は PascalCase にする。環境変数名だけを大文字のスネークケースにする",
    example: "src/config.ts の loadConfig。環境変数は CURSOR_API_KEY",
    enforcedBy: "manual",
  },
  "CONV-002": {
    topic: "エラー処理",
    rule: "設定不足や起動できない失敗は例外にし、プロセスを終了コード 1 で止める。利用者向けの文は日本語にする。API キーの値は出さない",
    enforcedBy: "manual",
  },
  "CONV-003": {
    topic: "ログ",
    rule: "ログは標準出力と標準エラーだけにする。ログ用のライブラリは置かない。API キーは出さない",
    enforcedBy: "manual",
  },
  "CONV-004": {
    topic: "テスト",
    rule: "テストは対象ファイルの隣に *.test.ts で置く。ランナーは bun test。TUI の画面は @opentui/core/testing の createTestRenderer でフレームを取り、bun test のスナップショットで比べる",
    example: "src/config.test.ts、src/tui.test.ts",
    enforcedBy: "manual",
  },
  "CONV-005": {
    topic: "TUI",
    rule: "描画は src/tui.ts だけが行う。部品は @opentui/core だけを使う。色は端末の既定、強調は太字だけにし、アイコンと独自フォントは使わない。幅は端末に合わせ、ダークモードはアプリで切り替えない。操作はキーボードだけで、色の違いだけに頼らない。上段に設定、中段に状態、下段に終了キーを置く",
    enforcedBy: "manual",
  },
  "CONV-006": {
    topic: "モジュールの依存",
    rule: "main は config と tui に依存する。tui は読み込み済みの設定を引数で受け取り、config を import しない。config は他のモジュールに依存しない。@opentui/core を import できるのは src/tui.ts だけ",
    enforcedBy: "manual",
  },
  "CONV-007": {
    topic: "パッケージマネージャ",
    rule: "パッケージの追加とスクリプトの実行は Bun だけを使う。package-lock.json、yarn.lock、pnpm-lock.yaml は置かない",
    enforcedBy: "manual",
  },
  "CONV-008": {
    topic: "品質ゲート",
    rule: "整形は biome check --write .、書き換えない検査は biome check . と bun --check と dependency-cruiser（parser は swc）と knip と jscpd を使う。テストは bun test。package.json の script 名は check にしない。型検査の呼び出しは bun --check にする。閾値は認知的複雑度 12、関数本体 60 行、引数 4 つ、jscpd の閾値 0%（5 行または 50 トークン未満は見ない）",
    enforcedBy: "manual",
  },
});
