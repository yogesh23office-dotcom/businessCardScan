import { API_BASE_URL } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import { parseApiErrorDetail } from "@/lib/apiErrors";
import {
  getDeleteContactUrl,
  getSyncContactToZohoUrl,
  getSyncPendingToZohoUrl,
} from "@/lib/backendTargets";
import type { LeadPayload } from "@/lib/cardImage";
import { pickPrimaryEmail, pickSecondaryEmail } from "@/lib/contactEmail";

export type ZohoSyncResult = {
  zohoLeadId?: string;
  alreadySynced?: boolean;
  success?: boolean;
  emailSent?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
  emailSkipped?: boolean;
  whatsappSent?: boolean;
  whatsappError?: string | null;
  whatsappTo?: string | null;
  whatsappMessageId?: string | null;
  whatsappDeliveryStatus?: string | null;
  whatsappSendMode?: string | null;
};

function normalizeZohoSyncResult(data: Record<string, unknown>): ZohoSyncResult {
  const emailError = (data.email_error as string | null | undefined) ?? null;
  const emailSent = Boolean(
    data.email_sent ?? data.emailSent ?? (data.email_queued && !emailError),
  );
  const emailExtracted =
    (data.email_extracted as string | null | undefined) ??
    (data.email_to as string | null | undefined) ??
    null;

  return {
    success: data.success === true,
    zohoLeadId:
      (data.zohoLeadId as string | undefined) ||
      (data.zoho_lead_id as string | undefined),
    alreadySynced: Boolean(data.alreadySynced ?? data.already_synced),
    emailSent,
    emailError,
    emailTo: (data.email_to as string | null | undefined) ?? null,
    emailExtracted,
    emailSkipped: Boolean(data.email_skipped ?? data.emailSkipped),
    whatsappSent: Boolean(data.whatsapp_sent ?? data.whatsappSent),
    whatsappError: (data.whatsapp_error as string | null | undefined) ?? null,
    whatsappTo: (data.whatsapp_to as string | null | undefined) ?? null,
    whatsappMessageId:
      (data.whatsapp_message_id as string | null | undefined) ?? null,
    whatsappDeliveryStatus:
      (data.whatsapp_delivery_status as string | null | undefined) ?? null,
    whatsappSendMode:
      (data.whatsapp_send_mode as string | null | undefined) ?? null,
  };
}

export async function seedOfflineSampleContact(): Promise<{
  seeded?: boolean;
  id?: string;
}> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/contacts/seed-sample`, {
      method: "POST",
    });
    if (!response.ok) {
      return { seeded: false };
    }
    return response.json();
  } catch {
    return { seeded: false };
  }
}

export async function saveLeadToZoho(payload: LeadPayload): Promise<void> {
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE_URL}/api/leads/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Python backend not reachable at ${API_BASE_URL || "port 5000"}. Start: npm run server`,
    );
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      parseApiErrorDetail(errBody, "Failed to save lead to Zoho CRM."),
    );
  }
}

export async function syncPayloadToZoho(
  payload: LeadPayload & { zohoLeadId?: string | null },
  options?: {
    connectionMode?: "online" | "offline";
    skipWhatsApp?: boolean;
    skipEmail?: boolean;
  },
): Promise<ZohoSyncResult> {
  let response: Response;
  try {
    response = await apiFetch(`${API_BASE_URL}/api/leads/sync-from-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: payload.fullName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        company: payload.company,
        designation: payload.designation,
        phone: payload.phone,
        secondaryPhone: payload.secondaryPhone,
        email: pickPrimaryEmail(payload),
        emailAddress: pickPrimaryEmail(payload),
        secondaryEmail: pickSecondaryEmail(payload),
        secondaryEmailAddress: pickSecondaryEmail(payload),
        website: payload.website,
        secondaryWebsite: payload.secondaryWebsite,
        address: payload.address,
        secondaryAddress: payload.secondaryAddress,
        eventName: payload.eventName,
        eventId: payload.eventId,
        notes: payload.notes || "",
        zohoLeadId: payload.zohoLeadId,
        connectionMode: options?.connectionMode ?? "online",
        skipWhatsApp: Boolean(options?.skipWhatsApp),
        skipEmail: Boolean(options?.skipEmail),
      }),
    });
  } catch {
    throw new Error(
      "Python backend not reachable. Run npm run dev:all (API on port 5000).",
    );
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      parseApiErrorDetail(data, "Failed to sync contact to Zoho CRM."),
    );
  }

  return normalizeZohoSyncResult(data);
}

export async function syncContactToZoho(
  contactId: string,
  options?: { skipWhatsApp?: boolean; skipEmail?: boolean },
): Promise<ZohoSyncResult> {
  let response: Response;
  try {
    response = await apiFetch(getSyncContactToZohoUrl(contactId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skipWhatsApp: Boolean(options?.skipWhatsApp),
        skipEmail: Boolean(options?.skipEmail),
      }),
    });
  } catch {
    throw new Error(
      "Python backend not reachable. Run npm run dev:all (API on port 5000).",
    );
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      parseApiErrorDetail(data, "Failed to sync contact to Zoho CRM."),
    );
  }

  return normalizeZohoSyncResult(data);
}

export async function deleteZohoLead(leadId: string): Promise<void> {
  const id = leadId.trim();
  if (!id || id.startsWith("zoho-")) {
    throw new Error("Invalid Zoho lead id.");
  }

  let response: Response;
  try {
    response = await apiFetch(getDeleteContactUrl(id, "zoho"), {
      method: "DELETE",
    });
  } catch {
    throw new Error(
      "Python backend not reachable. Run npm run dev:all (API on port 5000).",
    );
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseApiErrorDetail(data, "Failed to delete contact from Zoho CRM."));
  }
}

export async function syncAllPendingContactsToZoho(): Promise<{
  synced: number;
  total: number;
}> {
  let response: Response;
  try {
    response = await apiFetch(getSyncPendingToZohoUrl(), {
      method: "POST",
    });
  } catch {
    throw new Error(
      "Python backend not reachable. Run npm run dev:all (API on port 5000).",
    );
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      parseApiErrorDetail(data, "Failed to sync pending contacts to Zoho CRM."),
    );
  }

  return {
    synced: Number(data.synced ?? 0),
    total: Number(data.total ?? 0),
  };
}
