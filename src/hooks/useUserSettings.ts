import { useEffect, useState } from "react";
import { authClient } from "@/auth";
import {
  DEFAULT_USER_SETTINGS,
  getUserFirstName,
  getUserInitials,
  loadUserSettings,
  type UserSettings,
} from "@/lib/settingsStorage";

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const { data: authSession } = authClient.useSession();

  useEffect(() => {
    setSettings(loadUserSettings());

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<UserSettings>).detail;
      setSettings(detail ? { ...DEFAULT_USER_SETTINGS, ...detail } : loadUserSettings());
    };

    window.addEventListener("cs-settings-updated", handleUpdate as EventListener);
    return () => {
      window.removeEventListener("cs-settings-updated", handleUpdate as EventListener);
    };
  }, []);

  const authEmail = authSession?.user?.email?.trim();
  const authName = authSession?.user?.name?.trim();
  const merged = {
    ...settings,
    ...(authEmail ? { email: authEmail } : {}),
    ...(authName ? { fullName: authName } : {}),
  };

  return {
    settings: merged,
    fullName: merged.fullName,
    email: merged.email,
    phone: merged.phone,
    company: merged.company,
    role: merged.role,
    initials: getUserInitials(merged.fullName || authEmail || "User"),
    firstName: getUserFirstName(merged.fullName || authName || "User"),
  };
}
