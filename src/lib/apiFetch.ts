import { getAuthBearerToken } from "@/lib/authSession";

/**
 * Authenticated fetch for the Python backend.
 * Attaches the Neon Auth session token and retries once after refresh on 401.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = await getAuthBearerToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(input, { ...init, headers });

  if (response.status === 401 && token) {
    const refreshed = await getAuthBearerToken(true);
    if (refreshed && refreshed !== token) {
      headers.set("Authorization", `Bearer ${refreshed}`);
      response = await fetch(input, { ...init, headers });
    }
  }

  return response;
}
