import { getConnectionMode } from "@/lib/connectionMode";
import type { LeadPayload } from "@/lib/cardImage";
import type { QueueItem } from "@/lib/indexeddb";
import { API_BASE_URL } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import {
  syncAllPendingContactsToZoho,
  syncContactToZoho,
  syncPayloadToZoho,
} from "@/lib/contactApi";

/** Python FastAPI — PostgreSQL/Firebase storage is behind this API. */
const API = API_BASE_URL;

export type LocalContact = {
  id: string;
  name: string;
  fullName: string;
  firstName: string;
  lastName: string;
  designation: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  syncStatus: string;
  zohoLeadId?: string | null;
  status: string;
  source: "localdb" | "indexeddb" | "firebase";
  created_at: string;
  lastSync: string;
};

function payloadToLocalBody(
  payload: LeadPayload,
  cardImageBase64?: string,
  options?: { connectionMode?: "online" | "offline"; skipWhatsApp?: boolean; skipEmail?: boolean },
) {
  return {
    fullName: payload.fullName,
    firstName: payload.firstName || "",
    lastName: payload.lastName || "",
    designation: payload.designation || "",
    company: payload.company || "",
    phone: payload.phone || "",
    secondaryPhone: payload.secondaryPhone || "",
    email: payload.email || "",
    secondaryEmail: payload.secondaryEmail || "",
    website: payload.website || "",
    secondaryWebsite: payload.secondaryWebsite || "",
    address: payload.address || "",
    secondaryAddress: payload.secondaryAddress || "",
    socialLinks: payload.socialLinks || "",
    gstNumber: payload.gstNumber || "",
    notes: payload.notes || "",
    eventName: payload.eventName || "",
    eventId: payload.eventId || "",
    cardImageBase64,
    syncStatus: "local_only" as const,
    connectionMode: options?.connectionMode ?? getConnectionMode(),
    skipWhatsApp: Boolean(options?.skipWhatsApp),
    skipEmail: Boolean(options?.skipEmail),
  };
}

export function getLocalDbUrl(): string {
  return API;
}

/** True when Python API is up and the configured storage backend is reachable. */
export async function checkLocalDbHealth(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      ok?: boolean;
      storage?: string;
      database?: { ok?: boolean };
    };
    if (data.storage === "indexeddb") {
      return Boolean(data.ok);
    }
    return Boolean(data.ok && data.database?.ok);
  } catch {
    return false;
  }
}

export type SaveContactResult = {
  id: string;
  zohoLeadId?: string;
  zohoSynced?: boolean;
  alreadySynced?: boolean;
  zohoError?: string;
  emailSent?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
  whatsappSent?: boolean;
  whatsappError?: string | null;
  whatsappTo?: string | null;
  whatsappMessageId?: string | null;
  whatsappDeliveryStatus?: string | null;
  whatsappSendMode?: string | null;
};

export async function saveContactToLocalDb(
  payload: LeadPayload,
  cardImageBase64?: string,
  options?: { connectionMode?: "online" | "offline"; skipWhatsApp?: boolean; skipEmail?: boolean },
): Promise<SaveContactResult> {
  const response = await apiFetch(`${API}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadToLocalBody(payload, cardImageBase64, options)),
  });

  const data = (await response.json()) as SaveContactResult & {
    detail?: string;
    error?: string;
    email_sent?: boolean;
    email_error?: string | null;
    email_to?: string | null;
    email_extracted?: string | null;
    whatsapp_sent?: boolean;
    whatsapp_error?: string | null;
    whatsapp_to?: string | null;
    whatsapp_message_id?: string | null;
    whatsapp_delivery_status?: string | null;
    whatsapp_send_mode?: string | null;
  };
  if (!response.ok) {
    throw new Error(
      data.detail || data.error || `Save failed (${response.status}). Is Python backend running?`,
    );
  }
  if (!data.id) {
    throw new Error("Server did not return a contact id");
  }
  return {
    id: data.id,
    zohoLeadId: data.zohoLeadId,
    zohoSynced: data.zohoSynced,
    alreadySynced: data.alreadySynced,
    zohoError: data.zohoError,
    emailSent: Boolean(data.email_sent ?? data.emailSent),
    emailError: data.email_error ?? data.emailError ?? null,
    emailTo: data.email_to ?? data.emailTo ?? null,
    emailExtracted: data.email_extracted ?? data.emailExtracted ?? null,
    whatsappSent: Boolean(data.whatsapp_sent ?? data.whatsappSent),
    whatsappError: data.whatsapp_error ?? data.whatsappError ?? null,
    whatsappTo: data.whatsapp_to ?? data.whatsappTo ?? null,
    whatsappMessageId: data.whatsapp_message_id ?? data.whatsappMessageId ?? null,
    whatsappDeliveryStatus:
      data.whatsapp_delivery_status ?? data.whatsappDeliveryStatus ?? null,
    whatsappSendMode: data.whatsapp_send_mode ?? data.whatsappSendMode ?? null,
  };
}

export async function updateContactInLocalDb(
  contactId: string,
  payload: LeadPayload,
): Promise<void> {
  const response = await apiFetch(`${API}/api/contacts/${contactId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadToLocalBody(payload)),
  });

  if (!response.ok) {
    const data = (await response.json()) as { detail?: string; error?: string };
    throw new Error(data.detail || data.error || `Update failed (${response.status})`);
  }
}

export async function listLocalContacts(): Promise<LocalContact[]> {
  const response = await apiFetch(`${API}/api/contacts`);
  if (!response.ok) {
    throw new Error(`Failed to load contacts (${response.status})`);
  }
  return response.json() as Promise<LocalContact[]>;
}

