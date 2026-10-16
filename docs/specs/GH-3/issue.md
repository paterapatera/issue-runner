# GH-3 issue 番号から spec 名を決め、作業ブランチをチェックアウトする

- 出典: gh
- ID: GH-3
- URL: https://github.com/paterapatera/issue-runner/issues/3
- 取り込み日時: 2026-10-16T17:48:06+09:00
- モード: 完全モード

## 背景・目的

GitHub issue の番号と、対象チェックアウトの `docs/sdd/config.ts` にある `issueIdPrefix` から spec 名を決める。`sdd-impl` は現在のブランチから ID を特定するため、実行前に対応する作業ブランチへ切り替える。

前提として、ラベルで状態を遷移する issue がある。

## 受け入れ条件

- issue 番号 `3`、`issueIdPrefix` が `GH` のとき、spec 名は `GH-3` になる
- `issueIdPrefix` が無い場合はエージェントを起動せず、`agent:failed` にする
- リモートブランチのうち、`<IDを小文字にしたもの>-` で始まるものがちょうど1つあるとき、そのブランチをチェックアウトする（例: `gh-3-print-date`）
- 該当ブランチが0件、または複数件のときはエージェントを起動せず、`agent:failed` にする
- slug は issue からは読まない

## コメント

なし

## 添付ファイル

なし

## 原文

````text
## 目的

GitHub issue の番号と、対象チェックアウトの `docs/sdd/config.ts` にある `issueIdPrefix` から spec 名を決める。`sdd-impl` は現在のブランチから ID を特定するため、実行前に対応する作業ブランチへ切り替える。

## 完了条件

- issue 番号 `3`、`issueIdPrefix` が `GH` のとき、spec 名は `GH-3` になる
- `issueIdPrefix` が無い場合はエージェントを起動せず、`agent:failed` にする
- リモートブランチのうち、`<IDを小文字にしたもの>-` で始まるものがちょうど1つあるとき、そのブランチをチェックアウトする（例: `gh-3-print-date`）
- 該当ブランチが0件、または複数件のときはエージェントを起動せず、`agent:failed` にする
- slug は issue からは読まない

## 前提

- ラベルで状態を遷移する issue
````
