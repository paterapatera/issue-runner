import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const CONFIG_FILE = "issue-runner.json";
const DEFAULT_MODEL = "composer-2.5";
const READ_ERROR = "設定ファイルを読めません: issue-runner.json";
const WRITE_ERROR = "設定ファイルを書けません: issue-runner.json";
export const SDK_AUTH_REQUIRED =
  "Cursor にログインするか、環境変数 CURSOR_API_KEY を設定してください";

export type AppConfig = {
  repository: string;
  interval: number;
  model: string;
  assignee: string;
};

export type SettingsDraft = {
  repository: string;
  interval: string;
  model: string;
  assignee: string;
};

export type LoadStartupResult =
  | { kind: "exit"; code: 1; stderr?: string }
  | { kind: "settings"; draft: SettingsDraft }
  | { kind: "main"; config: AppConfig };

export type SaveConfigResult =
  | { ok: true; config: AppConfig }
  | {
      ok: false;
      field?: "repository" | "interval" | "model" | "assignee";
      message: string;
    };

const ownerSchema = z
  .string()
  .trim()
  .min(1)
  .max(39)
  .regex(/^(?!.*--)[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/);

const repoNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^(?!.*\.git$)[a-zA-Z0-9._-]+$/);

const assigneeSchema = ownerSchema;

function normalizeField(raw: string): string {
  return z.string().trim().parse(raw).replace(/\n+$/g, "");
}

function hasInternalNewline(raw: string): boolean {
  const trimmed = z.string().trim().parse(raw);
  const core = trimmed.replace(/\n+$/g, "");
  return core.includes("\n");
}

type NameInput = { ok: true; normalized: string } | { ok: false; empty: boolean };

function normalizeNameInput(raw: string): NameInput {
  if (hasInternalNewline(raw)) {
    return { ok: false, empty: false };
  }
  const normalized = normalizeField(raw);
  if (normalized.length === 0) {
    return { ok: false, empty: true };
  }
  return { ok: true, normalized };
}

type ParsedName = { ok: true; value: string } | { ok: false; empty: boolean };

function parseNamedField(
  raw: string,
  toValue: (normalized: string) => string | undefined,
): ParsedName {
  const input = normalizeNameInput(raw);
  if (!input.ok) {
    return input;
  }
  const value = toValue(input.normalized);
  if (value === undefined) {
    return { ok: false, empty: false };
  }
  return { ok: true, value };
}

function parseRepository(raw: string): ParsedName {
  return parseNamedField(raw, (normalized) => {
    const slash = normalized.indexOf("/");
    if (slash === -1 || normalized.indexOf("/", slash + 1) !== -1) {
      return undefined;
    }
    const owner = normalized.slice(0, slash);
    const repo = normalized.slice(slash + 1);
    if (ownerSchema.safeParse(owner).success && repoNameSchema.safeParse(repo).success) {
      return `${owner}/${repo}`;
    }
    return undefined;
  });
}

function parseAssignee(raw: string): ParsedName {
  return parseNamedField(raw, (normalized) =>
    assigneeSchema.safeParse(normalized).success ? normalized : undefined,
  );
}

function parseModelForSave(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  if (hasInternalNewline(raw)) {
    return { ok: false, message: "model に改行は使えません" };
  }
  const normalized = normalizeField(raw);
  const value = normalized.length === 0 ? DEFAULT_MODEL : normalized;
  return { ok: true, value };
}

function parseIntervalString(
  raw: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = z.string().trim().parse(raw).replace(/\n+$/g, "");
  if (trimmed.includes(".")) {
    return { ok: false, message: "interval は整数で入力してください" };
  }
  if (!/^[0-9]+$/.test(trimmed)) {
    return { ok: false, message: "interval は半角数字で入力してください" };
  }
  const value = Number.parseInt(trimmed, 10);
  if (value < 1) {
    return { ok: false, message: "interval は 1分 以上にしてください" };
  }
  return { ok: true, value };
}

function parseIntervalFromJson(value: unknown): number | undefined {
  if (value === undefined) {
    return 1;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return undefined;
  }
  return value;
}

function modelReadyForMain(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (raw === undefined) {
    return { ok: true, value: DEFAULT_MODEL };
  }
  if (typeof raw !== "string") {
    return { ok: false };
  }
  if (raw === "") {
    return { ok: false };
  }
  if (hasInternalNewline(raw)) {
    return { ok: false };
  }
  const normalized = normalizeField(raw);
  if (normalized.length === 0) {
    return { ok: false };
  }
  return { ok: true, value: normalized };
}

