import { getConnectionMode } from "@/lib/connectionMode";
import { apiFetch } from "@/lib/apiFetch";
import { buildZohoLeadLookup, isDuplicateOfZohoLead } from "@/lib/contactListMerge";
import { getZohoLeadsUrl } from "@/lib/backendTargets";
import { listContacts, storageLabel } from "@/lib/contactStorage";
import { resolveEventNameForContact } from "@/lib/eventStorage";
import { getQueueItems } from "@/lib/indexeddb";
import type { ContactStatus } from "@/lib/contactStatus";

export type DirectoryContact = {
  id: string;
  name: string;
  initials: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  eventName?: string;
  notes?: string;
  status: ContactStatus;
  source: "zoho" | "queue" | "localdb" | "indexeddb";
  zohoLeadId?: string | null;
  channels: { whatsapp: boolean; email: boolean };
  lastSync: string;
  accent: string;
};

const ACCENTS = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-fuchsia-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];

function isAppOnline(): boolean {
  return (
    getConnectionMode() === "online" &&
    typeof navigator !== "undefined" &&
    navigator.onLine
  );
}

export function contactRowKey(contact: Pick<DirectoryContact, "source" | "id">): string {
  return `${contact.source}-${contact.id}`;
}

export function contactSearchText(contact: DirectoryContact): string {
  return `${contact.name} ${contact.company} ${contact.email} ${contact.phone} ${contact.title} ${contact.eventName || ""} ${contact.notes || ""}`
    .toLowerCase()
    .trim();
}

export function filterContactsByQuery(
  contacts: DirectoryContact[],
  query: string,
): DirectoryContact[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return contacts.filter((c) => contactSearchText(c).includes(q));
}

export type ContactsDirectorySnapshot = {
  contacts: DirectoryContact[];
  fetchFailed: boolean;
  fetchedAt: number;
};

/** Reuse cached directory data; Zoho is only refetched after TTL or invalidation. */
const CACHE_TTL_MS = 60_000;

let cache: ContactsDirectorySnapshot | null = null;
let inFlight: Promise<ContactsDirectorySnapshot> | null = null;
const listeners = new Set<() => void>();

export function getContactsDirectorySnapshot(): ContactsDirectorySnapshot | null {
  return cache;
}

export function subscribeContactsDirectory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateContactsDirectory(): void {
  cache = null;
  inFlight = null;
}

/** Remove one row from cache immediately (e.g. after delete) without waiting for refetch. */
export function optimisticallyRemoveDirectoryContact(
  contact: Pick<DirectoryContact, "id" | "source">,
): void {
  const key = contactRowKey(contact);
  if (!cache) return;
  const nextContacts = cache.contacts.filter((c) => contactRowKey(c) !== key);
  if (nextContacts.length === cache.contacts.length) return;
  cache = { ...cache, contacts: nextContacts };
  notifyContactsDirectorySubscribers();
}

function notifyContactsDirectorySubscribers(): void {
  listeners.forEach((listener) => listener());
}

