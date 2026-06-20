import { authClient } from "@/auth";
import { isAuthEnabled } from "@/lib/authConfig";

let cachedToken: string | null = null;
let cachedExpiresAt = 0;

/** Session bearer token used for Render API calls (auto-refreshed by Neon Auth). */
export async function getAuthBearerToken(forceRefresh = false): Promise<string | null> {
  if (!isAuthEnabled) return null;

  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedExpiresAt > now + 60_000) {
    return cachedToken;
  }

  try {
    // Neon recommends authClient.token() for external API Authorization headers.
    const tokenResult = await authClient.token(
      forceRefresh
        ? { fetchOptions: { headers: { "X-Force-Fetch": "true" } } }
        : undefined,
    );
    const jwt = tokenResult.data?.token;
    if (jwt) {
      cachedToken = jwt;
      cachedExpiresAt = now + 14 * 60_000;
      return jwt;
    }

    const sessionResult = await authClient.getSession({
      query: { disableRefresh: false },
    });
    const sessionToken = sessionResult.data?.session?.token;
    const expiresAt = sessionResult.data?.session?.expiresAt;

    if (sessionToken) {
      cachedToken = sessionToken;
      cachedExpiresAt = expiresAt ? new Date(expiresAt).getTime() : now + 3_600_000;
      return sessionToken;
    }
  } catch {
    /* session unavailable */
  }

  cachedToken = null;
  cachedExpiresAt = 0;
  return null;
}

export function clearAuthTokenCache(): void {
  cachedToken = null;
  cachedExpiresAt = 0;
}
