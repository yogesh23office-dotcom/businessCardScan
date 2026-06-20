import { API_BASE_URL } from "@/lib/api";
import { apiFetch } from "@/lib/apiFetch";
import type { LeadPayload } from "@/lib/cardImage";

export type WhatsAppChatLinkConfig = {
  success?: boolean;
  business_phone: string;
  display_phone_number?: string | null;
  verified_name: string;
  prefill_text: string;
  wa_me_url: string;
  configured: boolean;
};

export type WhatsAppChatReplyRegistration = WhatsAppChatLinkConfig & {
  registered: boolean;
  recipient_phone: string;
  normalized_phone: string;
  preview_message: string;
};

function payloadToRegisterBody(payload: LeadPayload) {
  return {
    fullName: payload.fullName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    designation: payload.designation,
    company: payload.company,
    phone: payload.phone,
    secondaryPhone: payload.secondaryPhone,
    email: payload.email,
    secondaryEmail: payload.secondaryEmail,
    website: payload.website,
    secondaryWebsite: payload.secondaryWebsite,
    address: payload.address,
    secondaryAddress: payload.secondaryAddress,
  };
}

export async function apiFetchWhatsAppChatLink(
  prefill = "Hi, verify my number",
): Promise<WhatsAppChatLinkConfig> {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/whatsapp/chat-link?prefill=${encodeURIComponent(prefill)}`,
  );
  const data = (await response.json()) as WhatsAppChatLinkConfig & { detail?: string };
  if (!response.ok) {
    throw new Error(data.detail || `WhatsApp chat link unavailable (${response.status})`);
  }
  return data;
}

export async function registerWhatsAppChatReply(
  payload: LeadPayload,
): Promise<WhatsAppChatReplyRegistration> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/whatsapp/register-chat-reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadToRegisterBody(payload)),
  });
  const data = (await response.json()) as WhatsAppChatReplyRegistration & { detail?: string };
  if (!response.ok) {
    throw new Error(data.detail || `WhatsApp registration failed (${response.status})`);
  }
  return data;
}

export type WhatsAppVerifyStatus = {
  success?: boolean;
  verified: boolean;
  normalized_phone?: string;
  verified_at?: number | null;
  error?: string;
};

export type WhatsAppVerifyStart = WhatsAppChatReplyRegistration & {
  verify_only?: boolean;
};

export async function startWhatsAppVerify(
  payload: Partial<LeadPayload> & { phone: string },
): Promise<WhatsAppVerifyStart> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/whatsapp/start-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadToRegisterBody(payload as LeadPayload)),
  });
  const data = (await response.json()) as WhatsAppVerifyStart & { detail?: string };
  if (!response.ok) {
    throw new Error(data.detail || `WhatsApp verify start failed (${response.status})`);
  }
  return data;
}

export async function apiFetchWhatsAppVerifyStatus(phone: string): Promise<WhatsAppVerifyStatus> {
  const response = await apiFetch(
    `${API_BASE_URL}/integrations/whatsapp/verify-status?phone=${encodeURIComponent(phone)}`,
  );
  const data = (await response.json()) as WhatsAppVerifyStatus & { detail?: string };
  if (!response.ok) {
    throw new Error(data.detail || `Verify status check failed (${response.status})`);
  }
  return data;
}

export function qrCodeImageUrl(waMeUrl: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(waMeUrl)}`;
}
