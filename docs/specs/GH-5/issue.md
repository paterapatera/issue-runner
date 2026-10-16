# GH-5 ポーリングループで取得から状態更新までを接続する

- 出典: gh
- ID: GH-5
- URL: https://github.com/paterapatera/issue-runner/issues/5
- 取り込み日時: 2026-10-16T20:17:00+09:00
- モード: 完全モード

## 背景・目的

設定した間隔で issue を監視し、取得、ブランチの準備、エージェント実行、ラベル更新を1件ずつつなぐ。プロセスが途中で落ちても、同じ issue を二重に起動しない。

前提は、ラベル遷移、spec 名の解決、local agent 実行の各 issue である。

## 受け入れ条件

- 開いている `agent:queued` の issue を間隔ごとに処理する
- 各 issue は、spec 名の解決、ブランチのチェックアウト、`/sdd-impl`、`/sdd-finish`、ラベル更新の順で進む
- `agent:running` の issue は新規起動しない
- 再起動後、`agent:running` のコメントに残した実行 ID から結末を調べ、`agent:done` または `agent:failed` へ反映する
- 実行は同時に1件まで

## コメント

なし

## 添付ファイル

なし

## 原文

````text
## 目的

設定した間隔で issue を監視し、取得、ブランチの準備、エージェント実行、ラベル更新を1件ずつつなぐ。プロセスが途中で落ちても、同じ issue を二重に起動しない。

## 完了条件

- 開いている `agent:queued` の issue を間隔ごとに処理する
- 各 issue は、spec 名の解決、ブランチのチェックアウト、`/sdd-impl`、`/sdd-finish`、ラベル更新の順で進む
- `agent:running` の issue は新規起動しない
- 再起動後、`agent:running` のコメントに残した実行 ID から結末を調べ、`agent:done` または `agent:failed` へ反映する
- 実行は同時に1件まで

## 前提

- ラベル遷移、spec 名の解決、local agent 実行の各 issue
````
