import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  API_KEY,
  CONFIG_NAME,
  cleanupTempDirs,
  createTempDir,
  ghAs,
  validFile,
  writeConfigJson,
} from "../test-support/fixtures.ts";
import {
  type AppConfig,
  loadStartup,
  SDK_AUTH_REQUIRED,
  type SettingsDraft,
  saveConfig,
} from "./index.ts";

const READ_ERROR = "設定ファイルを読めません: issue-runner.json";
const WRITE_ERROR = "設定ファイルを書けません: issue-runner.json";

const validDraft = (): SettingsDraft => ({
  repository: "acme/widgets",
  interval: "2",
  model: "composer-2.5",
  assignee: "octocat",
});

afterEach(async () => {
  await cleanupTempDirs();
});

async function createConfigTempDir(): Promise<string> {
  return createTempDir("issue-runner-config-");
}

async function writeConfigRaw(dir: string, raw: string): Promise<void> {
  await writeFile(join(dir, CONFIG_NAME), raw, "utf8");
}

async function readConfigJson(dir: string): Promise<Record<string, unknown>> {
  const text = await readFile(join(dir, CONFIG_NAME), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

async function loadStartupWithFile(
  file: Record<string, unknown>,
  env: { CURSOR_API_KEY?: string } = { CURSOR_API_KEY: API_KEY },
): Promise<Awaited<ReturnType<typeof loadStartup>>> {
  const dir = await createConfigTempDir();
  await writeConfigJson(dir, file);
  return loadStartup(dir, env, ghAs("octocat"), false);
}

function mainConfig(interval: number): AppConfig {
  return {
    repository: "acme/widgets",
    interval,
    model: "composer-2.5",
    assignee: "octocat",
  };
}

describe("loadStartup CURSOR_API_KEY", () => {
  test.each([
    ["missing", {}],
    ["empty", { CURSOR_API_KEY: "" }],
    ["whitespace-only", { CURSOR_API_KEY: "   " }],
  ])(
    "%s key with sdkAuthReady false exits with auth message (AC-004, AC-008)",
    async (_label, env) => {
      const dir = await createConfigTempDir();
      await writeConfigJson(dir, validFile);
      const result = await loadStartup(dir, env, ghAs("octocat"), false);
      expect(result).toEqual({ kind: "exit", code: 1, stderr: SDK_AUTH_REQUIRED });
    },
  );

  test("empty key with sdkAuthReady false and zero-byte auth file (AC-011)", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, validFile);
    const result = await loadStartup(dir, {}, ghAs("octocat"), false);
    expect(result).toEqual({ kind: "exit", code: 1, stderr: SDK_AUTH_REQUIRED });
  });

  test("trimmed key allows main when config is valid", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, validFile);
    const result = await loadStartup(
      dir,
      { CURSOR_API_KEY: `  ${API_KEY}  ` },
      ghAs("octocat"),
      false,
    );
    expect(result).toEqual({
      kind: "main",
      config: {
        repository: "acme/widgets",
        interval: 2,
        model: "composer-2.5",
        assignee: "octocat",
      },
    });
  });
});

describe("loadStartup issue-runner.json read errors", () => {
  test("empty file exits with read error message", async () => {
    const dir = await createConfigTempDir();
    await writeConfigRaw(dir, "");
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result).toEqual({ kind: "exit", code: 1, stderr: READ_ERROR });
  });

  test("invalid JSON exits with read error message", async () => {
    const dir = await createConfigTempDir();
    await writeConfigRaw(dir, "{");
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result).toEqual({ kind: "exit", code: 1, stderr: READ_ERROR });
  });
});

