import { describe, expect, test } from "bun:test";
import { runLogin } from "./login.ts";

const LOGIN_FAILED = "Cursor へのログインに失敗しました";

describe("runLogin", () => {
  test("AC-001 returns 0 when login succeeds", async () => {
    const code = await runLogin({ login: async () => {} });
    expect(code).toBe(0);
  });

  test("AC-012 AC-014 returns 1 with fixed message when login fails", async () => {
    const lines: string[] = [];
    const code = await runLogin({
      login: async () => {
        throw new Error("network timeout from sdk");
      },
      writeStderr: (line) => {
        lines.push(line);
      },
    });
    expect(code).toBe(1);
    expect(lines).toEqual([LOGIN_FAILED]);
  });
});
