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
    const result = await authClient.getSession({
      query: { disableRefresh: false },
    });

    const token = result.data?.session?.token;
    const expiresAt = result.data?.session?.expiresAt;

    if (token) {
      cachedToken = token;
      cachedExpiresAt = expiresAt ? new Date(expiresAt).getTime() : now + 3_600_000;
      return token;
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
