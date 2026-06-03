import { clearAllBrowserData, clearSyncQueue } from "@/lib/indexeddb";

export type WipeResult = {
  browser?: { cleared: true };
};

export async function wipeAllAppData(): Promise<WipeResult> {
  await clearAllBrowserData();
  const result: WipeResult = { browser: { cleared: true } };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    window.dispatchEvent(new CustomEvent("cs-queue-updated"));
  }

  return result;
}

export async function clearLocalQueueOnly(): Promise<void> {
  await clearSyncQueue();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-queue-updated"));
  }
}
