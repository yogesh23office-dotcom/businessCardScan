import type { LeadPayload } from "@/lib/cardImage";
import { listStoredContacts } from "@/lib/indexeddb";

export type StoredContact = {
  id: string;
  name?: string;
  fullName?: string;
  company?: string;
  phone?: string;
  email?: string;
  designation?: string;
  website?: string;
  address?: string;
  [key: string]: unknown;
};

export type DuplicateMatch = {
  contact: StoredContact;
  matchedBy: ("email" | "phone" | "name_company")[];
};

export type DuplicateCheckResult = {
  duplicates: DuplicateMatch[];
};

function normalizePhone(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

function findDuplicatesLocally(
  contacts: StoredContact[],
  payload: LeadPayload,
): DuplicateMatch[] {
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = normalizePhone(payload.phone || "");
  const name = String(payload.fullName || "").trim().toLowerCase();
  const company = String(payload.company || "").trim().toLowerCase();

  const duplicates: DuplicateMatch[] = [];
  const seen = new Set<string>();

  for (const contact of contacts) {
    const id = String(contact.id || "");
    if (!id || seen.has(id)) continue;

    const matchedBy: DuplicateMatch["matchedBy"] = [];
    const cEmail = String(contact.email || "").trim().toLowerCase();
    const cPhone = normalizePhone(String(contact.phone || ""));
    const cName = String(contact.fullName || contact.name || "").trim().toLowerCase();
    const cCompany = String(contact.company || "").trim().toLowerCase();

    if (email && cEmail && email === cEmail) matchedBy.push("email");
    if (phone && cPhone && phone === cPhone) matchedBy.push("phone");
    if (name && company && cName === name && cCompany === company) matchedBy.push("name_company");

    if (matchedBy.length > 0) {
      seen.add(id);
      duplicates.push({ contact, matchedBy });
    }
  }

  return duplicates;
}

export async function checkForDuplicates(payload: LeadPayload): Promise<DuplicateCheckResult> {
  const contacts = await listStoredContacts();
  return { duplicates: findDuplicatesLocally(contacts as StoredContact[], payload) };
}

export function diffContacts(
  existing: StoredContact,
  incoming: LeadPayload,
): { field: string; existing: string; incoming: string }[] {
  const fields: { key: keyof LeadPayload; label: string; existingKey?: keyof StoredContact }[] = [
    { key: "fullName", label: "Name", existingKey: "fullName" },
    { key: "designation", label: "Designation" },
    { key: "company", label: "Company" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "website", label: "Website" },
    { key: "address", label: "Address" },
  ];

  return fields
    .map(({ key, label, existingKey }) => {
      const ex = String(existing[existingKey || key] || existing.name || "").trim();
      const inc = String(incoming[key] || "").trim();
      if (!ex && !inc) return null;
      if (ex === inc) return null;
      return { field: label, existing: ex || "—", incoming: inc || "—" };
    })
    .filter(Boolean) as { field: string; existing: string; incoming: string }[];
}
