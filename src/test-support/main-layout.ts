import { expect } from "bun:test";

export function expectValidMainHeader(frame: string): void {
  expect(frame.includes("acme/widgets")).toBe(true);
  expect(frame.includes("2分")).toBe(true);
  expect(frame.includes("composer-2.5")).toBe(true);
  expect(frame.includes("octocat")).toBe(true);
  expect(frame.includes("待機中")).toBe(true);
  expect(frame.includes("q")).toBe(true);
}
