import { API_BASE_URL } from "@/lib/api";
import { getConnectionMode, type ConnectionMode } from "@/lib/connectionMode";
import { PRODUCTION_API_URL } from "@/lib/productionApi";
import { storageLabel } from "@/lib/storageConfig";

export function getScanApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return PRODUCTION_API_URL;
}

/** True when OCR runs on this PC (works without internet). */
export function isLocalScanBackend(): boolean {
  try {
    const { hostname } = new URL(getScanApiBaseUrl());
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * OCR runs in the browser (Tesseract.js). Backend receives extracted fields on save/sync.
 */
export function canRunScanOcr(): boolean {
  return typeof window !== "undefined";
}

export function getScanBackendLabel(): string {
  return `CardSync API — ${API_BASE_URL || "Python (port 5000)"}`;
}

export function getLocalContactsUrl(): string {
  return `${API_BASE_URL}/api/contacts`;
}

export function getContactsListUrl(
  mode: ConnectionMode = getConnectionMode(),
): string {
  return mode === "offline" ? getLocalContactsUrl() : getZohoLeadsUrl();
}

export function getBackendLabel(
  mode: ConnectionMode = getConnectionMode(),
): string {
  return mode === "offline" ? storageLabel() : "Zoho CRM";
}

export function getZohoLeadsUrl(): string {
  return `${API_BASE_URL}/api/leads`;
}

export function getDeleteContactUrl(
  contactId: string,
  source: "localdb" | "zoho",
): string {
  return source === "localdb"
    ? `${API_BASE_URL}/api/contacts/${contactId}`
    : `${API_BASE_URL}/api/leads/${contactId}`;
}

export function getSyncContactToZohoUrl(contactId: string): string {
  return `${API_BASE_URL}/contacts/${contactId}/sync-to-zoho`;
}

export function getSyncPendingToZohoUrl(): string {
  return `${API_BASE_URL}/contacts/sync-pending-to-zoho`;
}