describe("loadStartup missing config file", () => {
  test("missing file opens settings with defaults and gh login", async () => {
    const dir = await createConfigTempDir();
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("gh-user"), false);
    expect(result).toEqual({
      kind: "settings",
      draft: {
        repository: "",
        interval: "1",
        model: "composer-2.5",
        assignee: "gh-user",
      },
    });
  });

  test("missing file uses empty assignee when gh returns nothing", async () => {
    const dir = await createConfigTempDir();
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs(undefined), false);
    expect(result).toEqual({
      kind: "settings",
      draft: {
        repository: "",
        interval: "1",
        model: "composer-2.5",
        assignee: "",
      },
    });
  });
});

describe("loadStartup incomplete config in file", () => {
  test("missing repository field opens settings", async () => {
    const dir = await createConfigTempDir();
    const { repository: _r, ...rest } = validFile;
    await writeConfigJson(dir, rest);
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result.kind).toBe("settings");
  });

  test("whitespace-only repository in file opens settings", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, { ...validFile, repository: "   " });
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result.kind).toBe("settings");
    if (result.kind === "settings") {
      expect(result.draft.repository).toBe("   ");
    }
  });

  test("repository with internal newline opens settings", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, { ...validFile, repository: "acme\n/widgets" });
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result.kind).toBe("settings");
  });

  test("empty assignee in file opens settings", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, { ...validFile, assignee: "" });
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result.kind).toBe("settings");
  });

  test("empty model in file opens settings with default in draft", async () => {
    const dir = await createConfigTempDir();
    await writeConfigJson(dir, { ...validFile, model: "" });
    const result = await loadStartup(dir, { CURSOR_API_KEY: API_KEY }, ghAs("octocat"), false);
    expect(result).toEqual({
      kind: "settings",
      draft: {
        repository: "acme/widgets",
        interval: "2",
        model: "composer-2.5",
        assignee: "octocat",
      },
    });
  });
});

describe("loadStartup main path", () => {
  test.each([
    ["valid file", validFile, 2],
    ["missing model", (({ model: _m, ...rest }) => rest)(validFile), 2],
    ["missing interval", (({ interval: _i, ...rest }) => rest)(validFile), 1],
  ])("%s returns main config", async (_label, file, interval) => {
    const result = await loadStartupWithFile(file);
    expect(result).toEqual({ kind: "main", config: mainConfig(interval) });
  });
});

describe("saveConfig repository validation", () => {
  test("empty repository is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), repository: "" });
    expect(result).toEqual({
      ok: false,
      field: "repository",
      message: "repository を入力してください",
    });
  });

  test("whitespace-only repository is rejected as empty", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), repository: "   " });
    expect(result).toEqual({
      ok: false,
      field: "repository",
      message: "repository を入力してください",
    });
  });

  test("repository without slash is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), repository: "widgets" });
    expect(result).toEqual({
      ok: false,
      field: "repository",
      message: "repository は owner/repo の形で入力してください",
    });
  });
});

describe("saveConfig repository boundaries", () => {
  test("39-character owner and 100-character repo are accepted", async () => {
    const dir = await createConfigTempDir();
    const owner = "a".repeat(39);
    const repo = "b".repeat(100);
    const repository = `${owner}/${repo}`;
    const result = await saveConfig(dir, { ...validDraft(), repository });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.repository).toBe(repository);
    }
    const onDisk = await readConfigJson(dir);
    expect(onDisk.repository).toBe(repository);
  });

  test("101-character repo name is rejected", async () => {
    const dir = await createConfigTempDir();
    const repository = `${"a".repeat(39)}/${"b".repeat(101)}`;
    const result = await saveConfig(dir, { ...validDraft(), repository });
    expect(result).toEqual({
      ok: false,
      field: "repository",
      message: "repository は owner/repo の形で入力してください",
    });
  });

  test("trims surrounding whitespace on repository", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, {
      ...validDraft(),
      repository: "  acme/widgets  ",
    });
    expect(result.ok).toBe(true);
    const onDisk = await readConfigJson(dir);
    expect(onDisk.repository).toBe("acme/widgets");
  });
});

