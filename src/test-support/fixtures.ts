import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CONFIG_NAME = "issue-runner.json";
export const API_KEY = "sk-test-123";

export const validFile = {
  repository: "acme/widgets",
  assignee: "octocat",
  interval: 2,
  model: "composer-2.5",
};

let tempDirs: string[] = [];

export async function cleanupTempDirs(): Promise<void> {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
}

export async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

export async function writeConfigJson(dir: string, data: Record<string, unknown>): Promise<void> {
  await writeFile(join(dir, CONFIG_NAME), `${JSON.stringify(data)}\n`, "utf8");
}

export function ghAs(login: string | undefined): () => Promise<string | undefined> {
  return async () => login;
}
