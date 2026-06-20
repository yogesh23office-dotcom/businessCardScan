export type StoredEvent = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
};

const EVENTS_STORAGE_KEY = "cs-events";
const LAST_EVENT_NAME_KEY = "cs-last-event-name";

function readEventsRaw(): StoredEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const name = String(record.name || "").trim();
        if (!name) return null;
        return {
          id: String(record.id || crypto.randomUUID()),
          name,
          createdAt: String(record.createdAt || new Date().toISOString()),
          lastUsedAt: record.lastUsedAt ? String(record.lastUsedAt) : undefined,
        } satisfies StoredEvent;
      })
      .filter((item): item is StoredEvent => item !== null);
  } catch {
    return [];
  }
}

function writeEvents(events: StoredEvent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new CustomEvent("cs-events-updated"));
}

export function loadEvents(): StoredEvent[] {
  return readEventsRaw().sort((a, b) => {
    const aTime = a.lastUsedAt || a.createdAt;
    const bTime = b.lastUsedAt || b.createdAt;
    return bTime.localeCompare(aTime);
  });
}

export function getLastUsedEventName(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(LAST_EVENT_NAME_KEY) || "").trim();
}

export function setLastUsedEventName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) {
    localStorage.removeItem(LAST_EVENT_NAME_KEY);
    return;
  }
  localStorage.setItem(LAST_EVENT_NAME_KEY, trimmed);
}

/** Register or refresh an event name and remember it as the active default. */
export function rememberEvent(eventName: string): StoredEvent {
  const name = eventName.trim();
  if (!name) {
    throw new Error("Event name is required.");
  }

  const now = new Date().toISOString();
  const events = readEventsRaw();
  const existing = events.find((event) => event.name.toLowerCase() === name.toLowerCase());

  let saved: StoredEvent;
  if (existing) {
    saved = { ...existing, name, lastUsedAt: now };
    const next = events.map((event) =>
      event.id === existing.id ? saved : event,
    );
    writeEvents(next);
  } else {
    saved = { id: crypto.randomUUID(), name, createdAt: now, lastUsedAt: now };
    writeEvents([saved, ...events]);
  }

  setLastUsedEventName(name);
  return saved;
}

export function resolveEventForSave(eventName: string): {
  eventName: string;
  eventId?: string;
} {
  const trimmed = eventName.trim();
  if (!trimmed) {
    return { eventName: "" };
  }
  const saved = rememberEvent(trimmed);
  return { eventName: saved.name, eventId: saved.id };
}

export function listEventNames(): string[] {
  return loadEvents().map((event) => event.name);
}

const EXAMPLE_EVENT_NAME = "Mall Opening";

/** Placeholder text only — not inserted into Zoho or the Events list. */
export function getExampleEventName(): string {
  return EXAMPLE_EVENT_NAME;
}

/** Remove legacy auto-seeded example folder when it has no matching leads. */
export function purgeOrphanExampleEvent(contacts: { eventName?: string }[]): void {
  const key = EXAMPLE_EVENT_NAME.toLowerCase();
  const hasLead = contacts.some(
    (c) => (c.eventName || "").trim().toLowerCase() === key,
  );
  if (hasLead) return;

  const events = readEventsRaw();
  const next = events.filter((e) => e.name.trim().toLowerCase() !== key);
  if (next.length === events.length) return;
  writeEvents(next);
  if (getLastUsedEventName().trim().toLowerCase() === key) {
    setLastUsedEventName("");
  }
}

const EVENT_LEAD_MAP_KEY = "cs-event-lead-map";

type EventLeadLink = {
  eventName: string;
  updatedAt: string;
};

type EventLeadMap = {
  byZohoId: Record<string, EventLeadLink>;
  byContactKey: Record<string, EventLeadLink>;
};

function eventContactKey(email?: string, phone?: string): string {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail) return `e:${normalizedEmail}`;
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 7) return `p:${digits}`;
  return "";
}

function readEventLeadMap(): EventLeadMap {
  if (typeof window === "undefined") {
    return { byZohoId: {}, byContactKey: {} };
  }
  try {
    const raw = localStorage.getItem(EVENT_LEAD_MAP_KEY);
    if (!raw) return { byZohoId: {}, byContactKey: {} };
    const parsed = JSON.parse(raw) as Partial<EventLeadMap>;
    return {
      byZohoId: parsed.byZohoId && typeof parsed.byZohoId === "object" ? parsed.byZohoId : {},
      byContactKey:
        parsed.byContactKey && typeof parsed.byContactKey === "object"
          ? parsed.byContactKey
          : {},
    };
  } catch {
    return { byZohoId: {}, byContactKey: {} };
  }
}

function writeEventLeadMap(map: EventLeadMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EVENT_LEAD_MAP_KEY, JSON.stringify(map));
}

/** Remember which event a lead belongs to (survives Zoho lag / empty Features column). */
export function recordContactEventLink(meta: {
  eventName: string;
  zohoLeadId?: string | null;
  email?: string;
  phone?: string;
}): void {
  const eventName = meta.eventName.trim();
  if (!eventName) return;

  const link: EventLeadLink = { eventName, updatedAt: new Date().toISOString() };
  const map = readEventLeadMap();
  const zohoId = String(meta.zohoLeadId || "").trim();
  if (zohoId) {
    map.byZohoId[zohoId] = link;
  }
  const key = eventContactKey(meta.email, meta.phone);
  if (key) {
    map.byContactKey[key] = link;
  }
  writeEventLeadMap(map);
}

export function resolveEventNameForContact(contact: {
  eventName?: string;
  zohoLeadId?: string | null;
  email?: string;
  phone?: string;
}): string {
  const direct = String(contact.eventName || "").trim();
  if (direct) return direct;

  const map = readEventLeadMap();
  const zohoId = String(contact.zohoLeadId || "").trim();
  if (zohoId && map.byZohoId[zohoId]?.eventName) {
    return map.byZohoId[zohoId].eventName;
  }
  const key = eventContactKey(contact.email, contact.phone);
  if (key && map.byContactKey[key]?.eventName) {
    return map.byContactKey[key].eventName;
  }
  return "";
}
