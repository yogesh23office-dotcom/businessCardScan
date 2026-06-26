import { saveUserSettings, loadUserSettings, DEFAULT_USER_SETTINGS } from "@/lib/settingsStorage";

const LEGACY_PLACEHOLDER_EMAILS = new Set([
  "yogeshvanaparthi@gmail.com",
  "alex@cardsync.ai",
  "yogi2324@gmail.com",
]);

const LEGACY_PLACEHOLDER_NAMES = new Set(["Yogesh VR", "Yogesh Vanaparti", "Alex Kim"]);

/** Persist Neon Auth name/email/phone into local profile so Settings reflects the signed-up account. */
export function syncProfileFromAuthUser(user: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): void {
  const email = user.email?.trim();
  const name = user.name?.trim();
  const phone = user.phone?.trim();
  if (!email && !name && !phone) return;

  const current = loadUserSettings();
  const updates: Partial<typeof current> = {};

  const storedEmail = current.email?.trim().toLowerCase() || "";
  const defaultEmail = DEFAULT_USER_SETTINGS.email.trim().toLowerCase();

  if (
    email &&
    (!storedEmail ||
      storedEmail === defaultEmail ||
      LEGACY_PLACEHOLDER_EMAILS.has(storedEmail))
  ) {
    updates.email = email;
  }

  const storedName = current.fullName?.trim() || "";
  if (
    name &&
    (!storedName ||
      storedName === DEFAULT_USER_SETTINGS.fullName.trim() ||
      LEGACY_PLACEHOLDER_NAMES.has(storedName))
  ) {
    updates.fullName = name;
  }

  const storedPhone = current.phone?.trim() || "";
  if (phone && !storedPhone) {
    updates.phone = phone;
  }

  if (Object.keys(updates).length > 0) {
    saveUserSettings(updates);
  }
}
