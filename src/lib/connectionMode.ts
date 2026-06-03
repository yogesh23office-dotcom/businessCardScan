export type ConnectionMode = "online" | "offline";

export const CONNECTION_MODE_CHANGED = "cs-connection-mode-changed";

const STORAGE_KEY = "cs-connection-mode";

export function isNetworkOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/** Effective mode: network down always counts as offline. */
export function getConnectionMode(): ConnectionMode {
  if (typeof window === "undefined") return "online";
  if (!navigator.onLine) return "offline";
  return localStorage.getItem(STORAGE_KEY) === "offline" ? "offline" : "online";
}

export function isOfflineMode(): boolean {
  return getConnectionMode() === "offline";
}

export function setConnectionMode(mode: ConnectionMode): ConnectionMode {
  if (typeof window === "undefined") return "online";

  const effective: ConnectionMode = !navigator.onLine ? "offline" : mode;
  localStorage.setItem(STORAGE_KEY, effective);
  window.dispatchEvent(new CustomEvent(CONNECTION_MODE_CHANGED, { detail: effective }));
  return effective;
}

/** Align stored mode with `navigator.onLine` (auto offline / auto online). */
export function syncConnectionModeWithNetwork(): ConnectionMode {
  if (typeof window === "undefined") return "online";

  const mode: ConnectionMode = navigator.onLine ? "online" : "offline";
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(CONNECTION_MODE_CHANGED, { detail: mode }));
  return mode;
}