describe("saveConfig assignee", () => {
  test("empty assignee is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), assignee: "" });
    expect(result).toEqual({
      ok: false,
      field: "assignee",
      message: "assignee を入力してください",
    });
  });

  test("39-character assignee is accepted", async () => {
    const dir = await createConfigTempDir();
    const assignee = "a".repeat(39);
    const result = await saveConfig(dir, { ...validDraft(), assignee });
    expect(result.ok).toBe(true);
    const onDisk = await readConfigJson(dir);
    expect(onDisk.assignee).toBe(assignee);
  });

  test("40-character assignee is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), assignee: "a".repeat(40) });
    expect(result).toEqual({
      ok: false,
      field: "assignee",
      message: "assignee は GitHub のユーザー名で入力してください",
    });
  });

  test("whitespace-only assignee is rejected as empty", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), assignee: "   " });
    expect(result).toEqual({
      ok: false,
      field: "assignee",
      message: "assignee を入力してください",
    });
  });
});

describe("saveConfig interval", () => {
  test("zero interval is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), interval: "0" });
    expect(result).toEqual({
      ok: false,
      field: "interval",
      message: "interval は 1分 以上にしてください",
    });
  });

  test("decimal interval is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), interval: "1.5" });
    expect(result).toEqual({
      ok: false,
      field: "interval",
      message: "interval は整数で入力してください",
    });
  });

  test("non-digit interval is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), interval: "abc" });
    expect(result).toEqual({
      ok: false,
      field: "interval",
      message: "interval は半角数字で入力してください",
    });
  });

  test("large integer interval is accepted", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), interval: "100000" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.interval).toBe(100000);
    }
    const onDisk = await readConfigJson(dir);
    expect(onDisk.interval).toBe(100000);
  });
});

describe("saveConfig model", () => {
  test("empty model saves as default", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), model: "" });
    expect(result.ok).toBe(true);
    const onDisk = await readConfigJson(dir);
    expect(onDisk.model).toBe("composer-2.5");
  });

  test("whitespace-only model saves as default", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), model: "   " });
    expect(result.ok).toBe(true);
    const onDisk = await readConfigJson(dir);
    expect(onDisk.model).toBe("composer-2.5");
  });

  test("internal newline in model is rejected", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, { ...validDraft(), model: "a\nb" });
    expect(result).toEqual({
      ok: false,
      field: "model",
      message: "model に改行は使えません",
    });
  });

  test("1000-character model is written to disk", async () => {
    const dir = await createConfigTempDir();
    const model = "m".repeat(1000);
    const result = await saveConfig(dir, { ...validDraft(), model });
    expect(result.ok).toBe(true);
    const onDisk = await readConfigJson(dir);
    expect(onDisk.model).toBe(model);
  });
});

describe("saveConfig successful write", () => {
  test("writes only the four config keys with trailing newline", async () => {
    const dir = await createConfigTempDir();
    const result = await saveConfig(dir, validDraft());
    expect(result).toEqual({
      ok: true,
      config: {
        repository: "acme/widgets",
        interval: 2,
        model: "composer-2.5",
        assignee: "octocat",
      },
    });
    const text = await readFile(join(dir, CONFIG_NAME), "utf8");
    expect(text.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["assignee", "interval", "model", "repository"]);
    expect(parsed).toEqual({
      repository: "acme/widgets",
      interval: 2,
      model: "composer-2.5",
      assignee: "octocat",
    });
  });
});

describe("saveConfig write failure", () => {
  test("returns write error when config path is not writable", async () => {
    const dir = await createConfigTempDir();
    await mkdir(join(dir, CONFIG_NAME));
    const result = await saveConfig(dir, validDraft());
    expect(result).toEqual({ ok: false, message: WRITE_ERROR });
  });

  test("returns write error when directory is read-only", async () => {
    const dir = await createConfigTempDir();
    await chmod(dir, 0o555);
    try {
      const result = await saveConfig(dir, validDraft());
      expect(result).toEqual({ ok: false, message: WRITE_ERROR });
    } finally {
      await chmod(dir, 0o755);
    }
  });
});
