# GH-7 Cursor SDK ログインで起動できるようにする

- 出典: gh
- ID: GH-7
- URL: https://github.com/paterapatera/issue-runner/issues/7
- 取り込み日時: 2026-10-16T21:51:00+09:00
- モード: 完全モード

## 背景・目的

GH-1 では起動前に環境変数 `CURSOR_API_KEY` の有無だけを見ており、`agent login` や SDK が保存する `~/.cursor/sdk/auth.json` は使わない。手元では `export` が毎回必要になる。

`~/sdd-orc` の eval と同様に、API キーを env に置くか、SDK で一度ログインした認証のどちらかがあれば起動できるようにする（エージェント実行そのものは別 issue）。

## 受け入れ条件

- `@cursor/sdk`（ADR-0002 の版に合わせる）で `Cursor.auth.login()` 相当のログイン手順を用意できる（例: `bun …/login.ts` のようなサブコマンド、または README に明記した1回限りの手順）
- 起動時の認証判定は `CURSOR_API_KEY`（trim 後非空）を優先し、無い場合は SDK が使う認証ファイルが存在し有効なときだけ TUI に進める（sdd-orc の `eval/auto.ts` と同趣旨: env または `~/.cursor/sdk/auth.json` の存在チェック＋SDK 側の利用）
- 認証がどちらも無いときは GH-1 と同様に終了コード 1・TUI なし・キー値は画面にも標準エラーにも出さない
- ログイン済みでも GitHub は引き続き `gh` 認証のみ（GitHub トークンの入力 UI は出さない）
- `bun test` と `bun docs/sdd/scripts/gate.ts` が通る
- 受け入れ手順に「login だけ済ませて env 無しで起動できる」ケースを書く

## コメント

なし

## 添付ファイル

なし

## 原文

````text
## 目的

GH-1 では起動前に **環境変数 `CURSOR_API_KEY` の有無だけ**を見ており、`agent login` や SDK が保存する **`~/.cursor/sdk/auth.json`** は使わない。手元では `export` が毎回必要になる。

`~/sdd-orc` の eval と同様に、**API キーを env に置くか、SDK で一度ログインした認証のどちらかがあれば起動できる**ようにする（エージェント実行そのものは別 issue）。

## 完了条件

- `@cursor/sdk`（ADR-0002 の版に合わせる）で **`Cursor.auth.login()`** 相当のログイン手順を用意できる（例: `bun …/login.ts` のようなサブコマンド、または README に明記した1回限りの手順）
- 起動時の認証判定は **`CURSOR_API_KEY`（trim 後非空）を優先**し、無い場合は **SDK が使う認証ファイルが存在し有効なときだけ** TUI に進める（sdd-orc の `eval/auto.ts` と同趣旨: env または `~/.cursor/sdk/auth.json` の存在チェック＋SDK 側の利用）
- 認証がどちらも無いときは **GH-1 と同様**に終了コード 1・TUI なし・**キー値は画面にも標準エラーにも出さない**
- ログイン済みでも **GitHub は引き続き `gh` 認証のみ**（GitHub トークンの入力 UI は出さない）
- `bun test` と `bun docs/sdd/scripts/gate.ts` が通る
- 受け入れ手順に「login だけ済ませて env 無しで起動できる」ケースを書く

## 参考（sdd-orc）

- 事前チェック: `CURSOR_API_KEY` または `~/.cursor/sdk/auth.json` — `eval/auto.ts`
- ログイン: `Cursor.auth.login()` — `eval/login.ts`
- 実行時: `apiKey = process.env.CURSOR_API_KEY || undefined` で SDK に渡す — `eval/sdk/driver.ts`

## 前提

- [GH-1](https://github.com/paterapatera/issue-runner/issues/1)（起動・設定・TUI の土台）がマージ済みである
- accepted の [ADR-0002](https://github.com/paterapatera/issue-runner/blob/main/docs/sdd/adr/ADR-0002.ts): API キーは環境変数から読む — **本 issue で「env または SDK ログイン」に拡張するなら ADR を更新する**

## 対象外

- エージェントのポーリング・issue 取得・ラベル更新（別 issue）
- Cursor CLI の `~/.config/cursor/auth.json` だけを独自パースする実装（まずは SDK 経由に揃える）
````
