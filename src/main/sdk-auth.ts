import { homedir } from "node:os";
import { join } from "node:path";

function sdkAuthPath(): string {
  return join(homedir(), ".cursor", "sdk", "auth.json");
}

export async function sdkAuthReady(
  stat: (path: string) => Promise<{ size: number }>,
): Promise<boolean> {
  try {
    const { size } = await stat(sdkAuthPath());
    return size >= 1;
  } catch {
    return false;
  }
}
