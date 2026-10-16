import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { Agent } from "@cursor/sdk";
import type { CreateAgentOptions } from "../agent/index";
import { type AppConfig, loadStartup, type SettingsDraft, saveConfig } from "../config/index";
import { defaultGhRunner } from "../github/index";
import { type StartPollingDeps, startPolling } from "../poll/index";
import { type CreateRenderer, type RunSettingsOptions, runMain, runSettings } from "../tui/index";
import type { GitRunner, ReadTextResult } from "../work-branch/index";
import { sdkAuthReady as checkSdkAuthReady } from "./sdk-auth";

export type BuildPollingDeps = (
  setStatus: (status: "待機中" | "実行中") => void,
) => StartPollingDeps;

export type RunDeps = {
  cwd: string;
  env: { CURSOR_API_KEY?: string };
  ghLogin: () => Promise<string | undefined>;
  resolveSdkAuthReady?: () => Promise<boolean>;
  createRenderer?: CreateRenderer;
  onSettingsReady?: RunSettingsOptions["onReady"];
  startPolling?: typeof startPolling;
  buildPollingDeps?: BuildPollingDeps;
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

function spawnGit(cwd: string): GitRunner {
  return (argv) =>
    new Promise((resolve) => {
      const child = spawn("git", argv, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
      child.on("error", () => resolve({ ok: false, stderr }));
      child.on("close", (code) => {
        if (code !== 0) {
          resolve({ ok: false, stderr });
          return;
        }
        resolve({ ok: true, stdout });
      });
    });
}

async function readTextFile(path: string): Promise<ReadTextResult> {
  try {
    const text = await readFile(path, "utf8");
    return { ok: true, text };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { ok: false, missing: true };
    }
    return { ok: false, missing: false };
  }
}

function sdkCreateAgent(apiKey: string | undefined) {
  return async (options: CreateAgentOptions) => {
    const agent = await Agent.create({
      apiKey,
      model: { id: options.modelId },
      local: { cwd: options.cwd, settingSources: [...options.settingSources] },
    });
    return {
      send: async (message: string) => {
        const run = await agent.send(message);
        return {
          wait: async () => {
            const result = await run.wait();
            return {
              status: result.status,
              result: result.result,
              error: result.error === undefined ? undefined : { message: result.error.message },
            };
          },
        };
      },
    };
  };
}

export function resolveProductionApiKey(
  env: { CURSOR_API_KEY?: string },
  sdkAuthReady: boolean,
): string | undefined {
  const trimmed = (env.CURSOR_API_KEY ?? "").trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  if (sdkAuthReady) {
    return undefined;
  }
  return undefined;
}

export function createProductionPollingDeps(
  cwd: string,
  apiKey: string | undefined,
): BuildPollingDeps {
  return (setStatus) => ({
    gh: defaultGhRunner,
    git: spawnGit(cwd),
    readText: readTextFile,
    createAgent: sdkCreateAgent(apiKey),
    newRunId: () => randomUUID(),
    writeStderr: (line) => {
      process.stderr.write(line.endsWith("\n") ? line : `${line}\n`);
    },
    exit: (code) => {
      process.exit(code);
    },
    setStatus,
    schedule: (delayMs, run) => {
      setInterval(run, delayMs);
    },
  });
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

async function defaultResolveSdkAuthReady(): Promise<boolean> {
  return checkSdkAuthReady((path) => stat(path));
}

function resolveDeps(options?: RunOptions): RunDeps {
  return {
    cwd: options?.deps?.cwd ?? process.cwd(),
    env: options?.deps?.env ?? { CURSOR_API_KEY: process.env.CURSOR_API_KEY },
    ghLogin: options?.deps?.ghLogin ?? fetchGhLogin,
    resolveSdkAuthReady: options?.deps?.resolveSdkAuthReady ?? defaultResolveSdkAuthReady,
    createRenderer: options?.deps?.createRenderer,
    onSettingsReady: options?.deps?.onSettingsReady,
    startPolling: options?.deps?.startPolling,
    buildPollingDeps: options?.deps?.buildPollingDeps,
  };
}

async function runMainScreen(
  config: AppConfig,
  deps: RunDeps,
  createRenderer?: CreateRenderer,
): Promise<number> {
  const poll = deps.startPolling;
  const buildPollingDeps = deps.buildPollingDeps;
  await runMain(mainViewFromConfig(config), {
    ...tuiOptions(createRenderer),
    onReady:
      poll !== undefined && buildPollingDeps !== undefined
        ? ({ setStatus }) => {
            void poll(
              {
                repository: config.repository,
                assignee: config.assignee,
                cwd: deps.cwd,
                intervalMinutes: config.interval,
              },
              buildPollingDeps(setStatus),
            );
          }
        : undefined,
  });
  return 0;
}

async function runSettingsFlow(
  deps: RunDeps,
  draft: SettingsDraft,
  createRenderer?: CreateRenderer,
): Promise<number> {
  const { cwd, onSettingsReady } = deps;
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
  return runMainScreen(savedConfig, deps, createRenderer);
}

export async function run(options?: RunOptions): Promise<number> {
  const deps = resolveDeps(options);
  const { cwd, env, ghLogin, createRenderer, resolveSdkAuthReady } = deps;
  const sdkReady = await (resolveSdkAuthReady ?? defaultResolveSdkAuthReady)();
  const startup = await loadStartup(cwd, env, ghLogin, sdkReady);

  if (startup.kind === "exit") {
    if (startup.stderr !== undefined && startup.stderr.length > 0) {
      process.stderr.write(startup.stderr.endsWith("\n") ? startup.stderr : `${startup.stderr}\n`);
    }
    return startup.code;
  }

  if (startup.kind === "settings") {
    return runSettingsFlow(deps, startup.draft, createRenderer);
  }

  return runMainScreen(startup.config, deps, createRenderer);
}

if (import.meta.main) {
  const sdkReady = await defaultResolveSdkAuthReady();
  const apiKey = resolveProductionApiKey({ CURSOR_API_KEY: process.env.CURSOR_API_KEY }, sdkReady);
  const code = await run({
    deps: {
      startPolling,
      buildPollingDeps: createProductionPollingDeps(process.cwd(), apiKey),
    },
  });
  process.exit(code);
}
