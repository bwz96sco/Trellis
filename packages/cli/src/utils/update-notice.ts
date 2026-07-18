export function shouldCheckForUpdates(argv: readonly string[]): boolean {
  return !argv.includes("--json");
}