function draftFromFile(
  data: Record<string, unknown>,
  ghDefaultAssignee: string | undefined,
): SettingsDraft {
  const repository = typeof data.repository === "string" ? data.repository : "";
  const interval =
    typeof data.interval === "number"
      ? String(data.interval)
      : data.interval === undefined
        ? "1"
        : String(data.interval);
  let model = DEFAULT_MODEL;
  if (typeof data.model === "string") {
    model = data.model.length === 0 ? DEFAULT_MODEL : data.model;
  } else if (data.model !== undefined) {
    model = String(data.model);
  }
  let assignee = ghDefaultAssignee ?? "";
  if (typeof data.assignee === "string") {
    assignee = data.assignee;
  } else if ("assignee" in data) {
    assignee = String(data.assignee);
  }
  return { repository, interval, model, assignee };
}

function tryMainConfig(data: Record<string, unknown>): AppConfig | undefined {
  if (!("assignee" in data)) {
    return undefined;
  }
  if (data.repository === undefined) {
    return undefined;
  }
  if (typeof data.repository !== "string") {
    return undefined;
  }
  const repository = parseRepository(data.repository);
  if (!repository.ok) {
    return undefined;
  }
  if (typeof data.assignee !== "string") {
    return undefined;
  }
  const assignee = parseAssignee(data.assignee);
  if (!assignee.ok) {
    return undefined;
  }
  const model = modelReadyForMain(data.model);
  if (!model.ok) {
    return undefined;
  }
  const interval = parseIntervalFromJson(data.interval);
  if (interval === undefined) {
    return undefined;
  }
  return {
    repository: repository.value,
    interval,
    model: model.value,
    assignee: assignee.value,
  };
}

export async function loadStartup(
  cwd: string,
  env: { CURSOR_API_KEY?: string },
  ghLogin: () => Promise<string | undefined>,
  sdkAuthReady: boolean,
): Promise<LoadStartupResult> {
  const apiKey = z
    .string()
    .trim()
    .parse(env.CURSOR_API_KEY ?? "");
  if (apiKey.length === 0) {
    if (!sdkAuthReady) {
      return { kind: "exit", code: 1, stderr: SDK_AUTH_REQUIRED };
    }
  }

  const path = join(cwd, CONFIG_FILE);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    const login = await ghLogin();
    return {
      kind: "settings",
      draft: {
        repository: "",
        interval: "1",
        model: DEFAULT_MODEL,
        assignee: login ?? "",
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "exit", code: 1, stderr: READ_ERROR };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { kind: "exit", code: 1, stderr: READ_ERROR };
  }

  const data = parsed as Record<string, unknown>;
  const login = await ghLogin();
  const main = tryMainConfig(data);
  if (main) {
    return { kind: "main", config: main };
  }
  return { kind: "settings", draft: draftFromFile(data, login) };
}

export async function saveConfig(cwd: string, input: SettingsDraft): Promise<SaveConfigResult> {
  const repository = parseRepository(input.repository);
  if (!repository.ok) {
    return {
      ok: false,
      field: "repository",
      message: repository.empty
        ? "repository を入力してください"
        : "repository は owner/repo の形で入力してください",
    };
  }

  const assignee = parseAssignee(input.assignee);
  if (!assignee.ok) {
    return {
      ok: false,
      field: "assignee",
      message: assignee.empty
        ? "assignee を入力してください"
        : "assignee は GitHub のユーザー名で入力してください",
    };
  }

  const interval = parseIntervalString(input.interval);
  if (!interval.ok) {
    return { ok: false, field: "interval", message: interval.message };
  }

  const model = parseModelForSave(input.model);
  if (!model.ok) {
    return { ok: false, field: "model", message: model.message };
  }

  const config: AppConfig = {
    repository: repository.value,
    interval: interval.value,
    model: model.value,
    assignee: assignee.value,
  };

  const path = join(cwd, CONFIG_FILE);
  try {
    await writeFile(
      path,
      `${JSON.stringify({
        repository: config.repository,
        interval: config.interval,
        model: config.model,
        assignee: config.assignee,
      })}\n`,
      "utf8",
    );
  } catch {
    return { ok: false, message: WRITE_ERROR };
  }

  return { ok: true, config };
}