async function fetchContactsDirectoryFromSources(): Promise<ContactsDirectorySnapshot> {
  let localDbData: Record<string, unknown>[] = [];
  let zohoData: Record<string, unknown>[] = [];
  let fetchFailed = false;
  const useBrowserStorage = true;
  const onlineView = isAppOnline();

  try {
    const allLocal = (await listContacts()) as Record<string, unknown>[];
    // Online: only show device rows still pending sync; synced rows live in Zoho.
    localDbData = onlineView
      ? allLocal.filter(
          (c) => c.syncStatus !== "synced_zoho" && !c.zohoLeadId,
        )
      : allLocal;
  } catch (localErr) {
    console.warn("Failed to list contacts:", localErr);
  }

  const zohoResult = await Promise.allSettled([
    apiFetch(getZohoLeadsUrl()).then(async (response) => {
      if (!response.ok) throw new Error(response.statusText);
      return response.json();
    }),
  ]);

  if (zohoResult[0].status === "fulfilled") {
    zohoData = Array.isArray(zohoResult[0].value) ? zohoResult[0].value : [];
  } else {
    console.error("Zoho fetch failed:", zohoResult[0].reason);
    fetchFailed = true;
  }

  const zohoLookup = buildZohoLeadLookup(zohoData);

  const formattedZoho: DirectoryContact[] = zohoData.map((c, i) => {
    const name = String(c.name || "");
    const initials = name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "";
    return {
      id: String(c.id || `zoho-${i}`),
      zohoLeadId: c.id ? String(c.id) : null,
      name,
      company: String(c.company || ""),
      title: String(c.title || c.designation || ""),
      email: String(c.email || ""),
      phone: String(c.phone || ""),
      eventName: resolveEventNameForContact({
        eventName: String(c.eventName || ""),
        zohoLeadId: c.id ? String(c.id) : null,
        email: String(c.email || ""),
        phone: String(c.phone || ""),
      }),
      notes: String(c.notes || ""),
      source: "zoho" as const,
      initials,
      accent: String(c.accent || ACCENTS[i % ACCENTS.length]),
      status: "synced" as ContactStatus,
      channels: (c.channels as DirectoryContact["channels"]) || {
        whatsapp: !!c.phone,
        email: !!c.email,
      },
      lastSync: String(c.lastSync || "Synced to Zoho"),
    };
  });

  let formattedQueue: DirectoryContact[] = [];
  if (useBrowserStorage) {
    try {
      const queueItems = await getQueueItems();
      formattedQueue = queueItems.map((item) => {
        const c = item.contact_data;
        const name = c.name || "Unnamed Contact";
        const initials = name
          ? name
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
          : "?";

        return {
          id: item.id,
          source: "queue" as const,
          name,
          initials,
          company: c.company || "No Company",
          title: c.title || c.designation || "No Title",
          email: c.email || "",
          phone: c.phone || "",
          eventName: resolveEventNameForContact({
            eventName: String(c.eventName || ""),
            email: String(c.email || ""),
            phone: String(c.phone || ""),
          }),
          notes: String(c.notes || ""),
          status: (item.status === "retrying" ? "pending" : item.status) as ContactStatus,
          channels: c.channels || {
            whatsapp: !!c.phone,
            email: !!c.email,
          },
          lastSync:
            item.status === "failed" ? "Sync failed" : "Queued · save on device",
          accent: "from-amber-500 to-orange-500",
        };
      });
    } catch (dbErr) {
      console.error("Failed to read IndexedDB queue in contacts list:", dbErr);
    }
  }

  const storageSource = useBrowserStorage ? ("indexeddb" as const) : ("localdb" as const);
  const formattedLocalDb: DirectoryContact[] = localDbData
    .filter((c) =>
      !isDuplicateOfZohoLead(
        {
          zohoLeadId: c.zohoLeadId as string | null,
          email: c.email as string,
          phone: c.phone as string,
          syncStatus: c.syncStatus as string,
          status: c.status as string,
        },
        zohoLookup,
        { hideSyncedWhenOnline: onlineView },
      ),
    )
    .map((c, i) => {
      const name = String(c.name || "");
      const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "";
      const status =
        c.syncStatus === "synced_zoho" || c.syncStatus === "synced"
          ? ("synced" as ContactStatus)
          : c.syncStatus === "failed"
            ? ("failed" as ContactStatus)
            : ("pending" as ContactStatus);
      return {
        id: String(c.id || `local-${i}`),
        name,
        company: String(c.company || ""),
        title: String(c.title || c.designation || ""),
        email: String(c.email || ""),
        phone: String(c.phone || ""),
        eventName: resolveEventNameForContact({
          eventName: String(c.eventName || ""),
          zohoLeadId: (c.zohoLeadId as string | null) || null,
          email: String(c.email || ""),
          phone: String(c.phone || ""),
        }),
        notes: String(c.notes || ""),
        source: storageSource,
        zohoLeadId: (c.zohoLeadId as string | null) || null,
        initials,
        accent: useBrowserStorage
          ? "from-violet-600 to-indigo-700"
          : "from-slate-600 to-slate-800",
        status,
        channels: (c.channels as DirectoryContact["channels"]) || {
          whatsapp: !!c.phone,
          email: !!c.email,
        },
        lastSync:
          c.syncStatus === "synced" || c.syncStatus === "synced_zoho"
            ? "Saved on device"
            : status === "pending"
              ? onlineView
                ? "Awaiting save"
                : `${storageLabel()} · pending`
              : String(c.lastSync || storageLabel({ online: onlineView })),
      };
    });

  return {
    contacts: [...formattedQueue, ...formattedLocalDb, ...formattedZoho],
    fetchFailed,
    fetchedAt: Date.now(),
  };
}

export async function loadContactsDirectory(options?: {
  force?: boolean;
}): Promise<ContactsDirectorySnapshot> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (force) {
    inFlight = null;
  }

  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const snapshot = await fetchContactsDirectoryFromSources();
      cache = snapshot;
      notifyContactsDirectorySubscribers();
      return snapshot;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
