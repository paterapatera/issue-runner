# GH-4 local agent で sdd-impl と sdd-finish を実行する

- 出典: gh
- ID: GH-4
- URL: https://github.com/paterapatera/issue-runner/issues/4
- 取り込み日時: 2026-10-16T19:06:46+09:00
- モード: 完全モード

## 背景・目的

チェックアウト上で Cursor SDK の local agent を1件ずつ動かし、`/sdd-impl` のあと `/sdd-finish` で PR を作る。

前提として、spec 名と作業ブランチを解決する issue がある。

## 受け入れ条件

- `local.cwd` は対象リポジトリのチェックアウト、`local.settingSources` は `["project"]`、モデルは `composer-2.5`
- 同時に実行するのは1件まで
- 最初のプロンプトは `/sdd-impl {spec名}`（例: `/sdd-impl GH-3`）
- それが完了したら、同じエージェントへ「受け入れテストは合格。PRを作成する。」と送り、`/sdd-finish` を実行する
- 各 run で `wait()` を呼び、起動前の失敗（`CursorAgentError`）と実行中の失敗（`result.status === "error"`）を区別する
- スキルが人の判断を求めて停止した場合は失敗として返し、未コミット変更の扱いなど、PR 作成以外の確認には答えない
- 作成された PR の URL を結果として返す

## コメント

なし

## 添付ファイル

なし

## 原文

````text
## 目的

チェックアウト上で Cursor SDK の local agent を1件ずつ動かし、`/sdd-impl` のあと `/sdd-finish` で PR を作る。

## 完了条件

- `local.cwd` は対象リポジトリのチェックアウト、`local.settingSources` は `["project"]`、モデルは `composer-2.5`
- 同時に実行するのは1件まで
- 最初のプロンプトは `/sdd-impl {spec名}`（例: `/sdd-impl GH-3`）
- それが完了したら、同じエージェントへ「受け入れテストは合格。PRを作成する。」と送り、`/sdd-finish` を実行する
- 各 run で `wait()` を呼び、起動前の失敗（`CursorAgentError`）と実行中の失敗（`result.status === "error"`）を区別する
- スキルが人の判断を求めて停止した場合は失敗として返し、未コミット変更の扱いなど、PR 作成以外の確認には答えない
- 作成された PR の URL を結果として返す

## 前提

- spec 名と作業ブランチを解決する issue
````
