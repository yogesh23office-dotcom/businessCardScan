import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Cookie,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  ScanLine,
  Scale,
  Shield,
  Trash2,
  Wifi,
} from "lucide-react";
import { clearLocalQueueOnly, wipeAllAppData } from "@/lib/wipeAllData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageShell } from "@/components/layout/PageShell";
import { ProfileSettingsCard } from "@/components/settings/ProfileSettingsCard";
import { PAGE } from "@/constants/navigation";
import {
  COOKIE_POLICY_SECTIONS,
  LEGAL_PAGE_URLS,
} from "@/constants/legalContent";
import { LegalDocumentModal } from "@/components/legal/LegalDocumentModal";
import { toast } from "sonner";
import { useConfirmModal } from "@/components/ui/confirm-modal";
import { hasCookieConsent, saveCookieConsent } from "@/lib/cookieConsent";
import {
  applyWorkModePreference,
  DEFAULT_USER_SETTINGS,
  getUserInitials,
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from "@/lib/settingsStorage";

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange?: (value: boolean) => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[11px] text-muted-foreground">{description}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export function SettingsPage() {
  const { confirm } = useConfirmModal();
  const [profile, setProfile] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [cookiesOpen, setCookiesOpen] = useState(false);

  const initials = useMemo(() => getUserInitials(profile.fullName), [profile.fullName]);

  useEffect(() => {
    const loaded = loadUserSettings();
    const consent = hasCookieConsent();
    setProfile(
      consent
        ? { ...loaded, cookiesAccepted: true }
        : loaded,
    );
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("cs-dark");
  }, []);

  const updateProfileField = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const persistToggle = <K extends keyof UserSettings>(key: K, value: UserSettings[K], message: string) => {
    updateProfileField(key, value);
    saveUserSettings({ [key]: value });
    toast.success(message);
  };

  const persistCookieChoice = (analytics: boolean) => {
    saveCookieConsent({ essential: true, analytics });
    persistToggle("cookiesAccepted", true, "Cookie preferences saved.");
    persistToggle("analyticsCookiesEnabled", analytics, analytics ? "Analytics enabled." : "Analytics disabled.");
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    try {
      saveUserSettings(profile);
      applyWorkModePreference(profile.preferOfflineCapture);
      toast.success("Profile saved to this device.");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearQueue = async () => {
    const ok = await confirm({
      title: "Clear offline queue?",
      description:
        "Clear the offline sync queue on this device? Contacts already saved elsewhere are not removed.",
      confirmLabel: "Clear queue",
      destructive: true,
    });
    if (!ok) return;
    setIsClearingQueue(true);
    try {
      await clearLocalQueueOnly();
      toast.success("Offline queue cleared on this device.");
    } catch {
      toast.error("Failed to clear queue.");
    } finally {
      setIsClearingQueue(false);
    }
  };

  const handleWipeAll = async () => {
    const ok = await confirm({
      title: "Delete all data?",
      description:
        "Delete ALL contacts and queue data on this device?\n\nThis cannot be undone.",
      confirmLabel: "Delete all",
      destructive: true,
    });
    if (!ok) return;
    setIsWiping(true);
    try {
      await wipeAllAppData();
      toast.success("All contacts and queue data cleared on this device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wipe failed.");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <PageShell title={PAGE.preferences.title} description={PAGE.preferences.description}>
      <LegalDocumentModal
        open={cookiesOpen}
        onOpenChange={setCookiesOpen}
        title="Cookie Policy"
        sections={COOKIE_POLICY_SECTIONS}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSettingsCard
          profile={profile}
          initials={initials}
          isSaving={isSaving}
          onChange={updateProfileField}
          onSave={handleSaveProfile}
        />

        <Card className="flex h-full flex-col rounded-2xl border-border/60 p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Control in-app alerts and follow-up reminders. Changes apply on this device immediately.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SettingRow
              icon={<Bell className="h-4 w-4" />}
              title="Sync alerts"
              description="Toast when contacts save or fail to sync"
              checked={profile.notificationsEnabled}
              onCheckedChange={(v) =>
                persistToggle(
                  "notificationsEnabled",
                  v,
                  v ? "Sync alerts on." : "Sync alerts off.",
                )
              }
            />
            <SettingRow
              icon={<Inbox className="h-4 w-4" />}
              title="Queue updates"
              description="Notify when items are added or cleared from the sync queue"
              checked={profile.queueNotificationsEnabled}
              onCheckedChange={(v) =>
                persistToggle(
                  "queueNotificationsEnabled",
                  v,
                  v ? "Queue notifications on." : "Queue notifications off.",
                )
              }
            />
            <SettingRow
              icon={<ScanLine className="h-4 w-4" />}
              title="Capture complete"
              description="Alert when OCR finishes on the Capture page"
              checked={profile.captureNotificationsEnabled}
              onCheckedChange={(v) =>
                persistToggle(
                  "captureNotificationsEnabled",
                  v,
                  v ? "Capture notifications on." : "Capture notifications off.",
                )
              }
            />
            <SettingRow
              icon={<Mail className="h-4 w-4" />}
              title="Email follow-ups"
              description="Remind you to send email after saving a contact (when available)"
              checked={profile.emailNotificationsEnabled}
              onCheckedChange={(v) =>
                persistToggle(
                  "emailNotificationsEnabled",
                  v,
                  v ? "Email reminders on." : "Email reminders off.",
                )
              }
            />
            <SettingRow
              icon={<MessageCircle className="h-4 w-4" />}
              title="Auto thank-you on WhatsApp"
              description="Send an approved template to the contact's phone when you save or sync (requires a phone on the card)"
              checked={profile.whatsappNotificationsEnabled}
              onCheckedChange={(v) =>
                persistToggle(
                  "whatsappNotificationsEnabled",
                  v,
                  v ? "WhatsApp auto-send on." : "WhatsApp auto-send off.",
                )
              }
            />
          </div>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border-border/60 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="h-4 w-4 text-primary" /> Capture & workflow
          </div>
          <div className="mt-5 space-y-3">
            <SettingRow
              title="Capture tips"
              description="Show rotating guidance on the Capture page"
              checked={profile.showCaptureTips}
              onCheckedChange={(v) =>
                persistToggle("showCaptureTips", v, v ? "Capture tips enabled." : "Capture tips hidden.")
              }
            />
            <SettingRow
              title="Prefer offline capture"
              description="Queue new cards locally until you choose to save them (when online)"
              checked={profile.preferOfflineCapture}
              onCheckedChange={(v) => {
                persistToggle(
                  "preferOfflineCapture",
                  v,
                  v ? "Offline capture preferred." : "Online capture preferred.",
                );
                applyWorkModePreference(v);
              }}
            />
            <SettingRow
              icon={<Wifi className="h-4 w-4" />}
              title="Auto-sync to Zoho CRM when online"
              description="When back online, sync the offline queue to Zoho CRM and send email follow-ups"
              checked={profile.autoSyncToZohoWhenOnline}
              onCheckedChange={(v) => {
                persistToggle(
                  "autoSyncToZohoWhenOnline",
                  v,
                  v ? "Auto-sync to Zoho enabled." : "Auto-sync to Zoho disabled.",
                );
                if (v && typeof navigator !== "undefined" && navigator.onLine) {
                  void import("@/lib/autoZohoSync").then(({ maybeAutoSyncToZohoWhenOnline }) =>
                    maybeAutoSyncToZohoWhenOnline().then((summary) => {
                      if (summary.ran && summary.queueSynced + summary.contactsSynced > 0) {
                        toast.success("Pending contacts synced to Zoho CRM.");
                        window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
                        window.dispatchEvent(new CustomEvent("cs-queue-updated"));
                      }
                    }),
                  );
                }
              }}
            />
          </div>
        </Card>

        <Card className="flex h-full flex-col rounded-2xl border-border/60 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary" /> Legal & cookies
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Terms and privacy open as public pages on this site (suitable for Meta and business
            verification). Cookie preferences are managed below.
          </p>
          <div className="mt-5 space-y-3">
            <SettingRow
              icon={<Cookie className="h-4 w-4" />}
              title="Essential cookies"
              description="Required for navigation and sidebar state — always active"
              checked
              disabled
            />
            <SettingRow
              icon={<Cookie className="h-4 w-4" />}
              title="Analytics cookies"
              description="Optional local usage insights to improve the product"
              checked={profile.analyticsCookiesEnabled}
              onCheckedChange={(v) => persistCookieChoice(v)}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <a
                href={LEGAL_PAGE_URLS.terms}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Scale className="mr-2 h-4 w-4" />
                Terms
                <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <a
                href={LEGAL_PAGE_URLS.privacy}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Privacy
                <ExternalLink className="ml-1 h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setCookiesOpen(true)}
            >
              <Cookie className="mr-2 h-4 w-4" />
              Cookies
            </Button>
          </div>
          {!profile.cookiesAccepted ? (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Cookie consent pending — use the cookie icon at the bottom-right or enable analytics above.
            </p>
          ) : null}
        </Card>

        <Card className="rounded-2xl border-destructive/20 bg-destructive/5 p-6 shadow-soft lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <Trash2 className="h-4 w-4" />
                Danger zone
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Irreversible actions affecting data on this device.
              </div>
            </div>
            <div className="mt-4 flex w-full flex-col gap-2 sm:mt-0 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={handleClearQueue}
                disabled={isClearingQueue || isWiping}
              >
                {isClearingQueue ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                Clear local queue
              </Button>
              <Button
                variant="destructive"
                className="w-full rounded-xl sm:w-auto"
                onClick={handleWipeAll}
                disabled={isWiping || isClearingQueue}
              >
                {isWiping ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3 w-3" />
                )}
                Delete all data
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
