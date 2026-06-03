export type ContactStorageMode = "indexeddb";

let resolvedStorageMode: ContactStorageMode | null = null;

export function setResolvedStorageMode(mode: ContactStorageMode): void {
  resolvedStorageMode = mode;
}

export function getResolvedStorageMode(): ContactStorageMode | null {
  return resolvedStorageMode;
}

export function getContactStorageMode(): ContactStorageMode {
  return "indexeddb";
}

export function getEffectiveStorageMode(): ContactStorageMode {
  return resolvedStorageMode ?? "indexeddb";
}

export function isIndexedDbStorage(): boolean {
  return true;
}

export function isServerStorage(): boolean {
  return false;
}

export function storageLabel(
  _mode: ContactStorageMode = getEffectiveStorageMode(),
  options?: { online?: boolean },
): string {
  const online = options?.online ?? false;
  return online ? "Saved on device" : "This device";
}
