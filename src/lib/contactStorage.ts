import type { LeadPayload } from "@/lib/cardImage";
import { pickPrimaryEmail } from "@/lib/contactEmail";
import {
  setResolvedStorageMode,
  storageLabel,
  type ContactStorageMode,
} from "@/lib/storageConfig";
import {
  addToQueue,
  deleteStoredContact,
  getQueueItems,
  getStoredContactById,
  listStoredContacts,
  patchStoredContactSyncStatus,
  removeQueueItem,
  saveStoredContact,
  updateQueueItem,
  updateStoredContact,
  type QueueItem,
} from "@/lib/indexeddb";
import {
  localContactToPayload,
  queueContactToPayload,
  type LocalContact,
} from "@/lib/localContactApi";
import { recordContactEventLink } from "@/lib/eventStorage";
import { getConnectionMode } from "@/lib/connectionMode";
import { syncPayloadToZoho, seedOfflineSampleContact } from "@/lib/contactApi";
import {
  getCurrentAppUser,
  stampCapturedByFields,
  type AppUserIdentity,
} from "@/lib/currentAppUser";
import { recordOutreachFromSyncResult } from "@/lib/outreachStatusStorage";

export type StoredContact = Awaited<ReturnType<typeof listStoredContacts>>[number];

export {
  isIndexedDbStorage,
  storageLabel,
  type ContactStorageMode,
} from "@/lib/storageConfig";

export { queueContactToPayload, localContactToPayload, seedOfflineSampleContact };

export async function resolveStorageMode(): Promise<ContactStorageMode> {
  setResolvedStorageMode("indexeddb");
  return "indexeddb";
}

export async function checkStorageHealth(): Promise<boolean> {
  await resolveStorageMode();
  return true;
}

export async function listContacts(): Promise<StoredContact[]> {
  await resolveStorageMode();
  return listStoredContacts() as Promise<StoredContact[]>;
}

export async function getContactById(contactId: string): Promise<StoredContact | null> {
  const contact = await getStoredContactById(contactId);
  return contact as StoredContact | null;
}

/** Offline = no internet (or explicit offline). Online = Zoho + email. */
function isOfflineSave(options?: { connectionMode?: "online" | "offline" }): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (options?.connectionMode === "offline") return true;
  if (options?.connectionMode === "online") return false;
  return false;
}

function saveConnectionMode(): "online" | "offline" {
  return getConnectionMode();
}

function notifyContactsListChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    void import("@/lib/contactsDirectory").then((m) => m.invalidateContactsDirectory());
  }
}

type ZohoSaveFields = {
  zohoLeadId?: string;
  zohoSynced?: boolean;
  alreadySynced?: boolean;
  zohoError?: string;
  emailSent?: boolean;
  emailAttempted?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
  whatsappSent?: boolean;
  whatsappAttempted?: boolean;
  whatsappError?: string | null;
  whatsappTo?: string | null;
  whatsappMessageId?: string | null;
  whatsappDeliveryStatus?: string | null;
  whatsappSendMode?: string | null;
};

async function persistOutreachStatus(
  payload: LeadPayload,
  zoho: {
    zohoLeadId?: string;
    emailSent?: boolean;
    emailAttempted?: boolean;
    emailError?: string | null;
    emailSkipped?: boolean;
    whatsappSent?: boolean;
    whatsappAttempted?: boolean;
    whatsappError?: string | null;
  },
): Promise<void> {
  await recordOutreachFromSyncResult(
    {
      zohoLeadId: zoho.zohoLeadId,
      email: pickPrimaryEmail(payload),
      phone: payload.phone,
      name: payload.fullName,
    },
    zoho,
  );
}

async function saveOfflineToIndexedDbQueue(
  payload: LeadPayload,
  cardImageBase64?: string,
  errorMessage = "Saved offline — will sync to Zoho when online",
): Promise<{ id: string; queued: true }> {
  const email = pickPrimaryEmail(payload);
  const appUser = await getCurrentAppUser();
  const item = buildQueueItemFromPayload(
    { ...payload, email },
    cardImageBase64,
    errorMessage,
    appUser,
  );
  await addToQueue(item);
  const { recordOfflineQueueCapture } = await import("@/lib/captureSourceAnalytics");
  recordOfflineQueueCapture();
  notifyContactsListChanged();
  return { id: item.id, queued: true };
}

