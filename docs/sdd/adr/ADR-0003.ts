import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0003",
  title: "フレームワークとデータベースを置かず、GitHub は gh を使う",
  status: "accepted",
  date: "2026-10-16",
  context:
    "GH-1 が必要とするのは、設定ファイルと環境変数から監視対象、チェックアウト、ポーリング間隔、モデルを読むことと、無い CURSOR_API_KEY で起動を失敗させることである。GitHub の操作は実行環境の gh 認証を使う。",
  decision:
    "Web フレームワークとデータベースは置かない。設定はファイルと環境変数から読む。GitHub の操作は gh 2.45.0 に任せ、資格情報はアプリが読まない。",
  consequences:
    "永続化が必要になったときは、その時点で保存先を決める。GitHub の認証状態は実行環境の gh に依存する。",
  alternatives: [
    {
      option: "データベースに設定や実行結果を保存する",
      reason: "GH-1 の設定はファイルと環境変数で足りるため",
    },
  ],
});
