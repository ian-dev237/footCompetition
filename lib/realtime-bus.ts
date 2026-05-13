// Global mutable version counter. Each write that affects competition state
// bumps it; SSE clients re-fetch when it changes.
declare global {
  var __rt_version: number | undefined;
}

export function bumpVersion(): number {
  globalThis.__rt_version = (globalThis.__rt_version ?? 0) + 1;
  return globalThis.__rt_version;
}

export function getVersion(): number {
  return globalThis.__rt_version ?? 0;
}