async function saveOnlineDirectToZoho(
  payload: LeadPayload,
  cardImageBase64?: string,
  options?: {
    skipWhatsApp?: boolean;
    skipEmail?: boolean;
  },
): Promise<{ id: string; queued?: boolean } & ZohoSaveFields> {
  const email = pickPrimaryEmail(payload);
  const body = { ...payload, email };
  const skipEmail = Boolean(options?.skipEmail) || !email;

  try {
    const zoho = await syncPayloadToZoho(body, {
      connectionMode: "online",
      skipWhatsApp: options?.skipWhatsApp,
      skipEmail,
    });
    if (body.eventName?.trim()) {
      recordContactEventLink({
        eventName: body.eventName.trim(),
        zohoLeadId: zoho.zohoLeadId,
        email,
        phone: body.phone,
      });
    }
    const { recordDirectZohoCapture } = await import("@/lib/captureSourceAnalytics");
    recordDirectZohoCapture();
    await persistOutreachStatus(body, zoho);
    notifyContactsListChanged();
    return {
      id: zoho.zohoLeadId || crypto.randomUUID(),
      zohoLeadId: zoho.zohoLeadId,
      zohoSynced: Boolean(zoho.zohoLeadId),
      alreadySynced: zoho.alreadySynced,
      emailSent: zoho.emailSent,
      emailAttempted: zoho.emailAttempted,
      emailError: zoho.emailError,
      emailTo: zoho.emailTo,
      emailExtracted: zoho.emailExtracted || email || null,
      whatsappSent: zoho.whatsappSent,
      whatsappAttempted: zoho.whatsappAttempted,
      whatsappError: zoho.whatsappError,
      whatsappTo: zoho.whatsappTo,
      whatsappMessageId: zoho.whatsappMessageId,
      whatsappDeliveryStatus: zoho.whatsappDeliveryStatus,
      whatsappSendMode: zoho.whatsappSendMode,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Zoho sync failed";
    const fallback = await saveOfflineToIndexedDbQueue(body, cardImageBase64, message);
    return { ...fallback, zohoError: message };
  }
}

export async function syncQueueItemToZoho(
  item: QueueItem,
  options?: { skipWhatsApp?: boolean; skipEmail?: boolean },
): Promise<{
  zohoLeadId?: string;
  emailSent?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
}> {
  if (!navigator.onLine) {
    throw new Error("No internet. Connect to sync to Zoho CRM.");
  }
  const payload = queueContactToPayload(item.contact_data);
  const result = await syncPayloadToZoho(payload, {
    connectionMode: "online",
    skipWhatsApp: options?.skipWhatsApp,
    skipEmail: options?.skipEmail,
  });
  if (payload.eventName?.trim()) {
    recordContactEventLink({
      eventName: payload.eventName.trim(),
      zohoLeadId: result.zohoLeadId,
      email: pickPrimaryEmail(payload),
      phone: payload.phone,
    });
  }
  await removeQueueItem(item.id);
  await persistOutreachStatus(payload, result);
  const { recordQueueSyncedToZoho } = await import("@/lib/captureSourceAnalytics");
  recordQueueSyncedToZoho();
  notifyContactsListChanged();
  return {
    zohoLeadId: result.zohoLeadId,
    emailSent: result.emailSent,
    emailError: result.emailError,
    emailTo: result.emailTo,
    emailExtracted: result.emailExtracted || pickPrimaryEmail(payload),
  };
}

export async function syncAllQueueItemsToZoho(options?: {
  skipWhatsApp?: boolean;
  skipEmail?: boolean;
}): Promise<{ synced: number; total: number }> {
  const items = await getQueueItems();
  const pending = items.filter((i) => i.status === "pending" || i.status === "retrying");
  let synced = 0;
  for (const item of pending) {
    try {
      await updateQueueItem({
        ...item,
        status: "retrying",
        last_attempt: new Date().toISOString(),
      });
      await syncQueueItemToZoho(item, options);
      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Zoho sync failed";
      const nextRetry = item.retry_count + 1;
      await updateQueueItem({
        ...item,
        status: nextRetry >= 5 ? "failed" : "pending",
        retry_count: nextRetry,
        last_attempt: new Date().toISOString(),
        error_message: message,
      });
    }
  }
  return { synced, total: pending.length };
}

export async function saveContact(
  payload: LeadPayload,
  cardImageBase64?: string,
  options?: {
    connectionMode?: "online" | "offline";
    skipWhatsApp?: boolean;
    skipEmail?: boolean;
  },
): Promise<{
  id: string;
  queued?: boolean;
  zohoLeadId?: string;
  zohoSynced?: boolean;
  alreadySynced?: boolean;
  zohoError?: string;
  emailSent?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
}> {
  await resolveStorageMode();
  const mode = options?.connectionMode ?? saveConnectionMode();

  if (isOfflineSave({ ...options, connectionMode: mode })) {
    return saveOfflineToIndexedDbQueue(payload, cardImageBase64);
  }

  return saveOnlineDirectToZoho(payload, cardImageBase64, options);
}

export async function updateContact(contactId: string, payload: LeadPayload): Promise<void> {
  const existing = await getStoredContactById(contactId);
  if (existing) {
    const email = pickPrimaryEmail(payload);
    await updateStoredContact(contactId, {
      ...(payload as Record<string, unknown>),
      email,
      emailAddress: email,
    });
  }
}

export async function deleteContact(contactId: string): Promise<void> {
  await deleteStoredContact(contactId);
}

export async function markContactSyncedZoho(
  contactId: string,
  zohoLeadId: string,
): Promise<void> {
  await patchStoredContactSyncStatus(contactId, "synced_zoho", zohoLeadId);
}

export async function syncContactToZohoStorage(
  contactId: string,
  options?: { skipWhatsApp?: boolean; skipEmail?: boolean },
  payloadOverride?: LeadPayload,
): Promise<{
  zohoLeadId?: string;
  alreadySynced?: boolean;
  emailSent?: boolean;
  emailError?: string | null;
  emailTo?: string | null;
  emailExtracted?: string | null;
}> {
  let payload = payloadOverride;
  let alreadyInZoho = false;
  const contact = await getStoredContactById(contactId);
  if (contact) {
    payload = payload ?? localContactToPayload(contact as LocalContact);
    alreadyInZoho = Boolean(
      contact.zohoLeadId || contact.syncStatus === "synced_zoho",
    );
  }

  if (!payload) {
    throw new Error("Contact not found for Zoho sync");
  }

  const email = pickPrimaryEmail(payload);
  const zohoLeadId =
    (payload as LeadPayload & { zohoLeadId?: string | null }).zohoLeadId ??
    (contact?.zohoLeadId ? String(contact.zohoLeadId) : undefined);

  const result = await syncPayloadToZoho(
    {
      ...payload,
      email,
      ...(zohoLeadId ? { zohoLeadId } : {}),
    },
    { connectionMode: "online", ...options },
  );

  if (payload.eventName?.trim()) {
    recordContactEventLink({
      eventName: payload.eventName.trim(),
      zohoLeadId: result.zohoLeadId,
      email,
      phone: payload.phone,
    });
  }

  if (contact && result.zohoLeadId) {
    await markContactSyncedZoho(contactId, result.zohoLeadId);
  }

  await persistOutreachStatus(payload, result);
  notifyContactsListChanged();
  return {
    ...result,
    zohoLeadId: result.zohoLeadId || contactId,
    alreadySynced: alreadyInZoho || result.alreadySynced,
    emailExtracted: result.emailExtracted || email || null,
  };
}

export async function syncAllPendingToZohoStorage(options?: {
  skipWhatsApp?: boolean;
  skipEmail?: boolean;
}): Promise<{ synced: number; total: number }> {
  const contacts = await listStoredContacts();
  const pending = contacts.filter(
    (c) => c.syncStatus !== "synced_zoho" && !c.zohoLeadId,
  );
  let synced = 0;
  for (const contact of pending) {
    const id = String(contact.id || "");
    if (!id) continue;
    try {
      const result = await syncContactToZohoStorage(id, options);
      if (result.zohoLeadId || result.alreadySynced) {
        synced += 1;
      }
    } catch {
      /* continue */
    }
  }
  return { synced, total: pending.length };
}

export type AutoZohoSyncResult = {
  queueSynced: number;
  queueTotal: number;
  contactsSynced: number;
  contactsTotal: number;
};

let autoZohoSyncInFlight: Promise<AutoZohoSyncResult> | null = null;

export async function runAutoZohoSyncWhenOnline(options?: {
  skipWhatsApp?: boolean;
  skipEmail?: boolean;
}): Promise<AutoZohoSyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { queueSynced: 0, queueTotal: 0, contactsSynced: 0, contactsTotal: 0 };
  }

  if (autoZohoSyncInFlight) {
    return autoZohoSyncInFlight;
  }

  autoZohoSyncInFlight = (async () => {
    const queue = await syncAllQueueItemsToZoho(options);
    const contacts = await syncAllPendingToZohoStorage(options);
    return {
      queueSynced: queue.synced,
      queueTotal: queue.total,
      contactsSynced: contacts.synced,
      contactsTotal: contacts.total,
    };
  })().finally(() => {
    autoZohoSyncInFlight = null;
  });

  return autoZohoSyncInFlight;
}

export function isContactPendingZoho(contact: StoredContact): boolean {
  return contact.syncStatus !== "synced_zoho" && !contact.zohoLeadId;
}

export function shouldUseIndexedDbQueueSync(): boolean {
  return true;
}

export function buildQueueItemFromPayload(
  payload: LeadPayload,
  imageBase64?: string,
  errorMessage?: string,
  appUser?: AppUserIdentity | null,
): QueueItem {
  const email = pickPrimaryEmail(payload);
  const stamped = stampCapturedByFields(
    { ...(payload as Record<string, unknown>), email, emailAddress: email },
    appUser ?? null,
  );
  const queueId = crypto.randomUUID();
  return {
    id: queueId,
    contact_data: {
      ...stamped,
      captureSource: "offline_queue",
    },
    image_base64: imageBase64,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
    last_attempt: new Date().toISOString(),
    error_message: errorMessage,
    capturedByEmail: String(stamped.capturedByEmail || ""),
    capturedByUserId: String(stamped.capturedByUserId || ""),
    capturedByPhone: String(stamped.capturedByPhone || ""),
  };
}
