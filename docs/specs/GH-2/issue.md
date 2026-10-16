# GH-2 GitHub issue のラベルで状態を遷移する

- 出典: gh
- ID: GH-2
- URL: https://github.com/paterapatera/issue-runner/issues/2
- 取り込み日時: 2026-10-16T16:31:03+09:00
- モード: 完全モード

## 背景・目的

ポーラーが GitHub issue のラベルを唯一の状態として持ち、二重実行を防ぐ。ラベルの付け替えはポーラーだけが行い、エージェントにはさせない。

前提として、足場と設定の issue がある。

## 受け入れ条件

- 開いている issue のうち、ラベル `agent:queued` が付いたものを列挙できる
- エージェントを起動する前に、`agent:queued` を外して `agent:running` を付け、コメントに実行 ID を残す
- 実行結果に応じて次へ遷移する
  - 完了: `agent:done`。PR の URL を含む結果をコメントする
  - 実行中の失敗、またはスキルが人の判断を求めて停止: `agent:failed`。自動では `agent:queued` に戻さない
  - 起動前の `CursorAgentError` で `isRetryable` のときだけ `agent:queued` に戻す

## コメント

なし

## 添付ファイル

なし

## 原文

````text
## 目的

ポーラーが GitHub issue のラベルを唯一の状態として持ち、二重実行を防ぐ。ラベルの付け替えはポーラーだけが行い、エージェントにはさせない。

## 完了条件

- 開いている issue のうち、ラベル `agent:queued` が付いたものを列挙できる
- エージェントを起動する前に、`agent:queued` を外して `agent:running` を付け、コメントに実行 ID を残す
- 実行結果に応じて次へ遷移する
  - 完了: `agent:done`。PR の URL を含む結果をコメントする
  - 実行中の失敗、またはスキルが人の判断を求めて停止: `agent:failed`。自動では `agent:queued` に戻さない
  - 起動前の `CursorAgentError` で `isRetryable` のときだけ `agent:queued` に戻す

## 前提

- 足場と設定の issue
````
