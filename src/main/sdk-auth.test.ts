import { describe, expect, test } from "bun:test";
import { sdkAuthReady } from "./sdk-auth.ts";

describe("sdkAuthReady", () => {
  test("returns false when stat fails", async () => {
    const result = await sdkAuthReady(async () => {
      throw new Error("ENOENT");
    });
    expect(result).toBe(false);
  });

  test("returns false when file size is 0", async () => {
    const result = await sdkAuthReady(async () => ({ size: 0 }));
    expect(result).toBe(false);
  });

  test("returns true when file size is at least 1", async () => {
    const result = await sdkAuthReady(async () => ({ size: 1 }));
    expect(result).toBe(true);
  });
});
