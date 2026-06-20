import { neonAuthUrl } from "@/lib/authConfig";

export type AuthHealthStatus =
  | { ok: true }
  | { ok: false; reason: "missing_url" | "not_enabled" | "unreachable"; detail: string };

/** Probe Neon Auth — /reference should load when Auth is enabled on the branch. */
export async function checkNeonAuthHealth(): Promise<AuthHealthStatus> {
  const base = neonAuthUrl.replace(/\/$/, "");
  if (!base) {
    return { ok: false, reason: "missing_url", detail: "VITE_NEON_AUTH_URL is not set." };
  }

  try {
    const response = await fetch(`${base}/reference`, { method: "GET" });
    if (response.ok) return { ok: true };
    if (response.status === 404) {
      return {
        ok: false,
        reason: "not_enabled",
        detail:
          "Neon Auth returned 404. In Neon Console open your project → Auth → Enable Neon Auth, " +
          "then copy the Auth URL exactly into VITE_NEON_AUTH_URL and restart npm run dev.",
      };
    }
    return {
      ok: false,
      reason: "unreachable",
      detail: `Neon Auth check failed (${response.status}). Verify the Auth URL in Neon Console → Auth.`,
    };
  } catch {
    return {
      ok: false,
      reason: "unreachable",
      detail: "Cannot reach Neon Auth. Check VITE_NEON_AUTH_URL and your network connection.",
    };
  }
}
