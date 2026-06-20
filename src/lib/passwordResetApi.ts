import { API_BASE_URL } from "@/lib/api";

function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(", ");
    }
  } catch {
    /* ignore */
  }
  return `Request failed (${response.status})`;
}

export async function sendPasswordResetOtp(email: string): Promise<{ message: string }> {
  const response = await fetch(apiUrl("/api/auth/password-reset/send-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function confirmPasswordReset(input: {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  const response = await fetch(apiUrl("/api/auth/password-reset/confirm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(),
      otp: input.otp.trim(),
      password: input.password,
      confirmPassword: input.confirmPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}
