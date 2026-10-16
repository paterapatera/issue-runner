import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0001",
  title: "実行環境を Bun 1.4.3、言語を TypeScript 7.0.2 にする",
  status: "accepted",
  date: "2026-10-16",
  context:
    "GH-1 は、Bun で TypeScript のエントリポイントを実行できることを完了条件にしている。導入時点の最新安定版は Bun 1.4.3 と TypeScript 7.0.2 で、この環境の Bun も 1.4.3 である。",
  decision: "実行とパッケージ管理は Bun 1.4.3、言語は TypeScript 7.0.2 にする。",
  consequences:
    "型検査は Bun 組み込みの bun --check が TypeScript 7.0.2 と同じエラーを出す。TypeScript 7.0.2 にはコンパイラ API が無いので、その API を必要とするツールは使えない。",
  alternatives: [
    {
      option: "Node.js で TypeScript を動かす",
      reason: "GH-1 の完了条件が Bun での実行であるため",
    },
  ],
});
