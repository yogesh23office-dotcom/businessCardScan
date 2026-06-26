import { authClient } from "@/auth";
import { isAuthEnabled } from "@/lib/authConfig";
import { loadUserSettings } from "@/lib/settingsStorage";

export type AppUserIdentity = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
};

/** Best-effort identity from local settings (sync, no network). */
export function getCurrentAppUserSync(): AppUserIdentity | null {
  const settings = loadUserSettings();
  const email = settings.email?.trim().toLowerCase() || "";
  const phone = settings.phone?.trim() || "";
  const fullName = settings.fullName?.trim() || "";
  if (!email && !phone && !fullName) return null;
  return { id: "", email, phone, fullName };
}

/** Identity for offline scoping and profile — prefers Neon session when available. */
export async function getCurrentAppUser(): Promise<AppUserIdentity | null> {
  const settings = loadUserSettings();
  let id = "";
  let email = settings.email?.trim().toLowerCase() || "";
  let phone = settings.phone?.trim() || "";
  let fullName = settings.fullName?.trim() || "";

  if (isAuthEnabled) {
    try {
      const session = await authClient.getSession();
      const user = session.data?.user;
      if (user) {
        id = String(user.id || "").trim();
        email = user.email?.trim().toLowerCase() || email;
        fullName = user.name?.trim() || fullName;
      }
    } catch {
      /* session unavailable */
    }
  }

  if (!id && !email && !phone) return null;
  return { id, email, phone, fullName };
}

export function getUserScopeKey(user: AppUserIdentity | null): string {
  if (!user) return "anonymous";
  if (user.email.trim()) return `email:${user.email.trim().toLowerCase()}`;
  if (user.id.trim()) return `id:${user.id.trim()}`;
  if (user.phone.trim()) return `phone:${user.phone.replace(/\D/g, "")}`;
  return "anonymous";
}

/** All storage keys that may hold this user's outreach data (write + read). */
export function getUserScopeKeys(user: AppUserIdentity | null): string[] {
  if (!user) return ["anonymous"];
  const keys: string[] = [];
  if (user.email.trim()) keys.push(`email:${user.email.trim().toLowerCase()}`);
  if (user.id.trim()) keys.push(`id:${user.id.trim()}`);
  if (user.phone.trim()) keys.push(`phone:${user.phone.replace(/\D/g, "")}`);
  return keys.length ? keys : ["anonymous"];
}

export function stampCapturedByFields(
  payload: Record<string, unknown>,
  user: AppUserIdentity | null,
): Record<string, unknown> {
  if (!user || (!user.email && !user.id)) return payload;
  return {
    ...payload,
    capturedByEmail: user.email || payload.capturedByEmail,
    capturedByUserId: user.id || payload.capturedByUserId,
    capturedByPhone: user.phone || payload.capturedByPhone,
    capturedByName: user.fullName || payload.capturedByName,
  };
}

export function contactBelongsToAppUser(
  record: {
    capturedByEmail?: unknown;
    capturedByUserId?: unknown;
    capturedByPhone?: unknown;
    contact_data?: {
      capturedByEmail?: unknown;
      capturedByUserId?: unknown;
      capturedByPhone?: unknown;
    };
  },
  user: AppUserIdentity | null,
): boolean {
  if (!isAuthEnabled || !user) return true;

  const data = record.contact_data ?? record;
  const capturedEmail = String(data.capturedByEmail || "").trim().toLowerCase();
  const capturedId = String(data.capturedByUserId || "").trim();
  const capturedPhone = String(data.capturedByPhone || "").replace(/\D/g, "");
  const userEmail = user.email.trim().toLowerCase();
  const userId = user.id.trim();
  const userPhone = user.phone.replace(/\D/g, "");

  if (!capturedEmail && !capturedId && !capturedPhone) return false;
  if (capturedEmail && userEmail && capturedEmail === userEmail) return true;
  if (capturedId && userId && capturedId === userId) return true;
  if (
    capturedPhone &&
    userPhone &&
    (capturedPhone === userPhone ||
      capturedPhone.endsWith(userPhone) ||
      userPhone.endsWith(capturedPhone))
  ) {
    return true;
  }
  return false;
}
