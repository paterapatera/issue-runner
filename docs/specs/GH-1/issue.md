# GH-1 起動、設定、TUI、品質ゲートの土台を用意する

- 出典: gh
- ID: GH-1
- URL: https://github.com/paterapatera/issue-runner/issues/1
- 取り込み日時: 2026-10-16T10:18:47+09:00
- モード: 完全モード

## 背景・目的

機能の開発の前に、issue-runner の土台を1人で作る。雛形、設定、TUI、品質ゲート、テストが動く状態にする。機能（issue の取得、ラベル更新、エージェントの実行）は作らない。

対象外:

- issue の取得、ラベル更新、エージェントの実行
- Web の画面とブラウザの E2E

## 受け入れ条件

- `src/main.ts`、`src/config.ts`、`src/tui.ts` を置き、依存は architecture.ts のとおりにする
- 設定で、監視するリポジトリ（owner/repo）、ローカルのチェックアウト、ポーリング間隔、モデル（既定は composer-2.5）を渡せる
- `CURSOR_API_KEY` が無いときは終了コード 1 で起動に失敗する。API キーの値は出さない
- GitHub の操作は実行環境の `gh` 認証を使う
- TUI は @opentui/core 0.6.6 で、上段に設定、中段に状態、下段に終了キーを出す。色は端末の既定、強調は太字だけ
- Biome 2.5.15、dependency-cruiser 18.6.0（parser は swc）、@swc/core 1.16.18、Knip 6.41.0、jscpd 5.4.1、TypeScript 7.0.2 を導入する
- `docs/sdd/config.ts` の commands に format、check、test を登録する。package.json の script 名は check にしない。型検査は `bun --check`
- 閾値は認知的複雑度 12、関数本体 60 行、引数 4、jscpd 0%（5 行または 50 トークン未満は見ない）
- `bun test` で、設定のテストが1件、TUI のフレーム比較が1件動く
- 導入したツールで強制できる規約は、conventions.ts の enforcedBy を gate に変える
- `bun docs/sdd/scripts/gate.ts` が通る

## コメント

- paterapatera: SDD の導入 PR を squash で main にマージした。PR は https://github.com/paterapatera/issue-runner/pull/6 、マージコミットは 8a4247b `docs: SDDを導入（docs/sdd）`。この PR で入ったのは `docs/sdd` の道具と恒久ドキュメント。作業ブランチ `sdd-init` は削除済み。
- paterapatera: 完了条件（src の実装、TUI、品質ツール、テスト、`bun docs/sdd/scripts/gate.ts`）は PR 6 に含まれていないため、開き直す。

## 添付ファイル

なし

## 原文

````text
## 目的

機能の開発の前に、issue-runner の土台を1人で作る。雛形、設定、TUI、品質ゲート、テストが動く状態にする。機能（issue の取得、ラベル更新、エージェントの実行）は作らない。

## 完了条件

- `src/main.ts`、`src/config.ts`、`src/tui.ts` を置き、依存は architecture.ts のとおりにする
- 設定で、監視するリポジトリ（owner/repo）、ローカルのチェックアウト、ポーリング間隔、モデル（既定は composer-2.5）を渡せる
- `CURSOR_API_KEY` が無いときは終了コード 1 で起動に失敗する。API キーの値は出さない
- GitHub の操作は実行環境の `gh` 認証を使う
- TUI は @opentui/core 0.6.6 で、上段に設定、中段に状態、下段に終了キーを出す。色は端末の既定、強調は太字だけ
- Biome 2.5.15、dependency-cruiser 18.6.0（parser は swc）、@swc/core 1.16.18、Knip 6.41.0、jscpd 5.4.1、TypeScript 7.0.2 を導入する
- `docs/sdd/config.ts` の commands に format、check、test を登録する。package.json の script 名は check にしない。型検査は `bun --check`
- 閾値は認知的複雑度 12、関数本体 60 行、引数 4、jscpd 0%（5 行または 50 トークン未満は見ない）
- `bun test` で、設定のテストが1件、TUI のフレーム比較が1件動く
- 導入したツールで強制できる規約は、conventions.ts の enforcedBy を gate に変える
- `bun docs/sdd/scripts/gate.ts` が通る

## 対象外

- issue の取得、ラベル更新、エージェントの実行
- Web の画面とブラウザの E2E

paterapatera (https://github.com/paterapatera/issue-runner/issues/1#issuecomment-6205692099):
SDD の導入 PR を squash で main にマージしました。

- PR: https://github.com/paterapatera/issue-runner/pull/6
- マージコミット: 8a4247b `docs: SDDを導入（docs/sdd）`

この PR で入ったのは `docs/sdd` の道具と恒久ドキュメントです。作業ブランチ `sdd-init` は削除済みです。

paterapatera (https://github.com/paterapatera/issue-runner/issues/1#issuecomment-6205710726):
完了条件（src の実装、TUI、品質ツール、テスト、`bun docs/sdd/scripts/gate.ts`）は PR 6 に含まれていないため、開き直します。
````
