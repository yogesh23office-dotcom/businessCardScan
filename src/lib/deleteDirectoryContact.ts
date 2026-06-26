import { deleteZohoLead } from "@/lib/contactApi";
import type { DirectoryContact } from "@/lib/contactsDirectory";
import {
  invalidateContactsDirectory,
  optimisticallyRemoveDirectoryContact,
} from "@/lib/contactsDirectory";
import { contactBelongsToAppUser, getCurrentAppUser } from "@/lib/currentAppUser";
import {
  deleteStoredContact,
  getQueueItems,
  getStoredContactById,
  removeQueueItem,
} from "@/lib/indexeddb";
import { removeOutreachStatusForContact } from "@/lib/outreachStatusStorage";

function notifyContactsListChanged(
  removed?: Pick<DirectoryContact, "id" | "source">,
): void {
  if (removed) {
    optimisticallyRemoveDirectoryContact(removed);
  } else {
    invalidateContactsDirectory();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-contacts-updated"));
    window.dispatchEvent(new CustomEvent("cs-queue-updated"));
  }
}

async function assertContactOwnedByCurrentUser(
  contact: DirectoryContact,
): Promise<void> {
  const appUser = await getCurrentAppUser();
  if (contact.source === "queue") {
    const items = await getQueueItems();
    const item = items.find((entry) => entry.id === contact.id);
    if (item && !contactBelongsToAppUser(item, appUser)) {
      throw new Error("You do not have permission to delete this contact.");
    }
    return;
  }

  if (contact.source === "indexeddb" || contact.source === "localdb") {
    const stored = await getStoredContactById(contact.id);
    if (stored && !contactBelongsToAppUser(stored, appUser)) {
      throw new Error("You do not have permission to delete this contact.");
    }
  }
}

/** Delete by Contacts table row (soft-delete in Zoho; user-scoped local cache). */
export async function deleteDirectoryContact(contact: DirectoryContact): Promise<void> {
  await assertContactOwnedByCurrentUser(contact);
  const appUser = await getCurrentAppUser();

  if (contact.source === "queue") {
    await removeQueueItem(contact.id);
    removeOutreachStatusForContact(contact, appUser);
    notifyContactsListChanged(contact);
    return;
  }

  if (contact.source === "zoho") {
    await deleteZohoLead(contact.id);
    removeOutreachStatusForContact(contact, appUser);
    notifyContactsListChanged(contact);
    return;
  }

  if (contact.source === "indexeddb" || contact.source === "localdb") {
    const stored = await getStoredContactById(contact.id);
    const zohoLeadId = String(contact.zohoLeadId || stored?.zohoLeadId || "").trim();
    await deleteStoredContact(contact.id);
    if (zohoLeadId) {
      try {
        await deleteZohoLead(zohoLeadId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Zoho soft-delete failed";
        throw new Error(
          `Removed on this device, but Zoho update failed: ${message}`,
        );
      }
    }
    removeOutreachStatusForContact(contact, appUser);
    notifyContactsListChanged(contact);
    return;
  }

  throw new Error("Unknown contact source — cannot delete.");
}
