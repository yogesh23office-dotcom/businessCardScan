/** SSR-safe auth flag — no Neon SDK import. */
export const isAuthEnabled = Boolean(import.meta.env.VITE_NEON_AUTH_URL?.trim());

export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim() ?? "";

/**
 * Neon Auth uses a dedicated `neonauth` host — NOT the Postgres `ep-*.neon.tech` host.
 * Copy the exact Auth URL from Neon Console → Auth.
 */
export function getNeonAuthUrlIssue(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "VITE_NEON_AUTH_URL is not set.";
  if (!trimmed.includes("neonauth") && trimmed.includes(".neon.tech")) {
    return (
      "VITE_NEON_AUTH_URL looks like a database host. Use the Auth URL from Neon Console → Auth " +
      "(hostname contains neonauth, ends with /neondb/auth)."
    );
  }
  if (!trimmed.endsWith("/auth")) {
    return "VITE_NEON_AUTH_URL should end with /auth (e.g. …/neondb/auth).";
  }
  return null;
}

export const neonAuthConfigIssue =
  typeof import.meta.env.VITE_NEON_AUTH_URL === "string"
    ? getNeonAuthUrlIssue(import.meta.env.VITE_NEON_AUTH_URL)
    : null;
