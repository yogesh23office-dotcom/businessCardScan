import { API_BASE_URL } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import { getCurrentAppUser } from "@/lib/currentAppUser";
import { clearUserBrowserData } from "@/lib/indexeddb";
import { clearOutreachStatusForUser } from "@/lib/outreachStatusStorage";
import { invalidateContactsDirectory } from "@/lib/contactsDirectory";

export type WipeResult = {
  zoho?: unknown;
  contacts?: { deleted?: number; error?: string; note?: string };
  browser?: { queueRemoved: number; contactsRemoved: number };
  scopedToUser?: boolean;
};

export async function wipeAllAppData(options?: {
  includeZoho?: boolean;
}): Promise<WipeResult> {
  const includeZoho = options?.includeZoho !== false;
  const appUser = await getCurrentAppUser();
  const result: WipeResult = { scopedToUser: Boolean(appUser) };

  const backendRes = await apiFetch(`${API_BASE_URL}/admin/wipe-all-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: true, include_zoho: includeZoho }),
  });
  if (!backendRes.ok) {
    let detail = `Wipe failed (${backendRes.status})`;
    try {
      const err = await backendRes.json();
      if (typeof err.detail === "string") detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const backendJson = await backendRes.json();
  result.zoho = backendJson.zoho;
  result.contacts = backendJson.contacts;
  result.scopedToUser = Boolean(backendJson.scoped_to_user ?? appUser);

  const browser = await clearUserBrowserData(appUser);
  clearOutreachStatusForUser(appUser);
  result.browser = browser;

  invalidateContactsDirectory();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    window.dispatchEvent(new CustomEvent("cs-queue-updated"));
  }

  return result;
}

export async function clearLocalQueueOnly(): Promise<number> {
  const appUser = await getCurrentAppUser();
  const { clearUserSyncQueue } = await import("@/lib/indexeddb");
  const removed = await clearUserSyncQueue(appUser);
  invalidateContactsDirectory();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-queue-updated"));
  }
  return removed;
}
