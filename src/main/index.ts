import { spawn } from "node:child_process";
import { type AppConfig, loadStartup, type SettingsDraft, saveConfig } from "../config/index";
import { type CreateRenderer, type RunSettingsOptions, runMain, runSettings } from "../tui/index";

export type RunDeps = {
  cwd: string;
  env: { CURSOR_API_KEY?: string };
  ghLogin: () => Promise<string | undefined>;
  createRenderer?: CreateRenderer;
  onSettingsReady?: RunSettingsOptions["onReady"];
};

function tuiOptions(createRenderer?: CreateRenderer) {
  return createRenderer === undefined ? undefined : { createRenderer };
}

export type RunOptions = {
  deps?: Partial<RunDeps>;
};

function mainViewFromConfig(config: AppConfig) {
  return {
    repository: config.repository,
    intervalLabel: `${config.interval}分`,
    model: config.model,
    assignee: config.assignee,
    status: "待機中",
    quitKey: "q",
  };
}

export async function fetchGhLogin(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const child = spawn("gh", ["api", "user", "--jq", ".login"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.on("error", () => resolve(undefined));
    child.on("close", (code) => {
      if (code !== 0) {
        resolve(undefined);
        return;
      }
      const login = stdout.trim();
      resolve(login.length > 0 ? login : undefined);
    });
  });
}

function resolveDeps(options?: RunOptions): RunDeps {
  return {
    cwd: options?.deps?.cwd ?? process.cwd(),
    env: options?.deps?.env ?? { CURSOR_API_KEY: process.env.CURSOR_API_KEY },
    ghLogin: options?.deps?.ghLogin ?? fetchGhLogin,
    createRenderer: options?.deps?.createRenderer,
    onSettingsReady: options?.deps?.onSettingsReady,
  };
}

async function runMainScreen(config: AppConfig, createRenderer?: CreateRenderer): Promise<number> {
  await runMain(mainViewFromConfig(config), tuiOptions(createRenderer));
  return 0;
}

async function runSettingsFlow(
  cwd: string,
  draft: SettingsDraft,
  createRenderer?: CreateRenderer,
  onSettingsReady?: RunSettingsOptions["onReady"],
): Promise<number> {
  let savedConfig: AppConfig | undefined;
  const result = await runSettings(
    draft,
    async (next) => {
      const saved = await saveConfig(cwd, next);
      if (saved.ok) {
        savedConfig = saved.config;
        return { ok: true };
      }
      return { ok: false, message: saved.message };
    },
    {
      ...tuiOptions(createRenderer),
      onReady: onSettingsReady,
    },
  );

  if (result === "cancel") {
    return 0;
  }
  if (savedConfig === undefined) {
    return 1;
  }
  return runMainScreen(savedConfig, createRenderer);
}

export async function run(options?: RunOptions): Promise<number> {
  const { cwd, env, ghLogin, createRenderer, onSettingsReady } = resolveDeps(options);
  const startup = await loadStartup(cwd, env, ghLogin);

  if (startup.kind === "exit") {
    if (startup.stderr !== undefined && startup.stderr.length > 0) {
      process.stderr.write(startup.stderr.endsWith("\n") ? startup.stderr : `${startup.stderr}\n`);
    }
    return startup.code;
  }

  if (startup.kind === "settings") {
    return runSettingsFlow(cwd, startup.draft, createRenderer, onSettingsReady);
  }

  return runMainScreen(startup.config, createRenderer);
}

if (import.meta.main) {
  const code = await run();
  process.exit(code);
}
