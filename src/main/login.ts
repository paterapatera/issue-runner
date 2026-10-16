import { Cursor } from "@cursor/sdk";

const LOGIN_FAILED = "Cursor へのログインに失敗しました";

export async function runLogin(deps?: {
  login?: () => Promise<void>;
  writeStderr?: (line: string) => void;
}): Promise<number> {
  const writeStderr = deps?.writeStderr ?? ((line: string) => process.stderr.write(`${line}\n`));
  const login = deps?.login ?? (() => Cursor.auth.login());
  try {
    await login();
    return 0;
  } catch {
    writeStderr(LOGIN_FAILED);
    return 1;
  }
}

if (import.meta.main) {
  process.exit(await runLogin());
}
