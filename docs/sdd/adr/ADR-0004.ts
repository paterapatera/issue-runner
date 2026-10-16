import { defineAdr } from "../schema/mod.ts";

export default defineAdr({
  id: "ADR-0004",
  title: "TUI に @opentui/core 0.6.6 を使う",
  status: "accepted",
  date: "2026-10-16",
  context:
    "Web の画面は無く、端末の画面が必要である。config.ts の ui は Web の画面の有無なので false のままにする。Bun 1.4 で動き、React を足さない部品が要る。",
  decision:
    "TUI は @opentui/core 0.6.6 を src/tui.ts から直接使う。色は端末の既定、強調は太字、幅は端末に合わせる。画面の骨組みは上段が設定、中段が状態、下段が終了キーである。",
  consequences:
    "ブラウザの E2E は必須にならない。画面のテストは bun test と @opentui/core/testing で行う。React 用の部品は足さない。",
  alternatives: [
    {
      option: "@opentui/react 0.6.6 と React 19.3.1",
      reason: "React を依存に足すため",
    },
    {
      option: "Ink 8.0.0 と React 19.3.1",
      reason: "React を依存に足すため",
    },
  ],
});
