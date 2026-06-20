import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

import { isAuthEnabled, neonAuthConfigIssue, neonAuthUrl } from "@/lib/authConfig";

export { isAuthEnabled } from "@/lib/authConfig";

if (import.meta.env.DEV) {
  if (neonAuthConfigIssue) {
    console.warn("[CardSync Auth]", neonAuthConfigIssue);
  } else if (neonAuthUrl) {
    console.info("[CardSync Auth] Using", neonAuthUrl);
  }
}

export const authClient = createAuthClient(
  neonAuthUrl || "http://localhost:0/auth-disabled",
  { adapter: BetterAuthReactAdapter() },
);
