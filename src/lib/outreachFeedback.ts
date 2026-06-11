import { toast } from "sonner";
import type { ZohoSyncResult } from "@/lib/contactApi";
import type { UserSettings } from "@/lib/settingsStorage";

/** Show thank-you email/WhatsApp result after Zoho sync (from API response body). */
export function notifyOutreachAfterSync(
  settings: UserSettings,
  result?: ZohoSyncResult | null,
): void {
  if (!result) return;

  if (settings.emailNotificationsEnabled) {
    const sent = result.emailSent || Boolean(result.emailTo && !result.emailError);
    if (sent) {
      const to = result.emailTo || result.emailExtracted || "contact";
      const extracted = result.emailExtracted;
      const deliveredToExtracted =
        extracted &&
        to &&
        String(to).trim().toLowerCase() === String(extracted).trim().toLowerCase();
      if (deliveredToExtracted) {
        toast.success(`Thank-you email sent to ${to}.`);
      } else if (extracted) {
        toast.success(
          `Thank-you email sent (dev test inbox: ${to}). Card email: ${extracted}.`,
        );
      } else {
        toast.success(`Thank-you email sent to ${to}.`);
      }
    } else if (result.emailSkipped) {
      toast.info("Email skipped — enable Email follow-ups in Settings.");
    } else if (result.emailError) {
      toast.error(`Email not sent: ${result.emailError}`);
    } else if (!result.emailExtracted) {
      toast.error(
        "Email not sent: add an email on the Review page (check the Email field is filled and included in the picker).",
      );
    }
  }

  if (settings.whatsappNotificationsEnabled) {
    if (result.whatsappSent) {
      const to = result.whatsappTo ? ` to ${result.whatsappTo}` : "";
      toast.success(`WhatsApp template sent${to}.`);
    } else if (result.whatsappError) {
      toast.error(`WhatsApp not sent: ${result.whatsappError}`);
    } else {
      toast.warning("WhatsApp send status unknown — check backend logs.");
    }
  }
}