export async function deleteLocalContact(contactId: string, deleteZoho = false): Promise<void> {
  const baseUrl = API || (typeof window !== "undefined" ? window.location.origin : "");
  const url = new URL(`/api/contacts/${contactId}`, baseUrl || undefined);
  if (deleteZoho) {
    url.searchParams.set("deleteZoho", "true");
  }

  const response = await apiFetch(url.toString(), {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = (await response.json()) as { detail?: string; error?: string };
    throw new Error(data.detail || data.error || `Delete failed (${response.status})`);
  }
}

export function queueContactToPayload(contactData: Record<string, unknown>): LeadPayload {
  const fullName = String(
    contactData.fullName || contactData.name || "",
  ).trim();
  return {
    fullName,
    firstName: String(contactData.firstName || ""),
    lastName: String(contactData.lastName || ""),
    designation: String(contactData.designation || contactData.title || ""),
    company: String(contactData.company || ""),
    phone: String(contactData.phone || ""),
    secondaryPhone: String(contactData.secondaryPhone || ""),
    email: String(
      contactData.email ||
        contactData.emailAddress ||
        contactData.secondaryEmail ||
        contactData.secondaryEmailAddress ||
        "",
    ),
    secondaryEmail: String(contactData.secondaryEmail || contactData.secondaryEmailAddress || ""),
    website: String(contactData.website || ""),
    secondaryWebsite: String(contactData.secondaryWebsite || ""),
    address: String(contactData.address || ""),
    secondaryAddress: String(contactData.secondaryAddress || ""),
    socialLinks: String(contactData.socialLinks || ""),
    gstNumber: String(contactData.gstNumber || ""),
    notes: String(contactData.notes || ""),
    eventName: String(contactData.eventName || ""),
    eventId: String(contactData.eventId || ""),
  };
}

export async function syncQueueItemToLocalDb(item: QueueItem): Promise<{ id: string }> {
  const payload = queueContactToPayload(item.contact_data);
  if (!payload.fullName) {
    throw new Error("Contact name is required");
  }
  return saveContactToLocalDb(payload, item.image_base64);
}

export type LocalDbSyncResult = {
  synced: number;
  failed: number;
  total: number;
};

export async function syncQueueItemsToLocalDb(items: QueueItem[]): Promise<LocalDbSyncResult> {
  const unsynced = items.filter((item) => item.status !== "synced");
  let synced = 0;
  let failed = 0;

  for (const item of unsynced) {
    try {
      await syncQueueItemToLocalDb(item);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed, total: unsynced.length };
}

export function localContactToPayload(contact: LocalContact): LeadPayload {
  return {
    fullName: contact.fullName || contact.name || "",
    firstName: contact.firstName || "",
    lastName: contact.lastName || "",
    designation: contact.designation || "",
    company: contact.company || "",
    phone: contact.phone || "",
    email: contact.email || String((contact as { emailAddress?: string }).emailAddress || ""),
    website: contact.website || "",
    address: contact.address || "",
    notes: String((contact as { notes?: string }).notes || ""),
    eventName: String((contact as { eventName?: string }).eventName || ""),
    eventId: String((contact as { eventId?: string }).eventId || ""),
  };
}

export async function getLocalContactById(contactId: string): Promise<LocalContact> {
  const response = await apiFetch(`${API}/api/contacts/${contactId}`);
  if (!response.ok) {
    throw new Error(`Contact not found (${response.status})`);
  }
  return response.json() as Promise<LocalContact>;
}

export async function markLocalContactSyncedZoho(
  contactId: string,
  zohoLeadId: string,
): Promise<void> {
  const response = await apiFetch(`${API}/api/contacts/${contactId}/sync-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syncStatus: "synced_zoho", zohoLeadId }),
  });
  if (!response.ok) {
    const data = (await response.json()) as { detail?: string; error?: string };
    throw new Error(data.detail || data.error || `Failed to update sync status (${response.status})`);
  }
}

export async function syncLocalContactToZoho(
  contactId: string,
  options?: { skipWhatsApp?: boolean; skipEmail?: boolean },
): Promise<{ zohoLeadId?: string; alreadySynced?: boolean }> {
  return syncContactToZoho(contactId, options);
}

export async function syncAllLocalPendingToZoho(): Promise<{
  synced: number;
  total: number;
}> {
  return syncAllPendingContactsToZoho();
}

export function isLocalContactPendingZoho(contact: LocalContact): boolean {
  return contact.syncStatus !== "synced_zoho" && !contact.zohoLeadId;
}

export type ThankYouOutreachResult = {
  email_sent?: boolean;
  email_error?: string | null;
  email_to?: string | null;
  email_extracted?: string | null;
  whatsapp_sent?: boolean;
  whatsapp_error?: string | null;
};

/** Send thank-you email/WhatsApp using Review form values (primary selected email). */
export async function sendThankYouOutreach(
  payload: LeadPayload,
  options?: {
    connectionMode?: "online" | "offline";
    skipWhatsApp?: boolean;
    skipEmail?: boolean;
  },
): Promise<ThankYouOutreachResult> {
  const response = await apiFetch(`${API}/api/outreach/thank-you`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      payloadToLocalBody(payload, undefined, {
        connectionMode: options?.connectionMode ?? getConnectionMode(),
        skipWhatsApp: Boolean(options?.skipWhatsApp),
        skipEmail: Boolean(options?.skipEmail),
      }),
    ),
  });

  const data = (await response.json()) as ThankYouOutreachResult & {
    detail?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      data.detail || data.error || `Outreach failed (${response.status}). Is the Python backend running?`,
    );
  }
  return data;
}
