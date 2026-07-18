import fs from "node:fs";
import path from "node:path";

const DEFAULT_RETRY_INTERVAL_MS = 25;
const DEFAULT_MAX_WAIT_MS = 5000;

export interface ResearchLockOptions {
  retryIntervalMs?: number;
  maxWaitMs?: number;
}

export async function acquireResearchLock(
  lockFile: string,
  options: ResearchLockOptions = {},
): Promise<void> {
  const retryIntervalMs =
    options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const deadline = Date.now() + maxWaitMs;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });

  while (true) {
    try {
      const fd = fs.openSync(lockFile, "wx");
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }

    if (stealStaleLock(lockFile)) continue;
    if (Date.now() >= deadline) {
      throw new Error(`Failed to acquire research lock ${lockFile} within ${maxWaitMs}ms`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, retryIntervalMs));
  }
}

export function releaseResearchLock(lockFile: string): void {
  try {
    if (fs.readFileSync(lockFile, "utf-8").trim() === String(process.pid)) {
      fs.unlinkSync(lockFile);
    }
  } catch {
    // The lock was already removed or replaced by another process.
  }
}

export async function withResearchLock<T>(
  lockFile: string,
  operation: () => Promise<T> | T,
  options?: ResearchLockOptions,
): Promise<T> {
  await acquireResearchLock(lockFile, options);
  try {
    return await operation();
  } finally {
    releaseResearchLock(lockFile);
  }
}

function stealStaleLock(lockFile: string): boolean {
  let holderPid = 0;
  try {
    holderPid = Number(fs.readFileSync(lockFile, "utf-8").trim());
  } catch {
    return false;
  }
  if (holderPid > 0 && isPidAlive(holderPid)) return false;
  try {
    fs.unlinkSync(lockFile);
    return true;
  } catch {
    return false;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
