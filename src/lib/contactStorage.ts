import type { LeadPayload } from "@/lib/cardImage";
import { isOfflineMode } from "@/lib/connectionMode";
import {
  getContactStorageMode,
  isIndexedDbStorage,
  isServerStorage,
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

export type StoredContact = Awaited<ReturnType<typeof listStoredContacts>>[number];

export {
  getContactStorageMode,
  isIndexedDbStorage,
  isServerStorage,
  storageLabel,
  type ContactStorageMode,
};

export function queueContactToPayload(data: Record<string, unknown>): LeadPayload {
  return {
    fullName: String(data.fullName || data.name || ""),
    firstName: String(data.firstName || ""),
    lastName: String(data.lastName || ""),
    company: String(data.company || ""),
    designation: String(data.designation || data.title || ""),
    phone: String(data.phone || ""),
    secondaryPhone: String(data.secondaryPhone || ""),
    email: String(data.email || ""),
    secondaryEmail: String(data.secondaryEmail || ""),
    website: String(data.website || ""),
    address: String(data.address || ""),
  };
}

export function localContactToPayload(contact: StoredContact): LeadPayload {
  return queueContactToPayload(contact as Record<string, unknown>);
}

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
  return listStoredContacts();
}

export async function getContactById(contactId: string): Promise<StoredContact | null> {
  const contact = await getStoredContactById(contactId);
  return contact;
}

function isOfflineSave(options?: { connectionMode?: "online" | "offline" }): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (options?.connectionMode === "offline") return true;
  if (options?.connectionMode === "online") return false;
  return isOfflineMode();
}

/** Promote a queue row into saved contacts on this device. */
export async function syncQueueItemToZoho(item: QueueItem): Promise<{ zohoLeadId?: string }> {
  await saveStoredContact(
    {
      ...(item.contact_data as Record<string, unknown>),
      syncStatus: "synced",
    },
    item.image_base64,
  );
  await removeQueueItem(item.id);
  return {};
}

export async function syncAllQueueItemsToZoho(): Promise<{ synced: number; total: number }> {
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
      await syncQueueItemToZoho(item);
      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
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
}> {
  await resolveStorageMode();
  if (isOfflineSave(options)) {
    const queueId = crypto.randomUUID();
    await addToQueue(
      buildQueueItemFromPayload(
        payload,
        cardImageBase64,
        "Saved offline — will sync when back online",
      ),
    );
    return { id: queueId, queued: true };
  }

  const saved = await saveStoredContact(payload as Record<string, unknown>, cardImageBase64);
  await patchStoredContactSyncStatus(saved.id, "synced");
  return { id: saved.id, zohoSynced: true };
}

export async function updateContact(contactId: string, payload: LeadPayload): Promise<void> {
  await updateStoredContact(contactId, payload as Record<string, unknown>);
}

export async function deleteContact(_contactId: string, _deleteZoho = false): Promise<void> {
  await deleteStoredContact(_contactId);
}

export async function markContactSyncedZoho(contactId: string, _zohoLeadId?: string): Promise<void> {
  await patchStoredContactSyncStatus(contactId, "synced");
}

export async function syncContactToZohoStorage(
  contactId: string,
  _options?: { skipWhatsApp?: boolean; skipEmail?: boolean },
): Promise<{ zohoLeadId?: string; alreadySynced?: boolean }> {
  const contact = await getStoredContactById(contactId);
  if (!contact) {
    throw new Error("Contact not found on this device");
  }
  if (contact.syncStatus === "synced" || contact.syncStatus === "synced_zoho") {
    return { alreadySynced: true };
  }
  await patchStoredContactSyncStatus(contactId, "synced");
  return { alreadySynced: false };
}

export async function syncAllPendingToZohoStorage(): Promise<{ synced: number; total: number }> {
  const contacts = await listStoredContacts();
  const pending = contacts.filter(
    (c) => c.syncStatus !== "synced" && c.syncStatus !== "synced_zoho",
  );
  let synced = 0;
  for (const contact of pending) {
    const id = String(contact.id || "");
    if (!id) continue;
    try {
      const result = await syncContactToZohoStorage(id);
      if (!result.alreadySynced || result.zohoLeadId !== undefined) {
        synced += 1;
      }
    } catch {
      /* continue */
    }
  }
  return { synced, total: pending.length };
}

export function isContactPendingZoho(contact: StoredContact): boolean {
  return contact.syncStatus !== "synced" && contact.syncStatus !== "synced_zoho";
}

export function shouldUseOfflineQueue(): boolean {
  return false;
}

export function shouldUseIndexedDbQueueSync(): boolean {
  return true;
}

export async function syncQueueItemToLocalDb(item: QueueItem): Promise<void> {
  await syncQueueItemToZoho(item);
}

export function buildQueueItemFromPayload(
  payload: LeadPayload,
  imageBase64?: string,
  errorMessage?: string,
): QueueItem {
  return {
    id: crypto.randomUUID(),
    contact_data: payload as Record<string, unknown>,
    image_base64: imageBase64,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
    last_attempt: new Date().toISOString(),
    error_message: errorMessage,
  };
}

const SAMPLE_CONTACT: LeadPayload = {
  fullName: "Amelia Chen",
  company: "Northwind Labs",
  designation: "VP Product",
  email: "amelia@northwind.io",
  phone: "+1 415 555 0142",
  website: "northwind.io",
};

export async function seedOfflineSampleContact(): Promise<{ seeded?: boolean; id?: string }> {
  const contacts = await listStoredContacts();
  const hasSample = contacts.some(
    (c) => String(c.name || c.fullName || "").trim() === SAMPLE_CONTACT.fullName,
  );
  if (hasSample) {
    return { seeded: false };
  }
  const saved = await saveStoredContact(SAMPLE_CONTACT as Record<string, unknown>);
  return { seeded: true, id: saved.id };
}
