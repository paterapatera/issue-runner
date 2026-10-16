import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0006",
  title: "入力の判定に zod 4.6.7 を使う",
  status: "accepted",
  date: "2026-10-16",
  issue: "GH-1",
  context:
    "設定と環境変数の文字列判定を一貫させる必要がある。npm の zod 4.6.7 は z.string().trim() で要件の空白除去と整合する。",
  decision:
    "zod 4.6.7 を依存に入れ、loadStartup と saveConfig の文字列判定に z.string().trim() などこの版の API を使う。",
  consequences:
    "zod 3 系とは API が異なる。新しい依存が増えるが、判定ロジックの重複を避けられる。",
  alternatives: [
    {
      option: "zod 3 系",
      reason: "要件が合わせる仕様とずれるため",
    },
    {
      option: "判定を自前の関数だけで書く",
      reason: "要件が zod の文字列に合わせると決めているため",
    },
  ],
});
