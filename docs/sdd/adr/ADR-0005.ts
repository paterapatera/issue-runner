import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0005",
  title: "品質ゲートを Biome、bun --check、dependency-cruiser、Knip、jscpd、bun test にする",
  status: "accepted",
  date: "2026-10-16",
  context:
    "TypeScript の規模は L である。型検査は bun --check を使い、TypeScript のパッケージは 7.0.2 だけにする。TUI の画面テストが必要で、Web の画面は無い。ツールはまだ導入していない。",
  decision:
    "整形と lint は Biome 2.5.15、型検査は bun --check、境界は dependency-cruiser 18.6.0（parser は swc、@swc/core 1.16.18）、未使用コードは Knip 6.41.0、重複は jscpd 5.4.1、テストは bun test にする。TUI のフレーム比較も bun test に含める。e2e は登録しない。導入と commands への登録は基盤 issue で行う。",
  consequences:
    "ESLint の型付きルールは使えない。dependency-cruiser は TypeScript 7 の API が無いため SWC で解析する。閾値は認知的複雑度 12、関数本体 60 行、引数 4、jscpd 0% である。package.json に check という script を置くと bun check が型検査ではなくなる。",
  alternatives: [
    {
      option: "tsc --noEmit と typescript-eslint の strictTypeChecked",
      reason: "型検査は bun --check にし、TypeScript のパッケージは 7.0.2 だけにするため。typescript-eslint は TypeScript 6 の API を必要とする",
    },
    {
      option: "Vitest",
      reason: "実行環境が Bun であり、*.test.ts は bun test が実行するため",
    },
    {
      option: "Playwright",
      reason: "Web の画面が無く、TUI の画面は @opentui/core/testing で確かめられるため",
    },
  ],
});
